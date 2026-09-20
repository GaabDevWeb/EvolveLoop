export type * from "./types.js";
export {
  validateArchitectureSpec,
  computeArchitectureReadiness,
  architectureGateAllowsTaskDecomposition,
} from "./validate.js";
export {
  buildArchitectureSpecFromProposal,
  buildArchitectureFromAgentDecision,
  emptyArchitectureSpec,
  type BuildArchitectureResult,
} from "./builder.js";
export {
  extractArchitectureProposal,
  extractAndBuildArchitecture,
  buildInvalidArchitectureFixtures,
} from "./extract.js";
export {
  cloneArchitectureSpec,
  createArchitectureBaseline,
  createNextArchitectureVersion,
  diffArchitectureVersions,
  assertArchitectureMutable,
  toTaskDecompositionHandoff,
  ArchitectureImmutabilityError,
  type TaskDecompositionHandoff,
} from "./versioning.js";
export { ArchitectureArtifactStore, type ArchitectureArtifactMeta } from "./store.js";
export { buildArchitectureEvidence } from "./evidence.js";
export {
  emitArchitectureTelemetry,
  emitArchitectureGenerationStarted,
  emitArchitectureProposalProduced,
  emitArchitectureValidationFailed,
  emitArchitectureBaselineCreated,
  emitArchitectureVersionCreated,
  ARCHITECTURE_EVENT_TYPES,
  type ArchitectureTelemetryEventType,
  type ArchitectureTelemetryPayload,
} from "./telemetry.js";
export {
  runArchitectureFromRequirements,
  runArchitectureFromAgentDecision,
  runArchitectureFromAgentResult,
  type ArchitecturePipelineOptions,
  type ArchitecturePipelineResult,
} from "./pipeline.js";
