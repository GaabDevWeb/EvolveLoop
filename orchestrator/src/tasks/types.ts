/**
 * SE-03 Engineering Task Graph — work definition (not execution state).
 * CapabilityGraph/IR remains Runtime execution; this layer maps later via PlanEmitter.
 */

export type TaskType =
  | "IMPLEMENTATION"
  | "TEST"
  | "DOCUMENTATION"
  | "DATABASE"
  | "CONFIGURATION"
  | "INTEGRATION"
  | "MIGRATION"
  | "VALIDATION"
  | "RESEARCH";

export type TaskPriority = "MUST" | "SHOULD" | "COULD";

/** Definition-time status only — Runtime owns execution state */
export type TaskDefinitionStatus = "PROPOSED" | "READY" | "BLOCKED" | "SKIPPED" | "CANCELLED";

export type TaskActionType =
  | "CREATE"
  | "MODIFY"
  | "DELETE"
  | "MIGRATE"
  | "CONFIGURE"
  | "TEST"
  | "DOCUMENT"
  | "VALIDATE";

export type TaskRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskSideEffect =
  | "READ_ONLY"
  | "LOCAL_WRITE"
  | "BUILD_EXECUTION"
  | "DATABASE_WRITE"
  | "NETWORK"
  | "DEPLOYMENT"
  | "EXTERNAL_MUTATION";

export type TaskTestability =
  | "AUTOMATABLE"
  | "PARTIALLY_AUTOMATABLE"
  | "HUMAN_VALIDATION"
  | "NOT_YET_TESTABLE";

export type TaskGraphHealth = "READY" | "READY_WITH_WARNINGS" | "BLOCKED" | "INVALID";

export interface TaskDependency {
  task_id: string;
  reason?: string;
}

export interface TaskArtifactRef {
  artifact_id: string;
  type: string;
  path?: string;
  consumer_task_ids?: string[];
}

export interface TaskEvidenceRequirement {
  evidence_id: string;
  kind: string;
  description: string;
}

export interface EngineeringTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  /** Definition status — not runtime execution status */
  status: TaskDefinitionStatus;
  action?: TaskActionType;
  requirement_ids: string[];
  architecture_component_ids?: string[];
  architecture_decision_ids?: string[];
  interface_ids?: string[];
  dependencies: TaskDependency[];
  required_capabilities: string[];
  preferred_agent_role?: string;
  compatible_agent_roles?: string[];
  inputs?: TaskArtifactRef[];
  outputs?: TaskArtifactRef[];
  definition_of_done: string[];
  acceptance_criteria?: string[];
  scope?: string[];
  owned_paths?: string[];
  risk?: TaskRisk;
  side_effects?: TaskSideEffect[];
  evidence_requirements?: TaskEvidenceRequirement[];
  testability?: TaskTestability;
  test_strategy?: Array<"unit" | "integration" | "e2e" | "manual" | "contract">;
  human_required?: boolean;
  expected_duration?: string;
  estimated_cost?: string;
  external_dependencies?: string[];
  /** Lineage for replacement (not retry) */
  parent_task_id?: string;
  replacement_reason?: string;
  task_version?: number;
  notes?: string;
}

export interface CoverageJustification {
  requirement_id?: string;
  component_id?: string;
  reason: "architecture-only" | "already-satisfied" | "out-of-implementation-scope" | "external" | "existing-no-change";
  note?: string;
}

export interface EngineeringTaskGraph {
  kind: "EngineeringTaskGraph";
  apiVersion: "evolveloop.io/se/v1";
  task_graph_id: string;
  version: number;
  parent_version?: number;
  parent_graph_id?: string;
  replan_reason?: string;
  decision_id?: string;
  project?: string;
  title?: string;
  requirements_reference: {
    requirements_id: string;
    requirements_version: number;
  };
  architecture_reference: {
    architecture_id: string;
    architecture_version: number;
  };
  tasks: EngineeringTask[];
  coverage_justifications?: CoverageJustification[];
  derived?: {
    node_count?: number;
    edge_count?: number;
    parallelizable_groups?: string[][];
    critical_path?: string[];
    risk_summary?: Record<string, number>;
    coverage_summary?: {
      must_requirements: number;
      covered_must: number;
      components: number;
      covered_components: number;
    };
  };
  created_at: string;
  baseline?: boolean;
  baseline_at?: string;
  artifact_id?: string;
}

export interface TaskGraphChangeSet {
  from_version: number;
  to_version: number;
  added: string[];
  removed: string[];
  modified: string[];
  dependency_changed: string[];
  capability_changed: string[];
  scope_changed: string[];
}

export interface TaskGraphValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  task_id?: string;
  requirement_id?: string;
  component_id?: string;
}

export interface TaskGraphValidationResult {
  ok: boolean;
  health: TaskGraphHealth;
  errors: TaskGraphValidationIssue[];
  warnings: TaskGraphValidationIssue[];
  unmapped_must: string[];
  unimplemented_components: string[];
}

export interface TaskGraphExtractionInput {
  requirements: import("../requirements/types.js").RequirementsSpec;
  architecture: import("../architecture/types.js").ArchitectureSpec;
  task_graph_id?: string;
  project?: string;
  prior?: EngineeringTaskGraph;
  known_capabilities?: string[];
  allow_warnings_as_ready?: boolean;
}

/** Future PlanEmitter mapping hints — not CapabilityIR itself */
export interface TaskToIrMappingHint {
  task_id: string;
  /** Maps to IRNode.capability candidates */
  capabilities: string[];
  dependencies: string[];
  definition_of_done: string[];
  scope?: string[];
  requirement_ids: string[];
}
