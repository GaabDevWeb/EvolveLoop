/**
 * SE-01 Requirements Contract — operational requirements (not PRD prose).
 * LLM proposes; Runtime validates / versions / persists.
 */

export type RequirementType =
  | "FUNCTIONAL"
  | "NON_FUNCTIONAL"
  | "CONSTRAINT"
  | "SECURITY"
  | "DATA"
  | "INTEGRATION"
  | "UI"
  | "API"
  | "PERFORMANCE"
  | "OPERATIONAL"
  | "NEGATIVE"
  | "TECHNICAL_CONSTRAINT"
  | "TECHNICAL_PROPOSAL";

export type RequirementPriority = "MUST" | "SHOULD" | "COULD" | "OUT_OF_SCOPE" | "MUST_NOT" | "SHOULD_NOT";

export type RequirementStatus =
  | "PROPOSED"
  | "ACCEPTED"
  | "CLARIFICATION_REQUIRED"
  | "REJECTED"
  | "DEFERRED"
  | "AMBIGUOUS"
  | "DUPLICATE_CANDIDATE";

export type RequirementTestability =
  | "AUTOMATABLE"
  | "PARTIALLY_AUTOMATABLE"
  | "HUMAN_VALIDATION"
  | "NOT_YET_TESTABLE";

export type RequirementSourceType =
  | "PRD"
  | "BRIEF"
  | "USER_CLARIFICATION"
  | "CONSTRAINT"
  | "ARCHITECTURE_DECISION"
  | "INFERENCE"
  | "ASSUMPTION"
  | "KNOWLEDGE";

export type OpenQuestionPriority = "BLOCKING" | "HIGH" | "MEDIUM" | "LOW";

export type RequirementsReadiness =
  | "READY"
  | "NOT_READY"
  | "READY_WITH_ASSUMPTIONS"
  | "HUMAN_REQUIRED";

export interface RequirementSource {
  type: RequirementSourceType;
  reference?: string;
  artifact_id?: string;
  section?: string;
  knowledge_id?: string;
  /** True when agent inferred rather than user-stated */
  generated?: boolean;
}

export interface RequirementAssumption {
  assumption_id: string;
  statement: string;
  reason?: string;
  source?: RequirementSource;
  risk?: "low" | "medium" | "high";
  confidence?: number;
  /** Linked requirement if assumption backs one */
  requirement_id?: string;
}

export interface OpenQuestion {
  question_id: string;
  text: string;
  priority: OpenQuestionPriority;
  related_requirement_ids?: string[];
}

export interface RequirementConflict {
  conflict_id: string;
  requirement_ids: string[];
  description: string;
  code: "REQUIREMENT_CONFLICT";
}

export interface RequirementDuplicate {
  group_id: string;
  requirement_ids: string[];
  reason: string;
  code: "DUPLICATE_CANDIDATE";
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: RequirementSource;
  acceptance_criteria?: string[];
  dependencies?: string[];
  tags?: string[];
  risk?: "low" | "medium" | "high";
  testability?: RequirementTestability;
  /** Content fingerprint — not human identity */
  requirement_hash?: string;
  intent_id?: string;
  notes?: string;
}

/** Explicit constraint (often TECHNICAL_CONSTRAINT items also listed here for handoff). */
export interface RequirementConstraint {
  constraint_id: string;
  statement: string;
  source: RequirementSource;
  related_requirement_ids?: string[];
}

export interface OutOfScopeItem {
  id: string;
  statement: string;
  source?: RequirementSource;
}

export interface RequirementsSpec {
  kind: "RequirementsSpec";
  apiVersion: "evolveloop.io/se/v1";
  requirements_id: string;
  version: number;
  parent_version?: number;
  project?: string;
  title?: string;
  source?: {
    brief?: string;
    prd_ref?: string;
    intent_id?: string;
  };
  project_scope?: {
    in_scope?: string[];
    out_of_scope?: string[];
  };
  requirements: Requirement[];
  constraints: RequirementConstraint[];
  assumptions: RequirementAssumption[];
  open_questions: OpenQuestion[];
  out_of_scope: OutOfScopeItem[];
  conflicts?: RequirementConflict[];
  duplicates?: RequirementDuplicate[];
  created_at: string;
  /** Set when accepted as immutable baseline */
  baseline?: boolean;
  baseline_at?: string;
  /** Artifact id after persistence */
  artifact_id?: string;
}

export interface RequirementsChangeSet {
  from_version: number;
  to_version: number;
  added: string[];
  removed: string[];
  modified: string[];
  status_changed: Array<{ id: string; from: RequirementStatus; to: RequirementStatus }>;
}

export interface RequirementsValidationIssue {
  code: string;
  message: string;
  requirement_id?: string;
  severity: "error" | "warning";
}

export interface RequirementsValidationResult {
  ok: boolean;
  readiness: RequirementsReadiness;
  errors: RequirementsValidationIssue[];
  warnings: RequirementsValidationIssue[];
  conflicts: RequirementConflict[];
  duplicates: RequirementDuplicate[];
}

export interface RequirementsExtractionInput {
  brief?: string;
  prd?: string;
  constraints?: string[];
  workspace_summary?: string;
  project?: string;
  requirements_id?: string;
  intent_id?: string;
  /** Prior baseline for versioning */
  prior?: RequirementsSpec;
}
