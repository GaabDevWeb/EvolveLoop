/** Smart mock executor — contracts/execution.md prototype */

import type {
  ExecuteRequest,
  ExecuteResult,
  ExecutorCapabilities,
  ProviderRuntime,
} from "../types/index.js";
import {
  buildExecutionEvidence,
  buildGateEvidence,
  buildWorkerEvidence,
} from "../evidence/builders.js";

export interface SmartMockOptions {
  delayMs?: number;
  timeoutMs?: number;
  failOn?: string[];
  asyncMode?: boolean;
}

export class SmartMockExecutor implements ProviderRuntime {
  readonly id: string;
  private cancelled = new Set<string>();
  private heartbeats = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    id: string,
    private options: SmartMockOptions = {},
  ) {
    this.id = id;
  }

  capabilities(): ExecutorCapabilities {
    return {
      isolation: true,
      sandbox: false,
      streaming: false,
      local_retry: true,
      heartbeat: true,
      async_resume: this.options.asyncMode ?? false,
    };
  }

  supports(): boolean {
    return true;
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    const start = Date.now();
    const timeoutMs = request.policy.timeout_ms ?? this.options.timeoutMs;

    if (this.options.asyncMode) {
      await this.delay(10);
      return {
        run_id: request.run_id,
        success: false,
        provider_id: this.id,
        executor_id: this.id,
        duration_ms: 10,
        error: { code: "JOB_PENDING", message: "Async execution pending pickup" },
        evidence: buildExecutionEvidence(request.node_id, request.run_id, this.id, request.capability, {
          type: "execution",
          executor_id: this.id,
          executor_type: "mock",
          duration_ms: 10,
          retry_count: 0,
          timeout_hit: false,
          cancelled: false,
          logs: [],
        }),
      };
    }

    const run = async (): Promise<ExecuteResult> => {
      if (this.cancelled.has(request.run_id)) {
        return this.cancelledResult(request, start);
      }

      if (this.options.delayMs) {
        const step = 20;
        for (let elapsed = 0; elapsed < this.options.delayMs; elapsed += step) {
          if (this.cancelled.has(request.run_id)) return this.cancelledResult(request, start);
          await this.delay(step);
        }
      }

      if (timeoutMs && Date.now() - start > timeoutMs) {
        return this.timeoutResult(request, start);
      }

      if (this.options.failOn?.includes(request.node_id)) {
        return {
          run_id: request.run_id,
          success: false,
          provider_id: this.id,
          executor_id: this.id,
          duration_ms: Date.now() - start,
          error: { code: "MOCK_FAILURE", message: `Configured failure for ${request.node_id}` },
        };
      }

      const durationMs = Date.now() - start;
      const workerEvidence =
        request.node.type === "gate"
          ? buildGateEvidence(request.node, request.run_id, this.id, "passed", 0.95)
          : buildWorkerEvidence(request.node, request.run_id, this.id, durationMs, {
              checkResults: request.node.definition_of_done.map((d) => ({
                dod_id: d.id,
                result: "pass" as const,
                details: `mock_observed:${d.check}`,
              })),
              status: "complete",
            });

      const execEvidence = buildExecutionEvidence(
        request.node_id,
        request.run_id,
        this.id,
        request.capability,
        {
          type: "execution",
          executor_id: this.id,
          executor_type: "mock",
          duration_ms: durationMs,
          retry_count: 0,
          timeout_hit: false,
          cancelled: false,
          logs: [],
        },
      );

      return {
        run_id: request.run_id,
        success: true,
        provider_id: this.id,
        executor_id: this.id,
        duration_ms: durationMs,
        evidence: workerEvidence,
        execution_meta: { retry_count: 0, timeout_hit: false, cancelled: false },
      };
    };

    if (timeoutMs) {
      return Promise.race([
        run(),
        new Promise<ExecuteResult>((resolve) =>
          setTimeout(() => resolve(this.timeoutResult(request, start)), timeoutMs),
        ),
      ]);
    }

    return run();
  }

  async cancel(runId: string): Promise<void> {
    this.cancelled.add(runId);
    const hb = this.heartbeats.get(runId);
    if (hb) clearInterval(hb);
    this.heartbeats.delete(runId);
  }

  startHeartbeat(runId: string, intervalMs = 5000): void {
    const timer = setInterval(() => {
      if (this.cancelled.has(runId)) clearInterval(timer);
    }, intervalMs);
    this.heartbeats.set(runId, timer);
  }

  private cancelledResult(request: ExecuteRequest, start: number): ExecuteResult {
    return {
      run_id: request.run_id,
      success: false,
      provider_id: this.id,
      executor_id: this.id,
      duration_ms: Date.now() - start,
      error: { code: "CANCELLED", message: "Run cancelled" },
      execution_meta: { retry_count: 0, timeout_hit: false, cancelled: true },
    };
  }

  private timeoutResult(request: ExecuteRequest, start: number): ExecuteResult {
    return {
      run_id: request.run_id,
      success: false,
      provider_id: this.id,
      executor_id: this.id,
      duration_ms: Date.now() - start,
      error: { code: "TIMEOUT", message: "Executor timeout" },
      execution_meta: { retry_count: 0, timeout_hit: true, cancelled: false },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

export function createSmartMockProvider(id: string, options?: SmartMockOptions): ProviderRuntime {
  return new SmartMockExecutor(id, options);
}
