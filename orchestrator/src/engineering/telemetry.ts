import type { EventBus } from "../events/event-bus.js";
import type { EventType } from "../types/index.js";

export type EngineeringTelemetryEvent =
  | "ImplementationProposed"
  | "ImplementationValidated"
  | "WorkspaceChangeStarted"
  | "WorkspaceChangeCompleted"
  | "TestExecutionStarted"
  | "TestExecutionCompleted"
  | "ValidationStarted"
  | "ValidationCompleted"
  | "RepairStarted"
  | "RepairCompleted"
  | "EngineeringTaskCompleted"
  | "EngineeringTaskFailed"
  | "EngineeringTaskBlocked"
  | "EngineeringTaskRecovered";

export function emitEngineeringTelemetry(
  bus: EventBus | undefined,
  event: EngineeringTelemetryEvent,
  featureId: string,
  payload: Record<string, unknown>,
): void {
  if (!bus) return;
  bus.emit(event as EventType, featureId, "orchestrator", payload);
}
