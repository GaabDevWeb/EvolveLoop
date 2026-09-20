import type { EventBus } from "../../events/event-bus.js";
import type { EventType } from "../../types/index.js";

export type ReviewTelemetryEvent =
  | "ReviewCreated"
  | "ReviewStarted"
  | "ReviewFindingCreated"
  | "ReviewCompleted"
  | "ReviewBlocked"
  | "ReviewRepairRequested"
  | "ReviewReplanRequested"
  | "ReviewRecovered"
  | "ReviewInvalidated";

export function emitReviewTelemetry(
  bus: EventBus | undefined,
  event: ReviewTelemetryEvent,
  featureId: string,
  payload: Record<string, unknown>,
): void {
  if (!bus) return;
  bus.emit(event as EventType, featureId, "orchestrator", payload);
}
