/**
 * Preflight validation — REJECTED_BEFORE_EXECUTION for invalid IR / missing providers.
 * Extends validateIR; does not replace ExecutionEngine's hard-fail subset.
 */

import type {
  CapabilityIR,
  CapabilityRegistry,
  IRLValidationError,
  ProviderRuntime,
} from "../types/index.js";
import { validateIR } from "../ir/validator.js";
import type { PolicyEngine } from "../policies/policy-engine.js";
import type { ProviderRouter } from "../providers/mock-provider.js";

export const REJECTED_BEFORE_EXECUTION = "REJECTED_BEFORE_EXECUTION" as const;

export interface PreflightOptions {
  /** Capabilities known to the system (registry keys). */
  registry?: CapabilityRegistry;
  /** When set, every IR capability must have ≥1 non-deprecated provider. */
  requireProviders?: boolean;
  /** Runtime router — each selected provider id must be registered. */
  router?: ProviderRouter;
  /** Policy engine — reject unknown policy_ref when requireKnownPolicy. */
  policyEngine?: PolicyEngine;
  requireKnownPolicy?: boolean;
  /**
   * Seam for future provider_strategy_fallback (GAP-B01) — not applied here.
   * Callers may inspect this flag when wiring fallback later.
   */
  providerFallbackHook?: "reserved_for_gap_b01";
}

export interface PreflightResult {
  ok: boolean;
  status: "READY" | typeof REJECTED_BEFORE_EXECUTION;
  errors: IRLValidationError[];
}

export function validateExecutableIR(
  ir: CapabilityIR,
  options: PreflightOptions = {},
): PreflightResult {
  const known = options.registry
    ? new Set(Object.keys(options.registry.capabilities))
    : undefined;

  const errors = validateIR(ir, known);

  if (options.requireKnownPolicy && options.policyEngine) {
    const ref = ir.metadata.policy_ref;
    if (ref && !options.policyEngine.has(ref)) {
      errors.push({
        code: "IR_UNKNOWN_POLICY",
        message: `Unknown policy_ref: ${ref}`,
      });
    }
  }

  if (options.requireProviders && options.registry) {
    for (const node of ir.spec.nodes) {
      const entry = options.registry.capabilities[node.capability];
      const active =
        entry?.providers.filter(
          (p) => p.availability !== "deprecated" && p.availability !== "experimental",
        ) ?? [];
      if (active.length === 0) {
        errors.push({
          code: "PROVIDER_UNAVAILABLE",
          message: `No active provider registered for capability: ${node.capability}`,
          node_id: node.id,
        });
        continue;
      }

      if (options.router) {
        const runnable = active.filter((p) => {
          try {
            options.router!.get(p.id);
            return true;
          } catch {
            return false;
          }
        });
        if (runnable.length === 0) {
          errors.push({
            code: "PROVIDER_UNAVAILABLE",
            message: `Providers for ${node.capability} exist in registry but none are loaded in runtime (ids: ${active.map((p) => p.id).join(", ")})`,
            node_id: node.id,
          });
        }
      }
    }
  }

  // Reserved: provider_strategy_fallback would apply after selection failure (GAP-B01).
  void options.providerFallbackHook;

  if (errors.length > 0) {
    return { ok: false, status: REJECTED_BEFORE_EXECUTION, errors };
  }
  return { ok: true, status: "READY", errors: [] };
}

export class RejectedBeforeExecutionError extends Error {
  readonly code = REJECTED_BEFORE_EXECUTION;
  readonly errors: IRLValidationError[];

  constructor(errors: IRLValidationError[]) {
    super(
      `${REJECTED_BEFORE_EXECUTION}: ${errors.map((e) => e.message).join("; ")}`,
    );
    this.name = "RejectedBeforeExecutionError";
    this.errors = errors;
  }
}

export function assertExecutableIR(
  ir: CapabilityIR,
  options: PreflightOptions = {},
): void {
  const result = validateExecutableIR(ir, options);
  if (!result.ok) {
    throw new RejectedBeforeExecutionError(result.errors);
  }
}

/** Optional helper for tests — peek provider without throw. */
export function routerHas(router: ProviderRouter, id: string): boolean {
  try {
    router.get(id);
    return true;
  } catch {
    return false;
  }
}

export type { ProviderRuntime };
