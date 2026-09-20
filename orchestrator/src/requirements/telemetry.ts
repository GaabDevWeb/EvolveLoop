/**
 * Requirements telemetry — EventBus events (SE layer, not Runtime Core mutation).
 */

import type { EventBus } from "../events/event-bus.js";
import type { EventType } from "../types/index.js";
import type { RequirementsSpec, RequirementsValidationResult } from "./types.js";

export type RequirementsTelemetryEventType =
  | "RequirementsExtractionStarted"
  | "RequirementsProposalProduced"
  | "RequirementsValidationFailed"
  | "RequirementsBaselineCreated"
  | "RequirementsVersionCreated";

export const REQUIREMENTS_EVENT_TYPES: RequirementsTelemetryEventType[] = [
  "RequirementsExtractionStarted",
  "RequirementsProposalProduced",
  "RequirementsValidationFailed",
  "RequirementsBaselineCreated",
  "RequirementsVersionCreated",
];

export interface RequirementsTelemetryPayload {
  event: RequirementsTelemetryEventType;
  requirements_id?: string;
  version?: number;
  readiness?: string;
  error_count?: number;
  artifact_id?: string;
  run_id?: string;
}

export function emitRequirementsTelemetry(
  bus: EventBus | undefined,
  payload: RequirementsTelemetryPayload,
): void {
  if (!bus) return;
  const featureId = payload.requirements_id ?? payload.run_id ?? "requirements";
  bus.emit(payload.event as EventType, featureId, "orchestrator", {
    ...payload,
  });
}

export function emitExtractionStarted(
  bus: EventBus | undefined,
  requirements_id: string,
  run_id?: string,
): void {
  emitRequirementsTelemetry(bus, {
    event: "RequirementsExtractionStarted",
    requirements_id,
    run_id,
  });
}

export function emitProposalProduced(
  bus: EventBus | undefined,
  spec: RequirementsSpec,
  run_id?: string,
): void {
  emitRequirementsTelemetry(bus, {
    event: "RequirementsProposalProduced",
    requirements_id: spec.requirements_id,
    version: spec.version,
    run_id,
  });
}

export function emitValidationFailed(
  bus: EventBus | undefined,
  spec: RequirementsSpec,
  validation: RequirementsValidationResult,
  run_id?: string,
): void {
  emitRequirementsTelemetry(bus, {
    event: "RequirementsValidationFailed",
    requirements_id: spec.requirements_id,
    version: spec.version,
    readiness: validation.readiness,
    error_count: validation.errors.length,
    run_id,
  });
}

export function emitBaselineCreated(
  bus: EventBus | undefined,
  spec: RequirementsSpec,
  run_id?: string,
): void {
  emitRequirementsTelemetry(bus, {
    event: "RequirementsBaselineCreated",
    requirements_id: spec.requirements_id,
    version: spec.version,
    artifact_id: spec.artifact_id,
    run_id,
  });
}

export function emitVersionCreated(
  bus: EventBus | undefined,
  spec: RequirementsSpec,
  run_id?: string,
): void {
  emitRequirementsTelemetry(bus, {
    event: "RequirementsVersionCreated",
    requirements_id: spec.requirements_id,
    version: spec.version,
    artifact_id: spec.artifact_id,
    run_id,
  });
}
