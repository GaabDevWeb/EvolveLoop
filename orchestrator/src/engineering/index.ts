export type * from "./types.js";
export {
  normalizeRel,
  pathEscapesRoot,
  pathInScope,
  isForbiddenPath,
  assertWorkspaceOpScope,
} from "./scope.js";
export {
  parseImplementationProposal,
  proposalFromDecision,
  contentHash,
} from "./proposal.js";
export { selectValidationCommands, isAllowedTestCommand } from "./test-select.js";
export { executeTestCommand } from "./test-execute.js";
export { applyWorkspaceOps } from "./runtime-effects.js";
export { buildValidationResult } from "./validate.js";
export { WorkerCheckpointStore } from "./checkpoint.js";
export { classifyEngineeringFailure } from "./repair.js";
export { emitEngineeringTelemetry, type EngineeringTelemetryEvent } from "./telemetry.js";
export { buildEngineeringEvidence } from "./evidence.js";
export {
  EngineeringWorker,
  buildWorkRequest,
  fixtureCorrectAddOps,
  type EngineeringWorkerOptions,
} from "./worker.js";
export { assertCompletionAllowed } from "./validate.js";
export {
  EngineeringReviewer,
  ReviewStore,
  buildReviewRequest,
  runDeterministicChecks,
  buildDiffSummary,
  implementationVersionFingerprint,
  assertReviewIndependence,
  DETERMINISTIC_REVIEWER_ID,
  ForbiddenReviewerExecutor,
  ForbiddenReviewerExecutionError,
  buildReviewEvidence,
  type EngineeringReviewRequest,
  type EngineeringReviewResult,
  type ReviewFinding,
  type EngineeringReviewStatus,
} from "./review/index.js";
export {
  SoftwareEngineeringProject,
  materializeMiniCrmFixture,
  writeDeliveryMarkdown,
  MINICRM_BRIEF,
  type Se07BenchmarkOptions,
  type Se07BenchmarkResult,
} from "./project/runner.js";
export { ProjectCheckpointStore } from "./project/checkpoint.js";
export { auditCompositionSeams } from "./project/seam-audit.js";
export type {
  ProjectPhase,
  ProjectCheckpoint,
  ProjectMetrics,
  DeliveryArtifact,
  TraceLink,
  CompositionSeamAudit,
} from "./project/types.js";
