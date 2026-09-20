import type { ExecuteRequest, ExecuteResult, ProviderRuntime } from "../types/index.js";
import { buildSuccessEvidence } from "../evidence/validator.js";
import { newRunId } from "../ir/validator.js";

export type MockBehavior =
  | { type: "success"; tokens?: number; delay_ms?: number }
  | { type: "fail"; attemptsBeforeSuccess?: number; error?: string; tokens?: number; delay_ms?: number }
  | { type: "gate_reject"; findings?: ExecuteResult["evidence"] extends infer E ? E : never; delay_ms?: number };

export class MockProvider implements ProviderRuntime {
  readonly id: string;
  private behaviors: Map<string, MockBehavior> = new Map();
  private attemptCounts = new Map<string, number>();
  private defaultBehavior: MockBehavior = { type: "success" };
  private executeCount = 0;

  constructor(id: string) {
    this.id = id;
  }

  setBehavior(nodeId: string, behavior: MockBehavior): void {
    this.behaviors.set(nodeId, behavior);
  }

  setDefaultBehavior(behavior: MockBehavior): void {
    this.defaultBehavior = behavior;
  }

  /** A03 adversarial — how many times execute() was entered. */
  getExecuteCount(): number {
    return this.executeCount;
  }

  supports(): boolean {
    return true;
  }

  async cancel(): Promise<void> {
    /* noop */
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    this.executeCount += 1;
    const start = Date.now();
    const behavior = this.behaviors.get(request.node_id) ?? this.defaultBehavior;
    const attempts = (this.attemptCounts.get(request.node_id) ?? 0) + 1;
    this.attemptCounts.set(request.node_id, attempts);

    const delayMs = "delay_ms" in behavior ? behavior.delay_ms : undefined;
    if (delayMs && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Soft step-timeout observation: if request.policy.timeout_ms elapsed during delay
    if (request.policy.timeout_ms != null && Date.now() - start >= request.policy.timeout_ms) {
      return {
        run_id: request.run_id,
        success: false,
        error: { code: "TIMEOUT", message: "Step timeout exceeded" },
        duration_ms: Date.now() - start,
        provider_id: this.id,
        execution_meta: { retry_count: attempts - 1, timeout_hit: true, cancelled: false },
      };
    }

    if (behavior.type === "fail") {
      const threshold = behavior.attemptsBeforeSuccess ?? Infinity;
      if (attempts < threshold) {
        return {
          run_id: request.run_id,
          success: false,
          error: { code: "MOCK_FAILURE", message: behavior.error ?? "Simulated failure" },
          duration_ms: Date.now() - start,
          provider_id: this.id,
          usage: behavior.tokens != null ? { tokens: behavior.tokens } : { cost_unknown: true },
        };
      }
    }

    if (behavior.type === "gate_reject") {
      return {
        run_id: request.run_id,
        success: true,
        evidence: {
          metadata: {
            node_id: request.node_id,
            run_id: request.run_id,
            provider_id: this.id,
            capability: request.capability,
            submitted_at: new Date().toISOString(),
          },
          spec: {
            status: "complete",
            verdict: "rejected",
            checks: request.definition_of_done.map((d) => ({ dod_id: d.id, result: "fail" as const })),
            findings: [{ id: "MOCK-001", severity: "major", description: "Gate rejected" }],
          },
        },
        duration_ms: Date.now() - start,
        provider_id: this.id,
      };
    }

    const evidence = buildSuccessEvidence(request.node, request.run_id, this.id, Date.now() - start);
    const tokens = behavior.type === "success" ? behavior.tokens : undefined;

    return {
      run_id: request.run_id,
      success: true,
      evidence,
      duration_ms: Date.now() - start,
      provider_id: this.id,
      usage: tokens != null ? { tokens } : { cost_unknown: true },
      contextual_learnings: [
        {
          timestamp: new Date().toISOString(),
          source: this.id,
          type: "execution",
          content: `Completed ${request.node_id}`,
        },
      ],
    };
  }
}

export class ProviderRouter {
  private providers = new Map<string, ProviderRuntime>();

  register(provider: ProviderRuntime): void {
    this.providers.set(provider.id, provider);
  }

  get(providerId: string): ProviderRuntime {
    const p = this.providers.get(providerId);
    if (!p) throw new Error(`Provider not found: ${providerId}`);
    return p;
  }
}

export function createMockProvider(id: string): MockProvider {
  return new MockProvider(id);
}

export { newRunId };
