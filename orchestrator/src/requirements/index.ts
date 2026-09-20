export type * from "./types.js";
export { computeRequirementHash } from "./hash.js";
export {
  validateRequirementsSpec,
  computeReadiness,
  requirementsGateAllowsArchitecture,
  detectStackConflicts,
  detectDuplicateCandidates,
  type RequirementsValidatorOptions,
} from "./validate.js";
export {
  buildRequirementsSpecFromProposal,
  buildRequirementsFromAgentDecision,
  emptyRequirementsSpec,
  type BuildRequirementsResult,
} from "./builder.js";
export {
  cloneRequirementsSpec,
  createRequirementsBaseline,
  createNextRequirementsVersion,
  diffRequirementsVersions,
  assertMutable,
  toArchitectureHandoff,
  RequirementsImmutabilityError,
  type ArchitectureHandoff,
} from "./versioning.js";
export {
  RequirementsArtifactStore,
  type RequirementsArtifactMeta,
} from "./store.js";
export {
  extractRequirementsProposal,
  extractAndBuild,
  assertNoCodeGeneration,
} from "./extract.js";
export { buildRequirementsEvidence } from "./evidence.js";
export {
  emitRequirementsTelemetry,
  emitExtractionStarted,
  emitProposalProduced,
  emitValidationFailed,
  emitBaselineCreated,
  emitVersionCreated,
  REQUIREMENTS_EVENT_TYPES,
  type RequirementsTelemetryEventType,
  type RequirementsTelemetryPayload,
} from "./telemetry.js";
export {
  runRequirementsFromText,
  runRequirementsFromAgentDecision,
  runRequirementsFromAgentResult,
  type RequirementsPipelineOptions,
  type RequirementsPipelineResult,
} from "./pipeline.js";
