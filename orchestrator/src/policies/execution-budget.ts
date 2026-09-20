/**
 * ExecutionBudget — single resource/recovery budget derived from ExecutionPolicy.
 * Absent fields ⇒ not configured (not "infinite"); callers apply POLICY_DEFAULTS
 * only where the engine requires a hard ceiling.
 */

import type { ExecutionPolicy, ProviderStrategy } from "../types/index.js";
import { POLICY_DEFAULTS } from "./defaults.js";
import { parseTimeoutMs } from "./timeout.js";

export interface ExecutionBudget {
  max_iterations: number;
  max_replans: number;
  max_parallel: number;
  max_provider_fallbacks: number;
  /** When true: first failure → terminal (no retry / fallback / replan). */
  fail_fast: boolean;
  /**
   * Fallback strategy after retries exhausted.
   * undefined / missing provider_strategy_fallback ⇒ fallback disabled.
   */
  provider_fallback_strategy?: ProviderStrategy;
  feature_timeout_ms?: number;
  step_timeout_ms?: number;
  wait_timeout_ms?: number;
  /** From cost_budget.max_nodes — node completions / attempts bound. */
  max_nodes?: number;
  /** Optional observed-token ceiling (unknown usage does not invent cost). */
  token_budget?: number;
  /** Explicit: whether replan resets per-node retry_count (default true in builtins). */
  reset_retries_on_replan: boolean;
  policy_id: string;
  policy_version: string;
}

export interface ResourceAccounting {
  iterations: number;
  replans: number;
  total_retries: number;
  provider_attempts: number;
  fallback_switches: number;
  nodes_completed: number;
  tokens_used: number;
  /** tokens reported as unknown (provider omitted usage) */
  tokens_unknown_events: number;
  started_at_ms: number;
  /** provider ids tried per node_id */
  providers_tried: Map<string, string[]>;
  /** fallback count per node_id */
  fallback_count: Map<string, number>;
}

export function createAccounting(now = Date.now()): ResourceAccounting {
  return {
    iterations: 0,
    replans: 0,
    total_retries: 0,
    provider_attempts: 0,
    fallback_switches: 0,
    nodes_completed: 0,
    tokens_used: 0,
    tokens_unknown_events: 0,
    started_at_ms: now,
    providers_tried: new Map(),
    fallback_count: new Map(),
  };
}

export function resolveExecutionBudget(
  policy: ExecutionPolicy,
  opts?: { maxReplansOverride?: number; maxIterationsOverride?: number },
): ExecutionBudget {
  const spec = policy.spec;
  const fallback =
    spec.provider_strategy_fallback === undefined
      ? undefined
      : spec.provider_strategy_fallback;

  return {
    max_iterations:
      opts?.maxIterationsOverride ??
      spec.max_iterations ??
      POLICY_DEFAULTS.MAX_ITERATIONS,
    max_replans:
      opts?.maxReplansOverride ?? spec.max_replans ?? POLICY_DEFAULTS.MAX_REPLANS,
    max_parallel: spec.parallelism.max_parallel,
    max_provider_fallbacks:
      spec.max_provider_fallbacks ?? POLICY_DEFAULTS.MAX_PROVIDER_FALLBACKS,
    fail_fast: !!spec.fail_fast,
    provider_fallback_strategy: fallback,
    feature_timeout_ms: parseTimeoutMs(spec.timeouts?.feature_timeout),
    step_timeout_ms: parseTimeoutMs(spec.timeouts?.step_timeout),
    wait_timeout_ms: parseTimeoutMs(spec.timeouts?.wait_timeout),
    max_nodes: spec.cost_budget?.max_nodes,
    token_budget: spec.token_budget,
    reset_retries_on_replan: spec.reset_retries_on_replan ?? true,
    policy_id: policy.metadata.id,
    policy_version: policy.metadata.version,
  };
}

export function remainingFeatureMs(budget: ExecutionBudget, accounting: ResourceAccounting, now = Date.now()): number | undefined {
  if (budget.feature_timeout_ms == null) return undefined;
  return Math.max(0, budget.feature_timeout_ms - (now - accounting.started_at_ms));
}

export function featureTimedOut(budget: ExecutionBudget, accounting: ResourceAccounting, now = Date.now()): boolean {
  const rem = remainingFeatureMs(budget, accounting, now);
  return rem !== undefined && rem <= 0;
}

export type BudgetExhaustionCode =
  | "BUDGET_EXCEEDED"
  | "RETRY_BUDGET_EXCEEDED"
  | "REPLAN_BUDGET_EXCEEDED"
  | "TIMEOUT"
  | "COST_BUDGET_EXCEEDED"
  | "TOKEN_BUDGET_EXCEEDED"
  | "FAIL_FAST"
  | "PROVIDER_FALLBACK_EXHAUSTED"
  | "MAX_ITERATIONS";

export function recordProviderTried(accounting: ResourceAccounting, nodeId: string, providerId: string): void {
  const list = accounting.providers_tried.get(nodeId) ?? [];
  if (!list.includes(providerId)) {
    list.push(providerId);
    accounting.providers_tried.set(nodeId, list);
  }
  accounting.provider_attempts += 1;
}
