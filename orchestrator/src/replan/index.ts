export { classifyFailure, type FailureClassification, type FailureDisposition } from "./failure-class.js";
export { shouldReplan } from "./decide-replan.js";
export { hashCapabilityIR, stampPlanLineage, failureSignature } from "./plan-identity.js";
export { applyReplanPreservingCompleted } from "./apply-replan.js";
export {
  DeterministicReplanner,
  UnavailableReplanner,
} from "./deterministic-replanner.js";
export type {
  Replanner,
  ReplanInput,
  ReplanResult,
  ReplanStrategy,
  ShouldReplanDecision,
} from "./types.js";
