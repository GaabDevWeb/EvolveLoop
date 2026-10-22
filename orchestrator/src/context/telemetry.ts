import type { EventBus } from "../events/event-bus.js";
import type { ContextBudgetTelemetry } from "./types.js";
import type { EventType } from "../types/index.js";

const EVENT_TYPE: EventType = "ContextBudget";

export function emitContextBudgetTelemetry(
  bus: EventBus | undefined,
  telemetry: ContextBudgetTelemetry,
  featureId?: string,
): void {
  try {
    if (!bus) return;
    bus.emit(EVENT_TYPE, featureId ?? "unknown", "engine", { ...telemetry }, telemetry.context_owner_id);
  } catch {
    /* observe-only */
  }
}

export function appendContextBudgetEvidenceFields(
  evidenceSpec: Record<string, unknown>,
  telemetry: ContextBudgetTelemetry,
): Record<string, unknown> {
  return {
    ...evidenceSpec,
    context_budget: {
      tokenizer: telemetry.tokenizer,
      tokens_measured: telemetry.tokens_measured,
      paths_read: telemetry.paths_read,
      pages_read: telemetry.pages_read,
      overflow: telemetry.overflow,
      limits: telemetry.budget_limits,
      context_owner_id: telemetry.context_owner_id,
    },
  };
}
