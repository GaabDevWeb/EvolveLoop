import type { ExecutionPolicy, ExecutionPolicySpec, GraphNode } from "../types/index.js";
import { loadPoliciesFromDir } from "../registry/manifest-loader.js";
import { POLICY_DEFAULTS } from "./defaults.js";
import {
  resolveExecutionBudget,
  type ExecutionBudget,
} from "./execution-budget.js";

export { POLICY_DEFAULTS } from "./defaults.js";
export { parseTimeoutMs } from "./timeout.js";
export {
  resolveExecutionBudget,
  createAccounting,
  remainingFeatureMs,
  featureTimedOut,
  recordProviderTried,
  type ExecutionBudget,
  type ResourceAccounting,
  type BudgetExhaustionCode,
} from "./execution-budget.js";

const BUILTIN_POLICIES: Record<string, ExecutionPolicy> = {
  "high-reliability": {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "ExecutionPolicy",
    metadata: { id: "high-reliability", version: "1.0.0", description: "Production" },
    spec: {
      retries: { default: 3, by_capability: { testing: 2 }, by_type: { gate: 1, worker: 3 } },
      gates: {
        required: ["testing", "security-review", "po-acceptance", "documentation"],
        optional: ["frontend-visual-review"],
        skipped: [],
      },
      provider_strategy: "highest_quality",
      parallelism: { max_parallel: 3, mode: "async" },
      timeouts: { step_timeout: "30m", wait_timeout: "60m", feature_timeout: "8h" },
      on_gate_reject: "orchestrator",
      on_evidence_missing: "fail",
      fail_fast: false,
      max_iterations: POLICY_DEFAULTS.MAX_ITERATIONS,
      max_replans: POLICY_DEFAULTS.MAX_REPLANS,
      max_provider_fallbacks: POLICY_DEFAULTS.MAX_PROVIDER_FALLBACKS,
      reset_retries_on_replan: true,
      execution_order: "topological",
      knowledge: { consult_before_schedule: true, consult_before_provider_select: true },
      memory: { scope: "feature", persist_contextual: true },
      phase_gates: {
        enabled: true,
        mapping: {
          testing: 3,
          "security-review": 4,
          "po-acceptance": 5,
          documentation: 6,
        },
      },
    },
  },
  "rapid-prototype": {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "ExecutionPolicy",
    metadata: { id: "rapid-prototype", version: "1.0.0" },
    spec: {
      retries: { default: 1 },
      gates: {
        required: ["testing"],
        skipped: ["security-review", "documentation", "po-acceptance"],
      },
      provider_strategy: "fastest",
      parallelism: { max_parallel: 4, mode: "async" },
      timeouts: {},
      on_gate_reject: "auto_retry",
      on_evidence_missing: "fail",
      // Was orphan true — activating fail_fast would forbid retries/replan used by V2 tests.
      fail_fast: false,
      max_iterations: POLICY_DEFAULTS.MAX_ITERATIONS,
      max_replans: POLICY_DEFAULTS.MAX_REPLANS,
      max_provider_fallbacks: POLICY_DEFAULTS.MAX_PROVIDER_FALLBACKS,
      reset_retries_on_replan: true,
      execution_order: "topological",
      gate_depth: "fast",
      knowledge: { consult_before_schedule: false },
    },
  },
  "cost-optimized": {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "ExecutionPolicy",
    metadata: { id: "cost-optimized", version: "1.0.0", description: "Minimize cost — fast gates, cheapest providers" },
    spec: {
      retries: { default: 1, by_type: { gate: 0, worker: 2 } },
      gates: {
        required: ["testing"],
        optional: ["security-review", "frontend-visual-review", "po-acceptance", "documentation"],
        skipped: [],
      },
      provider_strategy: "cheapest",
      provider_strategy_fallback: "stable",
      parallelism: { max_parallel: 2, mode: "async" },
      timeouts: { step_timeout: "15m" },
      on_gate_reject: "orchestrator",
      on_evidence_missing: "retry",
      fail_fast: false,
      max_iterations: POLICY_DEFAULTS.MAX_ITERATIONS,
      max_replans: POLICY_DEFAULTS.MAX_REPLANS,
      max_provider_fallbacks: POLICY_DEFAULTS.MAX_PROVIDER_FALLBACKS,
      reset_retries_on_replan: true,
      execution_order: "topological",
      gate_depth: "fast",
      min_confidence: 0.6,
      cost_budget: { max_nodes: 20, max_gate_depth: "fast" },
      knowledge: { consult_before_schedule: true },
    },
  },
};

export class PolicyEngine {
  private policies: Map<string, ExecutionPolicy>;

  constructor(options?: { policiesDir?: string; customPolicies?: ExecutionPolicy[] }) {
    this.policies = new Map(Object.entries(BUILTIN_POLICIES));
    if (options?.policiesDir) {
      for (const p of loadPoliciesFromDir(options.policiesDir)) {
        this.policies.set(p.metadata.id, p);
      }
    }
    for (const p of options?.customPolicies ?? []) {
      this.policies.set(p.metadata.id, p);
    }
  }

  has(policyId: string): boolean {
    return this.policies.has(policyId);
  }

  resolve(policyId: string, overrides?: Partial<ExecutionPolicySpec>): ExecutionPolicy {
    const base = this.policies.get(policyId) ?? BUILTIN_POLICIES["high-reliability"];
    if (!overrides) return structuredClone(base);

    return {
      ...base,
      spec: {
        ...base.spec,
        ...overrides,
        retries: { ...base.spec.retries, ...overrides.retries },
        gates: { ...base.spec.gates, ...overrides.gates },
        parallelism: { ...base.spec.parallelism, ...overrides.parallelism },
        timeouts: { ...base.spec.timeouts, ...overrides.timeouts },
        cost_budget: overrides.cost_budget
          ? { ...base.spec.cost_budget, ...overrides.cost_budget }
          : base.spec.cost_budget,
      },
    };
  }

  budget(
    policy: ExecutionPolicy,
    opts?: { maxReplansOverride?: number; maxIterationsOverride?: number },
  ): ExecutionBudget {
    return resolveExecutionBudget(policy, opts);
  }

  failFast(policy: ExecutionPolicy): boolean {
    return !!policy.spec.fail_fast;
  }

  fallbackEnabled(policy: ExecutionPolicy): boolean {
    return policy.spec.provider_strategy_fallback !== undefined;
  }

  gateEnabled(policy: ExecutionPolicy, capability: string): boolean {
    const { required, optional, skipped } = policy.spec.gates;
    if (skipped?.includes(capability)) return false;
    if (required.includes(capability)) return true;
    if (optional?.includes(capability)) return true;
    return !this.isKnownGate(capability);
  }

  private isKnownGate(capability: string): boolean {
    const allGates = new Set([
      "testing",
      "security-review",
      "po-acceptance",
      "documentation",
      "frontend-visual-review",
    ]);
    return allGates.has(capability);
  }

  retriesFor(policy: ExecutionPolicy, node: GraphNode): number {
    const { retries } = policy.spec;
    return (
      retries.by_capability?.[node.capability] ??
      retries.by_type?.[node.type] ??
      retries.default
    );
  }

  maxParallel(policy: ExecutionPolicy): number {
    return policy.spec.parallelism.max_parallel;
  }

  providerStrategy(policy: ExecutionPolicy): ExecutionPolicySpec["provider_strategy"] {
    return policy.spec.provider_strategy;
  }

  minConfidence(policy: ExecutionPolicy): number {
    return policy.spec.min_confidence ?? 0;
  }

  gateDepth(policy: ExecutionPolicy): ExecutionPolicySpec["gate_depth"] {
    return policy.spec.gate_depth ?? "standard";
  }
}
