/**
 * SE-04 Supervisor / Agent Delegation — contracts.
 * Supervisor distributes work; Agent reasons; Runtime executes.
 * Agent never gains Provider/Capability/Policy authority.
 */

import type { EngineeringTask, EngineeringTaskGraph } from "../tasks/types.js";
import type { AgentDecision, AgentDecisionType, CapabilityMeta, PolicySummary } from "../agent/types.js";

export type AssignmentStatus =
  | "PENDING"
  | "CLAIMED"
  | "RUNNING"
  | "WAITING_RUNTIME"
  | "SUCCEEDED"
  | "FAILED"
  | "BLOCKED"
  | "CANCELLED"
  | "RECOVERING";

/** Engineering task runtime overlay — not CapabilityGraph node state */
export type TaskRuntimeStatus =
  | "PENDING"
  | "READY"
  | "CLAIMED"
  | "IN_PROGRESS"
  | "WAITING_RUNTIME"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "SKIPPED";

export type DelegationOutcomeKind =
  | "DECISION_PRODUCED"
  | "NEEDS_EXECUTION"
  | "BLOCKED"
  | "FAILED"
  | "INVALID"
  | "REQUIRES_REPLAN"
  | "WAITING_CONFIRMATION";

export interface AgentContract {
  agent_id: string;
  agent_version: string;
  role: string;
  compatible_roles?: string[];
  allowed_capabilities: string[];
  forbidden_capabilities?: string[];
  max_concurrent_assignments?: number;
  available?: boolean;
}

export interface AgentAssignment {
  kind: "AgentAssignment";
  apiVersion: "evolveloop.io/se/v1";
  assignment_id: string;
  task_id: string;
  task_graph_id: string;
  task_graph_version: number;
  agent_id: string;
  agent_version: string;
  role: string;
  status: AssignmentStatus;
  scope: string[];
  required_capabilities: string[];
  policy_reference: string;
  parent_execution_id?: string;
  execution_id?: string;
  decision_id?: string;
  delegation_attempt: number;
  supervisor_id: string;
  lease_until?: string;
  created_at: string;
  claimed_at?: string;
  started_at?: string;
  completed_at?: string;
  lineage?: {
    parent_assignment_id?: string;
    replan_id?: string;
    task_graph_parent_version?: number;
  };
  failure_code?: string;
  failure_message?: string;
  result_fingerprint?: string;
}

export interface DelegationRequest {
  kind: "DelegationRequest";
  apiVersion: "evolveloop.io/se/v1";
  assignment_id: string;
  task_id: string;
  task_graph_id: string;
  task_graph_version: number;
  agent_id: string;
  agent_version: string;
  role: string;
  objective: string;
  requirement_ids: string[];
  architecture_component_ids?: string[];
  allowed_capabilities: CapabilityMeta[];
  forbidden_capabilities: string[];
  task_scope: string[];
  owned_paths?: string[];
  inputs?: Array<{ ref: string; type?: string }>;
  expected_outputs?: Array<{ ref: string; type?: string }>;
  acceptance_criteria?: string[];
  definition_of_done: string[];
  constraints?: string[];
  risk?: string;
  side_effects?: string[];
  satisfied_dependencies: string[];
  policy_summary: PolicySummary;
  evidence_requirements?: Array<{ kind: string; description: string }>;
  correlation: {
    run_id: string;
    execution_id: string;
    assignment_id: string;
    task_id: string;
  };
  /** Explicit: no secrets, no other-task context */
  context_authority: "none";
}

export interface DelegationResult {
  kind: "DelegationResult";
  apiVersion: "evolveloop.io/se/v1";
  assignment_id: string;
  task_id: string;
  outcome: DelegationOutcomeKind;
  decision?: AgentDecision;
  decision_id?: string;
  execution_id?: string;
  validation_ok: boolean;
  validation_errors?: string[];
  runtime_effect?: {
    attempted: boolean;
    allowed: boolean;
    gate_decision?: string;
    provider_invoked: boolean;
    success?: boolean;
    evidence_refs?: string[];
  };
  message?: string;
  produced_at: string;
  fingerprint: string;
}

export interface TaskRuntimeRecord {
  task_id: string;
  status: TaskRuntimeStatus;
  assignment_id?: string;
  completed_assignment_ids?: string[];
  last_execution_id?: string;
  last_decision_id?: string;
  updated_at: string;
}

export interface SupervisorState {
  kind: "SupervisorState";
  apiVersion: "evolveloop.io/se/v1";
  task_graph_id: string;
  task_graph_version: number;
  supervisor_id: string;
  tasks: Record<string, TaskRuntimeRecord>;
  assignments: Record<string, AgentAssignment>;
  completed_result_fingerprints: string[];
  max_parallel_assignments: number;
  updated_at: string;
}

export interface RuntimeBridgeRequest {
  assignment: AgentAssignment;
  delegation: DelegationRequest;
  decision: AgentDecision;
  execution_id: string;
  plan_hash?: string;
  confirmed_for_plan_hash?: string;
}

export interface RuntimeBridgeResult {
  ok: boolean;
  gate_decision: "ALLOW" | "DENY" | "CONFIRMATION_REQUIRED" | "DEFERRED" | "SKIPPED";
  provider_invoked: boolean;
  success?: boolean;
  evidence_refs?: string[];
  error_code?: string;
  error_message?: string;
  /** True only when Runtime actually performed an effect via ExecutionEngine/Provider */
  effect_observed?: boolean;
}

/**
 * Runtime bridge — ONLY path from validated AgentDecision to effects.
 * Supervisor must not call Providers directly.
 */
export interface RuntimeBridge {
  executeDecision(req: RuntimeBridgeRequest): Promise<RuntimeBridgeResult>;
}

export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  PENDING: ["CLAIMED", "CANCELLED"],
  CLAIMED: ["RUNNING", "CANCELLED", "RECOVERING", "PENDING"],
  RUNNING: ["WAITING_RUNTIME", "SUCCEEDED", "FAILED", "BLOCKED", "RECOVERING"],
  WAITING_RUNTIME: ["SUCCEEDED", "FAILED", "BLOCKED", "RUNNING", "RECOVERING"],
  SUCCEEDED: [],
  FAILED: ["PENDING"], // redelegation only via new attempt / new assignment
  BLOCKED: ["PENDING", "CANCELLED"],
  CANCELLED: [],
  RECOVERING: ["CLAIMED", "RUNNING", "WAITING_RUNTIME", "FAILED", "CANCELLED"],
};

/** Engineering decision types added in SE-04 (non-duplicating SE-01..03) */
export type EngineeringDecisionType =
  | "IMPLEMENTATION_PROPOSAL"
  | "TEST_PROPOSAL"
  | "REVIEW_PROPOSAL"
  | "VALIDATION_PROPOSAL"
  | "TASK_BLOCKED"
  | "REPLAN_REQUEST";

export type SupervisorDecisionType = AgentDecisionType | EngineeringDecisionType;

export interface ActionableProposal {
  capability: string;
  inputs?: Record<string, string>;
  reason?: string;
  /** Must match assignment task scope paths when writing */
  paths?: string[];
}

export type { EngineeringTask, EngineeringTaskGraph };
