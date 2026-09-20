import type { EventBus } from "../events/event-bus.js";
import type { EventType } from "../types/index.js";
import type { EngineeringTaskGraph, TaskGraphValidationResult } from "./types.js";

export type TaskGraphTelemetryEventType =
  | "TaskGraphGenerationStarted"
  | "TaskGraphProposalProduced"
  | "TaskGraphValidationFailed"
  | "TaskGraphBaselineCreated"
  | "TaskGraphVersionCreated";

export const TASK_GRAPH_EVENT_TYPES: TaskGraphTelemetryEventType[] = [
  "TaskGraphGenerationStarted",
  "TaskGraphProposalProduced",
  "TaskGraphValidationFailed",
  "TaskGraphBaselineCreated",
  "TaskGraphVersionCreated",
];

export interface TaskGraphTelemetryPayload {
  event: TaskGraphTelemetryEventType;
  task_graph_id?: string;
  version?: number;
  health?: string;
  error_count?: number;
  artifact_id?: string;
  run_id?: string;
}

export function emitTaskGraphTelemetry(
  bus: EventBus | undefined,
  payload: TaskGraphTelemetryPayload,
): void {
  if (!bus) return;
  bus.emit(payload.event as EventType, payload.task_graph_id ?? payload.run_id ?? "taskgraph", "orchestrator", {
    ...payload,
  });
}

export function emitTaskGraphGenerationStarted(
  bus: EventBus | undefined,
  task_graph_id: string,
  run_id?: string,
): void {
  emitTaskGraphTelemetry(bus, { event: "TaskGraphGenerationStarted", task_graph_id, run_id });
}

export function emitTaskGraphProposalProduced(
  bus: EventBus | undefined,
  graph: EngineeringTaskGraph,
  run_id?: string,
): void {
  emitTaskGraphTelemetry(bus, {
    event: "TaskGraphProposalProduced",
    task_graph_id: graph.task_graph_id,
    version: graph.version,
    run_id,
  });
}

export function emitTaskGraphValidationFailed(
  bus: EventBus | undefined,
  graph: EngineeringTaskGraph,
  validation: TaskGraphValidationResult,
  run_id?: string,
): void {
  emitTaskGraphTelemetry(bus, {
    event: "TaskGraphValidationFailed",
    task_graph_id: graph.task_graph_id,
    version: graph.version,
    health: validation.health,
    error_count: validation.errors.length,
    run_id,
  });
}

export function emitTaskGraphBaselineCreated(
  bus: EventBus | undefined,
  graph: EngineeringTaskGraph,
  run_id?: string,
): void {
  emitTaskGraphTelemetry(bus, {
    event: "TaskGraphBaselineCreated",
    task_graph_id: graph.task_graph_id,
    version: graph.version,
    artifact_id: graph.artifact_id,
    run_id,
  });
}

export function emitTaskGraphVersionCreated(
  bus: EventBus | undefined,
  graph: EngineeringTaskGraph,
  run_id?: string,
): void {
  emitTaskGraphTelemetry(bus, {
    event: "TaskGraphVersionCreated",
    task_graph_id: graph.task_graph_id,
    version: graph.version,
    artifact_id: graph.artifact_id,
    run_id,
  });
}
