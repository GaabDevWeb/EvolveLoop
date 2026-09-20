/**
 * SE-06 Engineering Review contracts.
 * Review finds problems; Validation decides completion; Reviewer never executes.
 */

import type { TestExecutionResult } from "../types.js";

export type ReviewSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";

export type ReviewFindingCategory =
  | "correctness"
  | "requirement_mismatch"
  | "architecture_violation"
  | "scope_violation"
  | "regression"
  | "testing_gap"
  | "security"
  | "maintainability"
  | "documentation_gap";

export type EngineeringReviewStatus =
  | "APPROVED"
  | "CHANGES_REQUIRED"
  | "BLOCKED"
  | "REVIEW_INVALID"
  | "REVIEW_UNAVAILABLE";

export type ReviewRecommendedAction =
  | "NONE"
  | "REPAIR"
  | "REPLAN"
  | "BLOCK"
  | "RE_REVIEW";

export interface ReviewFinding {
  finding_id: string;
  category: ReviewFindingCategory;
  severity: ReviewSeverity;
  description: string;
  evidence: string[];
  file?: string;
  line_range?: { start: number; end: number };
  requirement_id?: string;
  architecture_element?: string;
  acceptance_criterion?: string;
  suggested_remediation?: string;
  blocking: boolean;
}

export interface DiffFileSummary {
  path: string;
  change: "added" | "modified" | "deleted" | "unchanged";
  before_hash?: string;
  after_hash?: string;
  excerpt?: string;
}

export interface EngineeringReviewRequest {
  kind: "EngineeringReviewRequest";
  apiVersion: "evolveloop.io/se/v1";
  review_id: string;
  task_id: string;
  task_graph_id: string;
  task_graph_version: number;
  assignment_id: string;
  implementation_execution_id: string;
  /** Content fingerprint of implementation — invalidates prior reviews */
  implementation_version: string;
  agent_id: string;
  agent_version: string;
  reviewer_agent_id?: string;
  reviewer_agent_version?: string;
  /** When true, implementer != reviewer is mandatory */
  require_independent_review: boolean;
  task_type: string;
  requirement_ids: string[];
  architecture_component_ids?: string[];
  /** Optional architecture constraints text/ids for deterministic checks */
  architecture_constraints?: string[];
  task_scope: string[];
  allowed_paths: string[];
  forbidden_paths: string[];
  workspace_root: string;
  changed_files: string[];
  /** Optional baseline snapshots for diff (path → content before) */
  baseline_contents?: Record<string, string>;
  expected_outputs?: string[];
  acceptance_criteria: string[];
  definition_of_done: string[];
  tests_executed: TestExecutionResult[];
  evidence_refs?: string[];
  policy_id: string;
  review_constraints?: string[];
  /** Patterns that must appear in changed code for acceptance (deterministic) */
  required_content_patterns?: Array<{ pattern: string; requirement_id?: string; description: string }>;
  /** Patterns that must NOT appear */
  prohibited_patterns?: Array<{ pattern: string; category?: ReviewFindingCategory; description: string }>;
  mode: "deterministic" | "agent" | "hybrid";
}

export interface EngineeringReviewResult {
  kind: "EngineeringReviewResult";
  apiVersion: "evolveloop.io/se/v1";
  review_id: string;
  status: EngineeringReviewStatus;
  findings: ReviewFinding[];
  evidence_refs: string[];
  affected_files: string[];
  affected_requirements: string[];
  affected_architecture_elements: string[];
  acceptance_criteria_impact: string[];
  recommended_action: ReviewRecommendedAction;
  reviewer_identity: {
    reviewer_id: string;
    reviewer_version: string;
    mode: "deterministic" | "agent" | "hybrid";
  };
  review_lineage: {
    implementation_execution_id: string;
    implementation_version: string;
    parent_review_id?: string;
    review_attempt: number;
  };
  diff_summary: DiffFileSummary[];
  produced_at: string;
  fingerprint: string;
}

export interface ReviewCheckpoint {
  kind: "ReviewCheckpoint";
  apiVersion: "evolveloop.io/se/v1";
  review_id: string;
  phase: "PENDING" | "STARTED" | "COMPLETED" | "RECOVERING" | "INVALIDATED";
  implementation_version: string;
  result?: EngineeringReviewResult;
  fingerprints: string[];
  updated_at: string;
}
