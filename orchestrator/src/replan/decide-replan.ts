import type { FailureClassification } from "./failure-class.js";
import type { ShouldReplanDecision } from "./types.js";

export function shouldReplan(input: {
  classification: FailureClassification;
  replan_count: number;
  max_replans: number;
  /** Candidate would be identical to a recent plan */
  would_be_duplicate?: boolean;
  /** Same failure signature as last replan attempt */
  same_failure_no_progress?: boolean;
}): ShouldReplanDecision {
  const { classification, replan_count, max_replans } = input;

  if (classification.disposition === "POLICY_BLOCKED") {
    return {
      should: false,
      disposition: "POLICY_BLOCKED",
      reason: classification.reason,
      code: "POLICY_BLOCKED",
    };
  }

  if (classification.disposition === "BUDGET_BLOCKED") {
    return {
      should: false,
      disposition: "BUDGET_BLOCKED",
      reason: classification.reason,
      code: "FATAL",
    };
  }

  if (classification.disposition === "HUMAN_REQUIRED") {
    return {
      should: false,
      disposition: "HUMAN_REQUIRED",
      reason: classification.reason,
      code: "HUMAN_REQUIRED",
    };
  }

  if (classification.disposition === "FATAL") {
    return {
      should: false,
      disposition: "FATAL",
      reason: classification.reason,
      code: "FATAL",
    };
  }

  if (classification.disposition === "RETRYABLE") {
    // Engine already applies retries; if we reach orchestrator with retries exhausted,
    // unrecoverable_failure is remapped to REPLANABLE. Pure RETRYABLE here means do not replan yet.
    return {
      should: false,
      disposition: "RETRYABLE",
      reason: "Prefer retry over replan",
      code: "USE_RETRY",
    };
  }

  if (replan_count >= max_replans) {
    return {
      should: false,
      disposition: "FATAL",
      reason: `max_replans=${max_replans} exhausted`,
      code: "REPLAN_EXHAUSTED",
    };
  }

  if (input.same_failure_no_progress) {
    return {
      should: false,
      disposition: "FATAL",
      reason: "Same failure + no progress after prior replan",
      code: "NO_PROGRESS",
    };
  }

  if (input.would_be_duplicate) {
    return {
      should: false,
      disposition: "FATAL",
      reason: "Candidate plan identical to a recent plan",
      code: "NO_PROGRESS",
    };
  }

  return {
    should: true,
    disposition: "REPLANABLE",
    reason: classification.reason,
    code: "SHOULD_REPLAN",
  };
}
