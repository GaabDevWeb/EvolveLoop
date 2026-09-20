/**
 * SE-02 Architecture Contract — HOW (not WHAT).
 * RequirementsSpec remains authority over what must be satisfied.
 * LLM proposes; Runtime validates / versions / persists.
 */

export type ArchitectureLayer =
  | "System"
  | "Application"
  | "Domain"
  | "Data"
  | "Infrastructure"
  | "Integration"
  | "Security"
  | "Observability"
  | "Testing"
  | "Deployment";

export type ArchitectureSourceType =
  | "REQUIREMENTS"
  | "CONSTRAINT"
  | "EXISTING_REPOSITORY"
  | "EXISTING_ARCHITECTURE"
  | "TECHNICAL_STANDARD"
  | "USER_PREFERENCE"
  | "EXPLICIT_DECISION"
  | "ARCHITECTURAL_PROPOSAL"
  | "KNOWLEDGE"
  | "INFERENCE";

export type ComponentOrigin = "EXISTING" | "PROPOSED";

export type ArchitectureReadiness =
  | "READY"
  | "READY_WITH_ASSUMPTIONS"
  | "BLOCKED"
  | "INVALID";

export type OpenQuestionPriority = "BLOCKING" | "HIGH" | "MEDIUM" | "LOW";

export type TechChoiceKind = "CONSTRAINT" | "ARCHITECTURAL_PROPOSAL";

export type ArchitectureDeltaOp = "add" | "modify" | "remove" | "replace" | "migrate";

export interface ArchitectureSource {
  type: ArchitectureSourceType;
  reference?: string;
  knowledge_id?: string;
  generated?: boolean;
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  layer?: ArchitectureLayer;
  responsibility: string;
  non_responsibilities?: string[];
  inputs?: string[];
  outputs?: string[];
  /** Component ids this depends on */
  dependencies?: string[];
  interfaces?: string[];
  technology?: string[];
  requirement_ids?: string[];
  origin: ComponentOrigin;
  existing_path?: string;
  risk?: "low" | "medium" | "high";
  dod_hints?: string[];
}

export interface ArchitectureInterface {
  interface_id: string;
  name?: string;
  provider: string;
  consumer: string;
  protocol: string;
  input?: string;
  output?: string;
  errors?: string[];
  authentication?: string;
  version?: string;
}

export interface ApiEndpointSketch {
  endpoint: string;
  method: string;
  request?: string;
  response?: string;
  errors?: string[];
  auth?: string;
  versioning?: string;
  idempotency?: string;
}

export interface DataEntity {
  name: string;
  owned_by: string;
  readers?: string[];
  writers?: string[];
  fields?: string[];
  relationships?: string[];
}

export interface DataModel {
  entities?: DataEntity[];
  persistence?: string;
  migration_strategy?: string;
  consistency?: string;
}

export interface TechnologyChoice {
  technology_id: string;
  name: string;
  kind: TechChoiceKind;
  purpose: string;
  justified: boolean;
  source: ArchitectureSource;
  related_requirement_ids?: string[];
  related_decision_ids?: string[];
}

export interface ArchitectureDecision {
  decision_id: string;
  title: string;
  statement: string;
  chosen: string;
  alternatives?: Array<{ option: string; reason_rejected?: string }>;
  tradeoffs?: { benefit?: string; cost?: string; risk?: string; consequence?: string };
  reason: string;
  source: ArchitectureSource;
  requirement_ids?: string[];
  component_ids?: string[];
  risk?: "low" | "medium" | "high";
  mitigation?: string;
}

export interface ArchitectureAssumption {
  assumption_id: string;
  statement: string;
  reason?: string;
  source?: ArchitectureSource;
  risk?: "low" | "medium" | "high";
  impact?: string;
}

export interface ArchitectureOpenQuestion {
  question_id: string;
  text: string;
  priority: OpenQuestionPriority;
  related_requirement_ids?: string[];
  related_component_ids?: string[];
}

export interface ArchitectureRisk {
  risk_id: string;
  statement: string;
  impact?: string;
  mitigation?: string;
  related_decision_ids?: string[];
}

export interface NfrResponse {
  nfr_id: string;
  requirement_id?: string;
  quality: string;
  architecture_response: string;
  component_ids?: string[];
  decision_ids?: string[];
}

export interface TraceabilityLink {
  requirement_id: string;
  component_ids?: string[];
  decision_ids?: string[];
  interface_ids?: string[];
  nfr_ids?: string[];
}

export interface ArchitectureDeltaItem {
  op: ArchitectureDeltaOp;
  target_id: string;
  kind: "component" | "interface" | "decision" | "technology";
  note?: string;
}

export interface ArchitectureFeedback {
  feedback_id: string;
  requirement_id: string;
  issue: string;
  impact?: string;
  proposal?: string;
  blocking?: boolean;
}

export interface TrustBoundary {
  boundary_id: string;
  from: string;
  to: string;
  controls?: string[];
}

export interface ArchitectureSpec {
  kind: "ArchitectureSpec";
  apiVersion: "evolveloop.io/se/v1";
  architecture_id: string;
  version: number;
  parent_version?: number;
  project?: string;
  title?: string;
  overview?: string;
  principles?: string[];
  /** Mandatory binding to requirements baseline */
  requirements_reference: {
    requirements_id: string;
    requirements_version: number;
  };
  field_context?: "greenfield" | "brownfield";
  layers_present?: ArchitectureLayer[];
  components: ArchitectureComponent[];
  interfaces: ArchitectureInterface[];
  api_contracts?: ApiEndpointSketch[];
  data_model?: DataModel;
  technology_choices: TechnologyChoice[];
  decisions: ArchitectureDecision[];
  assumptions: ArchitectureAssumption[];
  open_questions: ArchitectureOpenQuestion[];
  risks: ArchitectureRisk[];
  nfr_responses?: NfrResponse[];
  traceability: TraceabilityLink[];
  security?: {
    authentication?: string;
    authorization?: string;
    trust_boundaries?: TrustBoundary[];
    secret_handling?: string;
    audit_logging?: string;
  };
  observability?: {
    logs?: string;
    metrics?: string;
    traces?: string;
    audit_events?: string;
    evidence?: string;
  };
  testing_strategy?: {
    unit?: string;
    integration?: string;
    e2e?: string;
    contract?: string;
    security?: string;
    performance?: string;
  };
  deployment?: {
    model?: string;
    environments?: string[];
  };
  architecture_delta?: ArchitectureDeltaItem[];
  feedback?: ArchitectureFeedback[];
  created_at: string;
  baseline?: boolean;
  baseline_at?: string;
  artifact_id?: string;
}

export interface ArchitectureChangeSet {
  from_version: number;
  to_version: number;
  components_added: string[];
  components_removed: string[];
  interfaces_changed: string[];
  technologies_changed: string[];
  decisions_changed: string[];
  requirements_impact?: string[];
}

export interface ArchitectureValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  component_id?: string;
  requirement_id?: string;
  interface_id?: string;
}

export interface ArchitectureValidationResult {
  ok: boolean;
  readiness: ArchitectureReadiness;
  errors: ArchitectureValidationIssue[];
  warnings: ArchitectureValidationIssue[];
  unmapped_must: string[];
}

export interface ArchitectureExtractionInput {
  requirements: import("../requirements/types.js").RequirementsSpec;
  architecture_id?: string;
  project?: string;
  existing_paths?: string[];
  prior?: ArchitectureSpec;
  /** Policy allows READY_WITH_ASSUMPTIONS baseline */
  allow_assumptions?: boolean;
  /** Allow cycles (document exception) */
  allow_cycles?: boolean;
}
