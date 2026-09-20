/**
 * SE-05 Engineering Worker contracts.
 * Worker materializes EngineeringTask work via Runtime authorities — not an Agent.
 */

export type WorkspaceOpKind =
  | "create_file"
  | "replace_file"
  | "patch_file"
  | "append_file"
  | "delete_file"
  | "rename_file";

export interface WorkspaceOp {
  op: WorkspaceOpKind;
  path: string;
  /** Full content for create/replace */
  content?: string;
  /** patch: find → replace (deterministic, single occurrence unless replace_all) */
  find?: string;
  replace?: string;
  replace_all?: boolean;
  /** append */
  append?: string;
  /** rename target */
  to_path?: string;
  rationale?: string;
}

export interface ImplementationProposalBody {
  kind: "ImplementationProposal";
  apiVersion: "evolveloop.io/se/v1";
  proposal_id: string;
  task_id: string;
  assignment_id: string;
  operations: WorkspaceOp[];
  validation_commands?: string[];
  expected_outputs?: string[];
  assumptions?: string[];
  rationale?: string;
}

export interface EngineeringWorkRequest {
  kind: "EngineeringWorkRequest";
  apiVersion: "evolveloop.io/se/v1";
  work_id: string;
  task_id: string;
  task_graph_id: string;
  task_graph_version: number;
  assignment_id: string;
  agent_id: string;
  agent_version: string;
  task_type: string;
  task_scope: string[];
  allowed_paths: string[];
  forbidden_paths: string[];
  workspace_root: string;
  allowed_capabilities: string[];
  forbidden_capabilities: string[];
  requirement_ids: string[];
  architecture_component_ids?: string[];
  inputs?: Array<{ ref: string; type?: string }>;
  expected_outputs?: Array<{ ref: string; path?: string; type?: string }>;
  acceptance_criteria: string[];
  definition_of_done: string[];
  constraints?: string[];
  risk?: string;
  side_effects?: string[];
  policy_id: string;
  correlation: {
    run_id: string;
    execution_id: string;
    assignment_id: string;
    task_id: string;
  };
  evidence_requirements?: Array<{ kind: string; description: string }>;
  validation_commands?: string[];
  /** B01-consumed budgets — Worker cannot raise these */
  budgets: {
    max_iterations: number;
    max_repairs: number;
    max_replans: number;
    timeout_ms: number;
  };
  /** Sandbox is NOT claimed here */
  sandbox: "NOT_IMPLEMENTED";
}

export interface TestExecutionResult {
  kind: "TestExecutionResult";
  apiVersion: "evolveloop.io/se/v1";
  execution_id: string;
  command: string;
  exit_code: number | null;
  passed: boolean;
  failed: boolean;
  skipped: boolean;
  duration_ms: number;
  stdout_excerpt?: string;
  stderr_excerpt?: string;
  affected_scope?: string[];
  evidence_ref?: string;
  timestamp: string;
  /** True only when Runtime actually executed the command */
  verified_by_runtime: true;
  timed_out?: boolean;
}

export interface EngineeringValidationResult {
  kind: "EngineeringValidationResult";
  apiVersion: "evolveloop.io/se/v1";
  work_id: string;
  task_id: string;
  assignment_id: string;
  implementation_valid: boolean;
  tests_valid: boolean;
  acceptance_criteria_valid: boolean;
  dod_valid: boolean;
  evidence_complete: boolean;
  policy_status: "ALLOW" | "DENY" | "CONFIRMATION_REQUIRED" | "N/A";
  /** SE-06 — review gate (optional unless required) */
  review_required?: boolean;
  review_status?: import("./review/types.js").EngineeringReviewStatus;
  review_valid?: boolean;
  review_id?: string;
  outstanding_failures: string[];
  warnings: string[];
  completion_decision: "COMPLETE" | "FAIL" | "BLOCK" | "REPAIR" | "REPLAN";
  files_changed: string[];
  test_results: TestExecutionResult[];
  produced_at: string;
}

export type WorkerPhase =
  | "PENDING"
  | "PROPOSAL_VALIDATED"
  | "APPLYING"
  | "APPLIED"
  | "TESTING"
  | "VALIDATING"
  | "REPAIRING"
  | "SUCCEEDED"
  | "FAILED"
  | "BLOCKED"
  | "REPLAN_REQUIRED"
  | "RECOVERING";

export interface EffectFingerprint {
  path: string;
  op: WorkspaceOpKind;
  content_hash: string;
  applied_at: string;
  execution_id: string;
}

export interface EngineeringWorkerCheckpoint {
  kind: "EngineeringWorkerCheckpoint";
  apiVersion: "evolveloop.io/se/v1";
  work_id: string;
  phase: WorkerPhase;
  assignment_id: string;
  task_id: string;
  iteration: number;
  repair_attempt: number;
  replan_attempt: number;
  applied_effects: EffectFingerprint[];
  last_validation?: EngineeringValidationResult;
  last_failure_code?: string;
  last_failure_message?: string;
  updated_at: string;
}

export interface EngineeringWorkResult {
  kind: "EngineeringWorkResult";
  apiVersion: "evolveloop.io/se/v1";
  work_id: string;
  ok: boolean;
  phase: WorkerPhase;
  validation?: EngineeringValidationResult;
  files_changed: string[];
  test_results: TestExecutionResult[];
  evidence_refs: string[];
  failure_code?: string;
  failure_message?: string;
  repair_attempted: boolean;
  replan_required: boolean;
  checkpoint?: EngineeringWorkerCheckpoint;
}

export type FailureClass =
  | "IMPLEMENTATION_INVALID"
  | "TEST_FAILED"
  | "POLICY_BLOCKED"
  | "SCOPE_VIOLATION"
  | "TIMEOUT"
  | "PROVIDER_FAILURE"
  | "BUDGET_EXHAUSTED"
  | "IMPOSSIBLE_ASSUMPTION"
  | "UNKNOWN";
