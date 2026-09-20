/**
 * Structured validation — Agent "done" is never sufficient.
 * SE-06: Review is a separate input; Validation owns completion.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  EngineeringValidationResult,
  EngineeringWorkRequest,
  ImplementationProposalBody,
  TestExecutionResult,
} from "./types.js";
import type { EngineeringReviewResult } from "./review/types.js";

export function buildValidationResult(input: {
  work: EngineeringWorkRequest;
  proposal?: ImplementationProposalBody;
  files_changed: string[];
  test_results: TestExecutionResult[];
  policy_status: EngineeringValidationResult["policy_status"];
  implementation_ok: boolean;
  implementation_errors?: string[];
  /** When set, review participates in completion gate */
  review?: EngineeringReviewResult;
  require_review?: boolean;
}): EngineeringValidationResult {
  const failures: string[] = [...(input.implementation_errors ?? [])];
  const warnings: string[] = [];

  if (!input.implementation_ok) {
    failures.push("implementation invalid or not applied");
  }

  const tests_valid =
    input.test_results.length > 0 && input.test_results.every((t) => t.passed && t.verified_by_runtime);
  if (input.test_results.length === 0) {
    failures.push("no verified test execution");
  } else if (!tests_valid) {
    for (const t of input.test_results.filter((x) => !x.passed)) {
      failures.push(`test failed: ${t.command} exit=${t.exit_code}`);
    }
  }

  const expectedPaths = [
    ...(input.proposal?.expected_outputs ?? []),
    ...(input.work.expected_outputs?.map((o) => o.path).filter((p): p is string => !!p) ?? []),
  ];
  for (const p of expectedPaths) {
    if (!existsSync(join(input.work.workspace_root, p))) {
      failures.push(`expected output missing: ${p}`);
    }
  }

  const acceptance_criteria_valid =
    input.work.acceptance_criteria.length === 0 ||
    (input.implementation_ok &&
      tests_valid &&
      expectedPaths.every((p) => existsSync(join(input.work.workspace_root, p))));

  if (!acceptance_criteria_valid && input.work.acceptance_criteria.length) {
    failures.push("acceptance criteria not satisfied");
  }

  const require_review = input.require_review === true || Boolean(input.review);
  let review_valid = true;
  let review_status = input.review?.status;
  if (require_review) {
    if (!input.review) {
      review_valid = false;
      failures.push("review required but missing");
    } else if (input.review.status !== "APPROVED") {
      review_valid = false;
      failures.push(`review not approved: ${input.review.status}`);
      for (const f of input.review.findings.filter((x) => x.blocking)) {
        failures.push(`review blocker: ${f.finding_id} ${f.description}`);
      }
    } else if (input.review.findings.some((f) => f.blocking && f.severity === "BLOCKER")) {
      // Approved cannot coexist with blockers — defensive
      review_valid = false;
      failures.push("review APPROVED with blocker findings rejected");
    }
  }

  const dod_valid =
    input.work.definition_of_done.length === 0 ||
    (input.implementation_ok &&
      tests_valid &&
      input.policy_status !== "DENY" &&
      (!require_review || review_valid));

  if (!dod_valid) failures.push("definition of done not satisfied");

  const evidence_complete = input.files_changed.length > 0 || tests_valid;
  if (!evidence_complete) warnings.push("thin evidence");

  if (input.policy_status === "DENY" || input.policy_status === "CONFIRMATION_REQUIRED") {
    failures.push(`policy status: ${input.policy_status}`);
  }

  let completion_decision: EngineeringValidationResult["completion_decision"] = "FAIL";
  if (input.review?.recommended_action === "REPLAN") {
    completion_decision = "REPLAN";
  } else if (
    input.implementation_ok &&
    tests_valid &&
    acceptance_criteria_valid &&
    dod_valid &&
    input.policy_status === "ALLOW" &&
    (!require_review || review_valid)
  ) {
    completion_decision = "COMPLETE";
  } else if (
    input.policy_status === "DENY" ||
    input.policy_status === "CONFIRMATION_REQUIRED" ||
    input.review?.status === "BLOCKED" ||
    input.review?.status === "REVIEW_UNAVAILABLE" ||
    input.review?.status === "REVIEW_INVALID"
  ) {
    completion_decision = "BLOCK";
  } else if (
    (input.review?.status === "CHANGES_REQUIRED" || input.review?.recommended_action === "REPAIR") &&
    input.implementation_ok
  ) {
    completion_decision = "REPAIR";
  } else if (!tests_valid && input.implementation_ok) {
    completion_decision = "REPAIR";
  }

  return {
    kind: "EngineeringValidationResult",
    apiVersion: "evolveloop.io/se/v1",
    work_id: input.work.work_id,
    task_id: input.work.task_id,
    assignment_id: input.work.assignment_id,
    implementation_valid: input.implementation_ok,
    tests_valid,
    acceptance_criteria_valid,
    dod_valid,
    evidence_complete,
    policy_status: input.policy_status,
    review_required: require_review,
    review_status,
    review_valid: require_review ? review_valid : undefined,
    review_id: input.review?.review_id,
    outstanding_failures: [...new Set(failures)],
    warnings,
    completion_decision,
    files_changed: input.files_changed,
    test_results: input.test_results,
    produced_at: new Date().toISOString(),
  };
}

/** Explicit: Supervisor/Agent cannot force COMPLETE past review blockers */
export function assertCompletionAllowed(validation: EngineeringValidationResult): boolean {
  return validation.completion_decision === "COMPLETE";
}
