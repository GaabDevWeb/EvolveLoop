export type * from "./types.js";
export {
  validateTaskGraph,
  computeTaskGraphHealth,
  taskGraphGateAllowsExecution,
  deriveTaskGraphMetadata,
  toIrMappingHints,
} from "./validate.js";
export {
  buildTaskGraphFromProposal,
  buildTaskGraphFromAgentDecision,
  emptyTaskGraph,
  type BuildTaskGraphResult,
} from "./builder.js";
export {
  extractTaskGraphProposal,
  extractAndBuildTaskGraph,
  buildInvalidTaskGraphFixtures,
} from "./extract.js";
export {
  cloneTaskGraph,
  createTaskGraphBaseline,
  createNextTaskGraphVersion,
  diffTaskGraphVersions,
  assertTaskGraphMutable,
  replaceTask,
  TaskGraphImmutabilityError,
} from "./versioning.js";
export { TaskGraphArtifactStore, type TaskGraphArtifactMeta } from "./store.js";
export { buildTaskGraphEvidence } from "./evidence.js";
export {
  emitTaskGraphTelemetry,
  emitTaskGraphGenerationStarted,
  emitTaskGraphProposalProduced,
  emitTaskGraphValidationFailed,
  emitTaskGraphBaselineCreated,
  emitTaskGraphVersionCreated,
  TASK_GRAPH_EVENT_TYPES,
  type TaskGraphTelemetryEventType,
  type TaskGraphTelemetryPayload,
} from "./telemetry.js";
export {
  runTaskGraphFromSpecs,
  runTaskGraphFromAgentDecision,
  runTaskGraphFromAgentResult,
  type TaskGraphPipelineOptions,
  type TaskGraphPipelineResult,
} from "./pipeline.js";
