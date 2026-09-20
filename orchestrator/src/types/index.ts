/** Core types — aligned with specs/interfaces.md */

export type NodeStatus =
  | "pending"
  | "ready"
  | "running"
  | "waiting"
  | "satisfied"
  | "failed"
  | "blocked"
  | "skipped"
  | "cancelled";

export type FeatureRunState =
  | "created"
  | "active"
  | "blocked"
  | "completed"
  | "cancelled";

export type EvidenceEmitter =
  | "planner"
  | "scheduler"
  | "registry"
  | "worker"
  | "gate"
  | "executor";

export type NodeType = "worker" | "gate";

export type OrchestratorDecision = "continuar" | "corrigir" | "replan";

export type ProviderStrategy =
  | "stable"
  | "highest_quality"
  | "fastest"
  | "cheapest"
  | "experimental"
  | "priority";

export type EventSource =
  | "scheduler"
  | "orchestrator"
  | "provider"
  | "planner"
  | "engine"
  | "agent";

export type EventType =
  | "FeatureStarted"
  | "FeatureCompleted"
  | "FeatureBlocked"
  | "FeatureAborted"
  | "NodeScheduled"
  | "NodeStarted"
  | "NodeCompleted"
  | "NodeFailed"
  | "RetryScheduled"
  | "NodeSkipped"
  | "GatePassed"
  | "GateRejected"
  | "GateSkipped"
  | "GateEvaluated"
  | "GateAllowed"
  | "GateDenied"
  | "GateConfirmationRequired"
  | "PolicyDenied"
  | "AuthorizationDenied"
  | "SubgraphInvalidated"
  | "PhaseGateReached"
  | "PlannerReplan"
  | "ReplanRequested"
  | "ReplanProposed"
  | "ReplanRejected"
  | "ReplanApplied"
  | "ReplanExhausted"
  | "ProviderSelected"
  | "ProviderFallbackUsed"
  | "ProviderFallbackExhausted"
  | "RetryBudgetExceeded"
  | "ReplanBudgetExceeded"
  | "ExecutionTimeout"
  | "BudgetExceeded"
  | "CostBudgetExceeded"
  | "FailFastTriggered"
  | "ConcurrencyLimited"
  | "ProviderDiscoveryStarted"
  | "ProviderDiscoveryCompleted"
  | "SkillLifecycle"
  | "KnowledgeHit"
  | "KnowledgeProposed"
  | "MemoryWritten"
  | "OrchestratorDecision"
  | "RecoveryStarted"
  | "CheckpointLoaded"
  | "CheckpointRejected"
  | "CheckpointSaved"
  | "ExecutionReconciled"
  | "NodeRecovered"
  | "JobLeaseExpired"
  | "ExecutionResumed"
  | "RecoveryFailed"
  | "RecoveryClaimed"
  | "AgentInvocationStarted"
  | "AgentDecisionProduced"
  | "AgentInvocationFailed"
  | "RequirementsExtractionStarted"
  | "RequirementsProposalProduced"
  | "RequirementsValidationFailed"
  | "RequirementsBaselineCreated"
  | "RequirementsVersionCreated"
  | "ArchitectureGenerationStarted"
  | "ArchitectureProposalProduced"
  | "ArchitectureValidationFailed"
  | "ArchitectureBaselineCreated"
  | "ArchitectureVersionCreated"
  | "TaskGraphGenerationStarted"
  | "TaskGraphProposalProduced"
  | "TaskGraphValidationFailed"
  | "TaskGraphBaselineCreated"
  | "TaskGraphVersionCreated"
  | "DelegationCreated"
  | "DelegationClaimed"
  | "AgentStarted"
  | "AgentDecisionReceived"
  | "DecisionValidated"
  | "RuntimeExecutionStarted"
  | "RuntimeExecutionCompleted"
  | "DelegationSucceeded"
  | "DelegationFailed"
  | "DelegationBlocked"
  | "DelegationReplanRequested"
  | "DelegationRecovered"
  | "ImplementationProposed"
  | "ImplementationValidated"
  | "WorkspaceChangeStarted"
  | "WorkspaceChangeCompleted"
  | "TestExecutionStarted"
  | "TestExecutionCompleted"
  | "ValidationStarted"
  | "ValidationCompleted"
  | "RepairStarted"
  | "RepairCompleted"
  | "EngineeringTaskCompleted"
  | "EngineeringTaskFailed"
  | "EngineeringTaskBlocked"
  | "EngineeringTaskRecovered"
  | "ReviewCreated"
  | "ReviewStarted"
  | "ReviewFindingCreated"
  | "ReviewCompleted"
  | "ReviewBlocked"
  | "ReviewRepairRequested"
  | "ReviewReplanRequested"
  | "ReviewRecovered"
  | "ReviewInvalidated";

export interface DoDCheck {
  id: string;
  check: string;
  verification: "manual" | "automated" | "evidence";
}

export interface IRInput {
  ref: string;
  schema?: string;
}

export interface IROutput {
  id: string;
  path: string;
  schema?: string;
}

export interface IRGateConfig {
  on_reject?: "invalidate_downstream";
  verdict_required?: boolean;
  isolation?: boolean;
}

export interface IRNode {
  id: string;
  capability: string;
  capability_version?: string;
  type: NodeType;
  inputs?: IRInput[];
  outputs?: IROutput[];
  dependencies: string[];
  definition_of_done: DoDCheck[];
  constraints?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  gate?: IRGateConfig;
}

export interface CapabilityIR {
  apiVersion: string;
  kind: "CapabilityGraph";
  metadata: {
    id: string;
    feature?: string;
    ir_version: string;
    policy_ref?: string;
    supersedes?: string;
    replan_reason?: string;
    created_at?: string;
    planner_version?: string;
    /** V2 correlation — StructuredIntent.id */
    intent_id?: string;
    /** V2 correlation — shared across planning evidence + run */
    execution_id?: string;
    /** V2 A04 plan lineage */
    plan_version?: number;
    parent_plan_id?: string;
    replan_id?: string;
    plan_hash?: string;
    /** V2 AgentExecutor lineage — decision_id → plan_id → execution_id */
    decision_id?: string;
    agent_id?: string;
    agent_version?: string;
  };
  spec: {
    nodes: IRNode[];
    edges?: Array<{ from: string; to: string; type?: string }>;
    global_inputs?: Array<{ id: string; source?: string }>;
    global_outputs?: Array<{ id: string; path?: string }>;
    assumptions?: string[];
    out_of_scope?: string[];
  };
}

export interface GraphNode extends IRNode {
  status: NodeStatus;
  retry_count: number;
  provider_id?: string;
  run_id?: string;
  evidence?: Evidence;
}

export interface GraphSnapshot {
  feature_id: string;
  nodes: GraphNode[];
}

export interface EvidenceCheck {
  dod_id: string;
  result: "pass" | "fail" | "skip" | "manual";
  verification?: string;
  details?: string;
  command?: string;
  exit_code?: number;
}

export interface EvidenceArtifact {
  id?: string;
  path: string;
  type?: string;
  mime?: string;
  checksum?: string;
}

export interface EvidenceFinding {
  id: string;
  severity: "critical" | "major" | "minor";
  description: string;
  location?: string;
  requirement_ref?: string;
}

export type EvidencePayload =
  | {
      type: "planning";
      decomposition_confidence: number;
      unresolved_dependencies: string[];
      critical_path: string[];
      out_of_scope?: string[];
    }
  | {
      type: "scheduling";
      selected_provider: string;
      rejected_providers: Array<{ id: string; reason: string }>;
      strategy: string;
      ready_batch: string[];
      parallelism: number;
      gate_depth?: "fast" | "standard" | "deep";
    }
  | {
      type: "selection";
      capability: string;
      ranking_snapshot: Array<{
        provider_id: string;
        score: number;
        cost: string;
        success_rate: number;
        selected: boolean;
      }>;
      strategy_applied: string;
      constraints_matched: boolean;
      fallback_used?: string;
    }
  | {
      type: "worker";
      artifacts: EvidenceArtifact[];
      checks: EvidenceCheck[];
      side_effects: {
        files_created: string[];
        files_modified: string[];
        commands_run: string[];
      };
    }
  | {
      type: "gate";
      verdict: "passed" | "rejected" | "conditional";
      findings: EvidenceFinding[];
      artifacts: EvidenceArtifact[];
    }
  | {
      type: "execution";
      executor_id: string;
      executor_type: string;
      duration_ms: number;
      retry_count: number;
      timeout_hit: boolean;
      cancelled: boolean;
      logs: Array<{ path: string; excerpt?: string }>;
    }
  | {
      type: "authority";
      decision: "allow" | "deny" | "confirm";
      reason: string;
      capability: string;
      handler_error?: string;
    }
  | {
      type: "retrieval";
      query: string;
      retrieval_method: string;
      hit_count: number;
      degraded?: string | null;
    };

export interface Evidence {
  apiVersion?: string;
  kind?: "Evidence";
  metadata: {
    node_id: string;
    run_id: string;
    emitter?: EvidenceEmitter;
    provider_id: string;
    capability: string;
    submitted_at: string;
  };
  spec: {
    status: "complete" | "partial" | "failed";
    confidence?: number;
    coverage?: number;
    assumptions?: string[];
    known_gaps?: EvidenceFinding[];
    verdict?: "passed" | "rejected" | "conditional" | null;
    artifacts?: EvidenceArtifact[];
    checks: EvidenceCheck[];
    outputs?: Array<{ ref: string; schema?: string; validated?: boolean }>;
    findings?: EvidenceFinding[];
    duration_ms?: number;
    provider_version?: string;
    payload?: EvidencePayload;
  };
}

export interface ExecutionPolicySpec {
  retries: {
    default: number;
    by_capability?: Record<string, number>;
    by_type?: Partial<Record<NodeType, number>>;
  };
  gates: {
    required: string[];
    optional?: string[];
    skipped?: string[];
  };
  provider_strategy: ProviderStrategy;
  provider_strategy_fallback?: ProviderStrategy;
  parallelism: {
    max_parallel: number;
    mode: "async" | "sync";
  };
  timeouts: {
    step_timeout?: string;
    wait_timeout?: string;
    feature_timeout?: string;
  };
  on_gate_reject: "orchestrator" | "auto_retry" | "fail_fast";
  on_evidence_missing: "fail" | "retry";
  /**
   * When true: first node failure is terminal — no retry, no provider fallback, no replan.
   * Does not bypass A03 gates / authority / evidence requirements.
   */
  fail_fast: boolean;
  execution_order: "topological" | "priority_field";
  gate_depth?: "fast" | "standard" | "deep";
  min_confidence?: number;
  cost_budget?: { max_nodes?: number; max_gate_depth?: "fast" | "standard" | "deep" };
  /** Engine loop ceiling (default POLICY_DEFAULTS.MAX_ITERATIONS). */
  max_iterations?: number;
  /** Automatic replan ceiling (default POLICY_DEFAULTS.MAX_REPLANS). */
  max_replans?: number;
  /** Same-capability provider fallback switches after retries exhausted. */
  max_provider_fallbacks?: number;
  /** Observed token usage ceiling; unknown provider usage is not invented. */
  token_budget?: number;
  /**
   * When true (default), replan resets failed node retry_count.
   * Set false to keep retry budget across plan versions.
   */
  reset_retries_on_replan?: boolean;
  knowledge?: {
    consult_before_schedule?: boolean;
    consult_before_provider_select?: boolean;
  };
  memory?: {
    scope: "feature" | "session";
    persist_contextual?: boolean;
  };
  phase_gates?: {
    enabled?: boolean;
    mapping?: Record<string, number>;
  };
}

export interface ExecutionPolicy {
  apiVersion: string;
  kind: "ExecutionPolicy";
  metadata: {
    id: string;
    version: string;
    description?: string;
  };
  spec: ExecutionPolicySpec;
}

export interface ProviderEntry {
  id: string;
  plugin?: string;
  manifest?: string;
  priority: number;
  cost: "low" | "medium" | "high";
  quality_score: number;
  availability: "active" | "deprecated" | "experimental";
  version: string;
  telemetry?: {
    total_runs?: number;
    success_rate?: number;
    average_duration_ms?: number;
    last_success?: string;
    last_failure?: string;
    rework_rate?: number;
  };
  constraints?: Record<string, unknown>;
  fallbacks?: Array<{ id: string; priority: number; quality_score?: number }>;
  modes?: string[];
  contract?: string;
}

export interface CapabilityRegistry {
  apiVersion: string;
  kind: "CapabilityRegistry";
  metadata: { generated_at?: string; generator?: string };
  capabilities: Record<string, { schema_version?: string; providers: ProviderEntry[] }>;
}

export interface ProviderManifest {
  apiVersion: string;
  kind: "Provider";
  metadata: {
    name: string;
    version: string;
    description?: string;
    owner?: string;
    license?: string;
    homepage?: string;
  };
  spec: {
    plugin: {
      type: string;
      entrypoint: string;
      /** V2 A02 — programmatic handler; absence ⇒ EXECUTOR_UNAVAILABLE in autonomous mode */
      autonomous?: {
        type: "node-module";
        module: string;
        export?: string;
      };
    };
    capabilities: Array<{
      id: string;
      contract?: string;
      type: NodeType;
      modes?: Array<{ name: string; default?: boolean; delegates?: unknown }>;
    }>;
    runtime?: {
      cost?: "low" | "medium" | "high";
      subagent_type?: string;
      isolation_required?: boolean;
    };
    runtime_compatibility?: {
      engine?: string;
      evidence?: string;
      scheduler?: string;
      execution?: string;
      executor_types?: string[];
    };
    telemetry?: { key: string };
    availability?: "active" | "deprecated" | "experimental";
    priority?: number;
  };
}

export interface EventEnvelope {
  event_id: string;
  type: EventType;
  timestamp: string;
  feature_id: string;
  source: EventSource;
  correlation_id?: string;
  payload: Record<string, unknown>;
}

export interface AuthorityRuntimeContext {
  confirmed?: boolean;
  allowShell?: boolean;
  allowWrite?: boolean;
  allowNetwork?: boolean;
  workspaceRoot?: string;
}

export interface ExecuteRequest {
  run_id: string;
  node_id: string;
  capability: string;
  mode?: string;
  inputs: IRInput[];
  definition_of_done: DoDCheck[];
  policy: { retries_remaining: number; timeout_ms?: number };
  provider_id?: string;
  executor_type?: string;
  memory_scope: string;
  knowledge_hits: KnowledgeEntry[];
  briefing: string;
  node: GraphNode;
  /** Optional authority flags passed by scheduler/engine */
  authority_context?: AuthorityRuntimeContext;
}

export interface ExecuteResult {
  run_id: string;
  success: boolean;
  evidence?: Evidence;
  error?: { code: string; message: string };
  contextual_learnings?: MemoryEntry[];
  durable_learnings?: ProposedKnowledgeEntry[];
  duration_ms: number;
  provider_id: string;
  executor_id?: string;
  /** Optional observed usage — never invent when absent. */
  usage?: {
    tokens?: number;
    cost_unknown?: boolean;
  };
  execution_meta?: {
    retry_count: number;
    timeout_hit: boolean;
    cancelled: boolean;
  };
}

export interface ExecutorCapabilities {
  isolation: boolean;
  sandbox: boolean;
  streaming: boolean;
  local_retry: boolean;
  heartbeat: boolean;
  async_resume: boolean;
}

export interface SelectResult {
  provider: ProviderEntry;
  evidence: Evidence;
  rejected: Array<{ id: string; reason: string }>;
}

export interface RunHandle {
  run_id: string;
  node_id: string;
  provider_id: string;
  started_at: string;
  promise: Promise<ExecuteResult>;
  cancel: () => void;
}

export interface KnowledgeEntry {
  id: string;
  kind: "pattern" | "pitfall" | "bug" | "decision" | "lesson" | "contract";
  content: string;
  tags?: string[];
  capabilities?: string[];
  confidence?: number;
}

export interface ProposedKnowledgeEntry extends Omit<KnowledgeEntry, "id"> {
  source_node?: string;
}

export interface MemoryEntry {
  timestamp: string;
  source: string;
  type: string;
  content: string;
}

export interface FeatureMetrics {
  feature_id: string;
  success: boolean;
  duration_ms: number;
  total_nodes: number;
  satisfied_nodes: number;
  failed_nodes: number;
  reworked_nodes: number;
  replan_count: number;
  events_total: number;
  capabilities_used: string[];
  providers_used: string[];
}

export interface RunInput {
  ir: CapabilityIR;
  policy_id: string;
  feature_id: string;
  orchestrator_overrides?: Partial<ExecutionPolicySpec>;
  resume?: boolean;
  /** When true with jobsDir: discover+claim+resume without manual feature targeting (CLI). */
  auto_recover?: boolean;
  worker_id?: string;
  wait_for_jobs_ms?: number;
}

export interface RunResult {
  success: boolean;
  finished: boolean;
  state: FeatureRunState;
  blocked_reason?: string;
  metrics: FeatureMetrics;
  graph: GraphSnapshot;
  evidence: Evidence[];
  events: EventEnvelope[];
  decision?: OrchestratorDecision;
}

export interface ProviderRuntime {
  id: string;
  execute(request: ExecuteRequest): Promise<ExecuteResult>;
  cancel(run_id: string): Promise<void>;
  supports(mode?: string): boolean;
}

export interface IRLValidationError {
  code: string;
  message: string;
  node_id?: string;
}
