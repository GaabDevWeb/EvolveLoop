/**
 * SE-07 Project composition contracts — not a second Runtime.
 */

export type ProjectPhase =
  | "CREATED"
  | "PLANNED"
  | "EXECUTING"
  | "VERIFYING"
  | "REPAIRING"
  | "REPLANNING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED";

export interface TraceLink {
  requirement_id: string;
  architecture_component_ids: string[];
  task_ids: string[];
  assignment_ids: string[];
  agent_ids: string[];
  execution_ids: string[];
  test_execution_ids: string[];
  review_ids: string[];
  evidence_refs: string[];
}

export interface ProjectCheckpoint {
  kind: "SoftwareEngineeringProjectCheckpoint";
  apiVersion: "evolveloop.io/se/v1";
  project_id: string;
  phase: ProjectPhase;
  requirements_id?: string;
  requirements_version?: number;
  architecture_id?: string;
  architecture_version?: number;
  task_graph_id?: string;
  task_graph_version?: number;
  completed_task_ids: string[];
  failed_task_ids: string[];
  repaired_task_ids: string[];
  replanned_task_ids: string[];
  budgets: {
    max_task_iterations: number;
    max_repairs: number;
    max_replans: number;
    repairs_used: number;
    replans_used: number;
  };
  metrics: ProjectMetrics;
  updated_at: string;
}

export interface ProjectMetrics {
  requirements_validity: "PASS" | "FAIL" | "NOT_MEASURED";
  architecture_validity: "PASS" | "FAIL" | "NOT_MEASURED";
  task_graph_validity: "PASS" | "FAIL" | "NOT_MEASURED";
  delegation_validity: "PASS" | "FAIL" | "NOT_MEASURED";
  implementation_success: "PASS" | "FAIL" | "NOT_MEASURED";
  test_pass_rate: number | "NOT_MEASURED";
  review_precision_recall: "NOT_MEASURED";
  repair_success: "PASS" | "FAIL" | "NOT_MEASURED";
  replan_success: "PASS" | "FAIL" | "NOT_MEASURED";
  recovery_correctness: "PASS" | "FAIL" | "NOT_MEASURED";
  policy_bypass_rate: 0 | "NOT_MEASURED";
  scope_violation_rate: number | "NOT_MEASURED";
  duplicate_effect_rate: "NOT_MEASURED";
  end_to_end_success: "PASS" | "FAIL" | "NOT_MEASURED";
  total_steps: number;
  total_retries: number;
  total_replans: number;
  total_repairs: number;
  agent_invocations: number;
  live_llm_eval: "PASS" | "INCONCLUSIVE" | "NOT_MEASURED";
  latency_ms: number;
  token_usage: "NOT_MEASURED";
}

export interface DeliveryArtifact {
  kind: "Se07DeliveryArtifact";
  apiVersion: "evolveloop.io/se/v1";
  project_id: string;
  project_name: string;
  phase: ProjectPhase;
  requirements_version: number;
  architecture_version: number;
  task_graph_version: number;
  completed_tasks: string[];
  failed_tasks: string[];
  repaired_tasks: string[];
  replanned_tasks: string[];
  test_summary: Array<{ command: string; passed: boolean; execution_id: string }>;
  review_summary: Array<{ review_id: string; status: string; implementation_version: string }>;
  validation_summary: Array<{ task_id: string; decision: string }>;
  evidence_refs: string[];
  telemetry_event_types: string[];
  traceability: TraceLink[];
  unresolved_warnings: string[];
  workspace_checks: Array<{ path: string; exists: boolean; note?: string }>;
  failure_taxonomy: Record<string, number>;
  metrics: ProjectMetrics;
  produced_at: string;
}

export interface CompositionSeamAudit {
  seams: Array<{ from: string; to: string; status: "OK" | "GAP"; note: string }>;
  gaps: string[];
}
