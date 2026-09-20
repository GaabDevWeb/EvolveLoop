/**
 * AgentContextAssembler — builds least-privilege AgentExecutionRequest.
 */

import { randomUUID } from "node:crypto";
import type {
  AgentDecisionMode,
  AgentExecutionRequest,
  CapabilityMeta,
  EvidenceRef,
  FailureContextSummary,
  KnowledgeRef,
  PlanNodeSummary,
  PolicySummary,
  ProviderMeta,
  ResourceBudgetSummary,
  WorkspaceAuthoritySummary,
} from "./types.js";
import { redactForbiddenKeys } from "./context-safety.js";

export interface AssembleAgentContextInput {
  execution_id: string;
  task_id: string;
  attempt?: number;
  agent_id: string;
  agent_version?: string;
  role?: string;
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
  prompt_version?: string;
  /** Rejected if contains forbidden keys after redaction still present in objective bags */
  extra?: Record<string, unknown>;
}

export function assembleAgentExecutionRequest(
  input: AssembleAgentContextInput,
): AgentExecutionRequest {
  const base: AgentExecutionRequest = {
    request_id: randomUUID(),
    execution_id: input.execution_id,
    task_id: input.task_id,
    attempt: input.attempt ?? 0,
    agent_id: input.agent_id,
    agent_version: input.agent_version ?? "0.1.0",
    role: input.role ?? "planner",
    objective: input.objective,
    decision_mode: input.decision_mode,
    policy_summary: input.policy_summary,
    workspace_authority_summary: input.workspace_authority_summary,
    resource_budget_summary: input.resource_budget_summary,
    failure_context: input.failure_context,
    current_plan_summary: input.current_plan_summary,
    relevant_evidence_refs: input.relevant_evidence_refs,
    relevant_knowledge_refs: input.relevant_knowledge_refs,
    available_capabilities: input.available_capabilities,
    available_providers: input.available_providers,
    previous_decision_ids: input.previous_decision_ids,
    prompt_version: input.prompt_version ?? "agent-v1",
    schema_id: "agent-decision/v1",
  };
  // Redact any accidental sensitive nested fields
  return redactForbiddenKeys(base);
}
