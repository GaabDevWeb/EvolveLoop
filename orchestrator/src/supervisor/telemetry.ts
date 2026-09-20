import type { EventBus } from "../events/event-bus.js";
import type { EventType } from "../types/index.js";

export type SupervisorTelemetryEvent =
  | "DelegationCreated"
  | "DelegationClaimed"
  | "AgentStarted"
  | "AgentDecisionReceived"
  | "DecisionValidated"
  | "RuntimeExecutionStarted"
  | "RuntimeExecutionCompleted"
  | "DelegationSucceeded"
  | "DelegationFailed"
  | "DelegationBlocked"
  | "DelegationReplanRequested"
  | "DelegationRecovered";

export function emitSupervisorTelemetry(
  bus: EventBus | undefined,
  event: SupervisorTelemetryEvent,
  featureId: string,
  payload: Record<string, unknown>,
): void {
  if (!bus) return;
  bus.emit(event as EventType, featureId, "orchestrator", payload);
}
