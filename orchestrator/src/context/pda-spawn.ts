import { applyContextBudget, sliceFromFile } from "./budget.js";
import { validateSpawnContext, parseGateBundle } from "./gate-bundle.js";
import type { ContextBudgetApplyResult, ContextSlice, GateBundleFields, SpawnContextValidation } from "./types.js";
import { emitContextBudgetTelemetry } from "./telemetry.js";
import type { EventBus } from "../events/event-bus.js";

export { validateSpawnContext, parseGateBundle };

export interface PrepareSpawnContextInput {
  gate_bundle: Partial<GateBundleFields> | Record<string, unknown>;
  retrieval_slices: ContextSlice[];
  evidence_paths?: string[];
}

export interface PrepareSpawnContextResult {
  validation: SpawnContextValidation;
  budget?: ContextBudgetApplyResult;
}

/** Validate GATE_BUNDLE, assign owner, apply optional context budget from bundle. */
export function prepareSpawnContext(input: PrepareSpawnContextInput): PrepareSpawnContextResult {
  const bundle =
    "parent_cycle_id" in input.gate_bundle && typeof input.gate_bundle.parent_cycle_id === "string"
      ? (input.gate_bundle as Partial<GateBundleFields>)
      : parseGateBundle(input.gate_bundle as Record<string, unknown>);

  const validation = validateSpawnContext(bundle);
  if (!validation.valid || !validation.context_owner_id) {
    return { validation };
  }

  const limits = validation.gate_bundle?.context_budget;
  const budget = applyContextBudget(input.retrieval_slices, {
    ownerId: validation.context_owner_id,
    limits,
    evidence_paths: input.evidence_paths,
  });

  return { validation, budget };
}

export function prepareSpawnContextWithTelemetry(
  input: PrepareSpawnContextInput,
  bus?: EventBus,
  featureId?: string,
): PrepareSpawnContextResult {
  const result = prepareSpawnContext(input);
  if (result.budget?.telemetry) {
    emitContextBudgetTelemetry(bus, result.budget.telemetry, featureId);
  }
  return result;
}

export function slicesFromPathContents(
  entries: Array<{ path: string; content: string }>,
  defaultKind: ContextSlice["kind"] = "generic",
): ContextSlice[] {
  return entries.map((e) => sliceFromFile(e.path, e.content, defaultKind));
}
