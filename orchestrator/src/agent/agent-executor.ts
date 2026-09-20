/**
 * AgentExecutor — invokes ReasoningProvider, validates, returns AgentExecutionResult.
 * Does NOT authorize, execute capabilities, or mutate the execution graph.
 */

import type { EventBus } from "../events/event-bus.js";
import { assertNoForbiddenKeys, redactForbiddenKeys } from "./context-safety.js";
import { validateAgentDecisionPayload } from "./validate-decision.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentExecutor,
  ReasoningProvider,
  ReasoningRequest,
} from "./types.js";

export interface DefaultAgentExecutorOptions {
  provider: ReasoningProvider;
  eventBus?: EventBus;
  /** Soft timeout — if provider exceeds, map to REASONING_TIMEOUT when provider hangs without error */
  timeout_ms?: number;
  /**
   * Optional B01 accounting seam — records usage into existing counters.
   * Does not create a parallel AgentBudget.
   */
  onUsage?: (usage: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    tokens_unknown?: boolean;
    duration_ms: number;
  }) => void;
  /**
   * Soft budget gate — Runtime decides; executor reports structured failure if blocked.
   */
  isBudgetExhausted?: () => boolean;
}

function buildReasoningContext(request: AgentExecutionRequest): Record<string, unknown> {
  const ctx = {
    objective: request.objective,
    decision_mode: request.decision_mode,
    role: request.role,
    policy_summary: request.policy_summary,
    workspace_authority_summary: request.workspace_authority_summary,
    resource_budget_summary: request.resource_budget_summary,
    failure_context: request.failure_context,
    current_plan_summary: request.current_plan_summary,
    relevant_evidence_refs: request.relevant_evidence_refs,
    relevant_knowledge_refs: request.relevant_knowledge_refs,
    available_capabilities: request.available_capabilities,
    available_providers: request.available_providers,
    previous_decision_ids: request.previous_decision_ids,
    attempt: request.attempt,
    // Explicit: knowledge / skill / repo / user text are data, not authority
    context_authority: "none" as const,
  };
  return redactForbiddenKeys(ctx);
}

export class DefaultAgentExecutor implements AgentExecutor {
  private provider: ReasoningProvider;
  private eventBus?: EventBus;
  private timeout_ms?: number;
  private onUsage?: DefaultAgentExecutorOptions["onUsage"];
  private isBudgetExhausted?: () => boolean;

  constructor(options: DefaultAgentExecutorOptions) {
    this.provider = options.provider;
    this.eventBus = options.eventBus;
    this.timeout_ms = options.timeout_ms;
    this.onUsage = options.onUsage;
    this.isBudgetExhausted = options.isBudgetExhausted;
  }

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const started = Date.now();

    if (this.isBudgetExhausted?.()) {
      const result: AgentExecutionResult = {
        success: false,
        agent_id: request.agent_id,
        agent_version: request.agent_version,
        duration_ms: Date.now() - started,
        error: {
          code: "REASONING_REFUSED",
          message: "Resource budget exhausted — Runtime blocked AgentExecutor invocation",
        },
        prompt_version: request.prompt_version,
        schema_version: request.schema_id,
      };
      this.emit("AgentInvocationFailed", request, result);
      return result;
    }

    const leak = assertNoForbiddenKeys(request);
    if (!leak.ok) {
      const result: AgentExecutionResult = {
        success: false,
        agent_id: request.agent_id,
        agent_version: request.agent_version,
        duration_ms: Date.now() - started,
        error: {
          code: "REASONING_REFUSED",
          message: `Sensitive context key blocked: ${leak.path}`,
        },
        prompt_version: request.prompt_version,
        schema_version: request.schema_id,
      };
      this.emit("AgentInvocationFailed", request, result);
      return result;
    }

    this.emit("AgentInvocationStarted", request, undefined);

    const reasoningReq: ReasoningRequest = {
      request_id: request.request_id,
      execution_id: request.execution_id,
      agent_id: request.agent_id,
      objective: request.objective,
      decision_mode: request.decision_mode,
      context: buildReasoningContext(request),
      schema_id: request.schema_id,
      prompt_version: request.prompt_version,
    };

    // Harden: context must never carry secrets to provider
    const ctxLeak = assertNoForbiddenKeys(reasoningReq.context);
    if (!ctxLeak.ok) {
      const result: AgentExecutionResult = {
        success: false,
        agent_id: request.agent_id,
        agent_version: request.agent_version,
        duration_ms: Date.now() - started,
        error: {
          code: "REASONING_REFUSED",
          message: `Context leakage blocked before provider: ${ctxLeak.path}`,
        },
      };
      this.emit("AgentInvocationFailed", request, result);
      return result;
    }

    let response;
    try {
      if (this.timeout_ms != null && this.timeout_ms > 0) {
        response = await Promise.race([
          this.provider.invoke(reasoningReq),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(Object.assign(new Error("timeout"), { code: "REASONING_TIMEOUT" })),
              this.timeout_ms,
            ),
          ),
        ]);
      } else {
        response = await this.provider.invoke(reasoningReq);
      }
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "REASONING_PROVIDER_UNAVAILABLE";
      const result: AgentExecutionResult = {
        success: false,
        agent_id: request.agent_id,
        agent_version: request.agent_version,
        duration_ms: Date.now() - started,
        provider_id: this.provider.id,
        error: {
          code,
          message: err instanceof Error ? err.message : String(err),
        },
      };
      this.emit("AgentInvocationFailed", request, result);
      return result;
    }

    if (response.usage) {
      this.onUsage?.({
        ...response.usage,
        duration_ms: response.duration_ms,
      });
    } else {
      this.onUsage?.({ tokens_unknown: true, duration_ms: response.duration_ms });
    }

    if (!response.ok) {
      const result: AgentExecutionResult = {
        success: false,
        agent_id: request.agent_id,
        agent_version: request.agent_version,
        duration_ms: Date.now() - started,
        provider_id: response.provider_id,
        model_id: response.model_id,
        model_version: response.model_version,
        usage: response.usage,
        error: response.error ?? {
          code: "REASONING_PROVIDER_UNAVAILABLE",
          message: "Provider returned ok=false without error",
        },
      };
      this.emit("AgentInvocationFailed", request, result);
      return result;
    }

    const known = (request.available_capabilities ?? [])
      .map((c) => c.capability_id)
      .filter(Boolean);

    const validated = validateAgentDecisionPayload(response.payload, {
      known_capabilities: known.length ? known : undefined,
      agent_role: request.role,
    });

    if (!validated.ok) {
      const result: AgentExecutionResult = {
        success: false,
        agent_id: request.agent_id,
        agent_version: request.agent_version,
        duration_ms: Date.now() - started,
        provider_id: response.provider_id,
        model_id: response.model_id,
        usage: response.usage,
        error: { code: validated.code, message: validated.message },
      };
      this.emit("AgentInvocationFailed", request, result);
      return result;
    }

    const result: AgentExecutionResult = {
      success: true,
      decision: validated.decision,
      decision_id: validated.decision.decision_id,
      provider_id: response.provider_id,
      model_id: response.model_id,
      model_version: response.model_version,
      agent_id: request.agent_id,
      agent_version: request.agent_version,
      duration_ms: Date.now() - started,
      usage: response.usage,
      references: validated.decision.references,
      prompt_version: request.prompt_version,
      schema_version: request.schema_id,
    };
    this.emit("AgentDecisionProduced", request, result);
    return result;
  }

  private emit(
    type: "AgentInvocationStarted" | "AgentDecisionProduced" | "AgentInvocationFailed",
    request: AgentExecutionRequest,
    result: AgentExecutionResult | undefined,
  ): void {
    if (!this.eventBus) return;
    this.eventBus.emit(type, request.task_id, "agent", {
      request_id: request.request_id,
      execution_id: request.execution_id,
      agent_id: request.agent_id,
      agent_version: request.agent_version,
      decision_id: result?.decision_id,
      decision_type: result?.decision?.decision_type,
      success: result?.success,
      error: result?.error,
      provider_id: result?.provider_id,
      attempt: request.attempt,
      // B04-compatible identity — no chain-of-thought / raw model reasoning
    });
  }
}
