/**
 * Agent contracts — proposals only. Never ExecutionResult / CapabilityProvider effects.
 * See V2-AGENT-CONTRACTS.md / ADR-AGENT-RUNTIME-BOUNDARY.md
 */

import type { StructuredIntent } from "../planning/structured-intent.js";
import type { CapabilityIR } from "../types/index.js";

export type AgentDecisionMode =
  | "PLAN"
  | "REPLAN"
  | "DELEGATE"
  | "ANSWER"
  | "REPAIR"
  | "REQUIREMENTS"
  | "ARCHITECTURE"
  | "TASK_GRAPH";

export type AgentDecisionType =
  | "PLAN_PROPOSAL"
  | "ACTION_PROPOSAL"
  | "REPLAN_PROPOSAL"
  | "REQUIREMENTS_PROPOSAL"
  | "ARCHITECTURE_PROPOSAL"
  | "TASK_GRAPH_PROPOSAL"
  | "NEED_INFORMATION"
  | "NEED_CONFIRMATION"
  | "FINAL_RESPONSE"
  | "DELEGATION_PROPOSAL"
  | "AGENT_UNABLE"
  | "FAILURE";

export type ReasoningErrorCode =
  | "REASONING_PROVIDER_UNAVAILABLE"
  | "REASONING_TIMEOUT"
  | "REASONING_MALFORMED_OUTPUT"
  | "REASONING_SCHEMA_ERROR"
  | "REASONING_CONTEXT_TOO_LARGE"
  | "REASONING_REFUSED"
  | "REASONING_SEMANTIC_ERROR"
  | "AGENT_EXECUTOR_UNAVAILABLE";

export interface PolicySummary {
  policy_id: string;
  policy_version?: string;
  fail_fast?: boolean;
  max_replans?: number;
  max_iterations?: number;
  risk_flags?: string[];
}

export interface WorkspaceAuthoritySummary {
  workspace_roots?: string[];
  allow_write?: boolean;
  allow_shell?: boolean;
  allow_network?: boolean;
}

export interface ResourceBudgetSummary {
  remaining_iterations?: number;
  remaining_replans?: number;
  remaining_tokens?: number;
  remaining_feature_ms?: number;
}

export interface CapabilityMeta {
  capability_id: string;
  description?: string;
  input_schema_hint?: string[];
  risk?: "low" | "medium" | "high";
  /** Availability ≠ authorization */
  available?: boolean;
}

export interface ProviderMeta {
  provider_id: string;
  cost_tier?: "low" | "medium" | "high";
  availability?: string;
}

export interface EvidenceRef {
  evidence_id: string;
  source?: string;
  summary?: string;
  status?: string;
}

export interface KnowledgeRef {
  knowledge_id: string;
  summary?: string;
  provenance?: string;
}

export interface FailureContextSummary {
  failure_class?: string;
  error_code?: string;
  failed_capability?: string;
  failed_node_id?: string;
  failed_provider_id?: string;
  disposition?: string;
}

export interface PlanNodeSummary {
  id: string;
  capability: string;
  status?: string;
}

/** Least-privilege context for one reasoning turn. No secrets. */
export interface AgentExecutionRequest {
  request_id: string;
  execution_id: string;
  task_id: string;
  attempt: number;
  agent_id: string;
  agent_version: string;
  role: string;
  objective: string;
  decision_mode: AgentDecisionMode;
  policy_summary: PolicySummary;
  workspace_authority_summary?: WorkspaceAuthoritySummary;
  resource_budget_summary?: ResourceBudgetSummary;
  failure_context?: FailureContextSummary;
  current_plan_summary?: PlanNodeSummary[];
  relevant_evidence_refs?: EvidenceRef[];
  relevant_knowledge_refs?: KnowledgeRef[];
  available_capabilities?: CapabilityMeta[];
  available_providers?: ProviderMeta[];
  previous_decision_ids?: string[];
  schema_id?: string;
  prompt_version?: string;
}

export interface ActionProposal {
  capability: string;
  inputs?: Record<string, string>;
  reason?: string;
  references?: string[];
}

export interface AgentDecisionBase {
  decision_id: string;
  decision_type: AgentDecisionType;
  reason: string;
  confidence?: number;
  references?: string[];
}

export type AgentDecision =
  | (AgentDecisionBase & {
      decision_type: "PLAN_PROPOSAL";
      /** Semantic intent — PlanEmitter converts to IR */
      proposed_intent: StructuredIntent;
    })
  | (AgentDecisionBase & {
      decision_type: "ACTION_PROPOSAL";
      proposed_actions: ActionProposal[];
    })
  | (AgentDecisionBase & {
      decision_type: "REPLAN_PROPOSAL";
      /** Prefer intent; optional prebuilt IR for tests */
      proposed_intent?: StructuredIntent;
      candidate_ir?: CapabilityIR;
      replan_strategy?: string;
    })
  | (AgentDecisionBase & {
      decision_type: "NEED_INFORMATION" | "NEED_CONFIRMATION" | "FINAL_RESPONSE" | "AGENT_UNABLE" | "FAILURE";
      details?: string;
    })
  | (AgentDecisionBase & {
      decision_type: "DELEGATION_PROPOSAL";
      target_agent_id: string;
      delegated_task_id?: string;
    })
  | (AgentDecisionBase & {
      decision_type: "REQUIREMENTS_PROPOSAL";
      /**
       * Structured proposal only — Runtime/RequirementsBuilder validates.
       * Must NOT claim baseline approval or policy changes.
       */
      proposed_requirements_spec: Record<string, unknown>;
    })
  | (AgentDecisionBase & {
      decision_type: "ARCHITECTURE_PROPOSAL";
      /**
       * Structured architecture proposal — Runtime/ArchitectureBuilder validates.
       * Must NOT claim baseline, mutate RequirementsSpec, or authorize execution.
       */
      proposed_architecture_spec: Record<string, unknown>;
    })
  | (AgentDecisionBase & {
      decision_type: "TASK_GRAPH_PROPOSAL";
      /**
       * Structured task graph proposal — Runtime/TaskGraphBuilder validates.
       * Does NOT authorize execution (A03/B01 remain sovereign).
       */
      proposed_task_graph: Record<string, unknown>;
    });

export interface ReasoningUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  /** When provider did not report tokens */
  tokens_unknown?: boolean;
}

export interface AgentExecutionResult {
  success: boolean;
  decision?: AgentDecision;
  decision_id?: string;
  provider_id?: string;
  model_id?: string;
  model_version?: string;
  agent_id: string;
  agent_version: string;
  duration_ms: number;
  usage?: ReasoningUsage;
  error?: { code: ReasoningErrorCode | string; message: string };
  references?: string[];
  prompt_version?: string;
  schema_version?: string;
}

export interface ReasoningRequest {
  request_id: string;
  execution_id: string;
  agent_id: string;
  objective: string;
  decision_mode: AgentDecisionMode;
  /** Sanitized payload — never secrets */
  context: Record<string, unknown>;
  schema_id?: string;
  prompt_version?: string;
}

export interface ReasoningResponse {
  ok: boolean;
  /** Raw structured object (not vendor SDK types) */
  payload?: unknown;
  provider_id: string;
  model_id?: string;
  model_version?: string;
  duration_ms: number;
  usage?: ReasoningUsage;
  error?: { code: ReasoningErrorCode | string; message: string };
}

export interface ReasoningProvider {
  readonly id: string;
  invoke(request: ReasoningRequest): Promise<ReasoningResponse>;
}

export interface AgentExecutor {
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
}

/** Forbidden key substrings for context leakage guard (not matching *tokens* budget fields) */
export const FORBIDDEN_CONTEXT_KEY_PATTERN =
  /(api[_-]?key|password|secret|credential|private[_-]?key|authorization|access[_-]?token|auth[_-]?token|bearer[_-]?token)/i;
