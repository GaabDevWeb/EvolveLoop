import type { EventBus } from "../events/event-bus.js";
import type { EventType } from "../types/index.js";
import type { ArchitectureSpec, ArchitectureValidationResult } from "./types.js";

export type ArchitectureTelemetryEventType =
  | "ArchitectureGenerationStarted"
  | "ArchitectureProposalProduced"
  | "ArchitectureValidationFailed"
  | "ArchitectureBaselineCreated"
  | "ArchitectureVersionCreated";

export const ARCHITECTURE_EVENT_TYPES: ArchitectureTelemetryEventType[] = [
  "ArchitectureGenerationStarted",
  "ArchitectureProposalProduced",
  "ArchitectureValidationFailed",
  "ArchitectureBaselineCreated",
  "ArchitectureVersionCreated",
];

export interface ArchitectureTelemetryPayload {
  event: ArchitectureTelemetryEventType;
  architecture_id?: string;
  version?: number;
  requirements_id?: string;
  requirements_version?: number;
  readiness?: string;
  error_count?: number;
  artifact_id?: string;
  run_id?: string;
}

export function emitArchitectureTelemetry(
  bus: EventBus | undefined,
  payload: ArchitectureTelemetryPayload,
): void {
  if (!bus) return;
  const featureId = payload.architecture_id ?? payload.run_id ?? "architecture";
  bus.emit(payload.event as EventType, featureId, "orchestrator", { ...payload });
}

export function emitArchitectureGenerationStarted(
  bus: EventBus | undefined,
  architecture_id: string,
  run_id?: string,
): void {
  emitArchitectureTelemetry(bus, {
    event: "ArchitectureGenerationStarted",
    architecture_id,
    run_id,
  });
}

export function emitArchitectureProposalProduced(
  bus: EventBus | undefined,
  spec: ArchitectureSpec,
  run_id?: string,
): void {
  emitArchitectureTelemetry(bus, {
    event: "ArchitectureProposalProduced",
    architecture_id: spec.architecture_id,
    version: spec.version,
    requirements_id: spec.requirements_reference.requirements_id,
    requirements_version: spec.requirements_reference.requirements_version,
    run_id,
  });
}

export function emitArchitectureValidationFailed(
  bus: EventBus | undefined,
  spec: ArchitectureSpec,
  validation: ArchitectureValidationResult,
  run_id?: string,
): void {
  emitArchitectureTelemetry(bus, {
    event: "ArchitectureValidationFailed",
    architecture_id: spec.architecture_id,
    version: spec.version,
    readiness: validation.readiness,
    error_count: validation.errors.length,
    run_id,
  });
}

export function emitArchitectureBaselineCreated(
  bus: EventBus | undefined,
  spec: ArchitectureSpec,
  run_id?: string,
): void {
  emitArchitectureTelemetry(bus, {
    event: "ArchitectureBaselineCreated",
    architecture_id: spec.architecture_id,
    version: spec.version,
    artifact_id: spec.artifact_id,
    run_id,
  });
}

export function emitArchitectureVersionCreated(
  bus: EventBus | undefined,
  spec: ArchitectureSpec,
  run_id?: string,
): void {
  emitArchitectureTelemetry(bus, {
    event: "ArchitectureVersionCreated",
    architecture_id: spec.architecture_id,
    version: spec.version,
    artifact_id: spec.artifact_id,
    run_id,
  });
}
