/**
 * AgentBackedReplanner — Replanner that uses AgentExecutor for REPLAN_PROPOSAL.
 * No LLM required when wired to TestReasoningProvider / Deterministic strategies.
 * Does not call CapabilityAuthority.authorize or execute providers.
 */

import { newRunId } from "../ir/validator.js";
import { emitPlan } from "../planning/plan-emitter.js";
import { buildPlanningEvidence } from "../evidence/builders.js";
import { hashCapabilityIR, stampPlanLineage } from "../replan/plan-identity.js";
import type { ReplanInput, ReplanResult, Replanner, ReplanStrategy } from "../replan/types.js";
import type { CapabilityIR } from "../types/index.js";
import { assembleAgentExecutionRequest } from "./context-assembler.js";
import { DefaultAgentExecutor } from "./agent-executor.js";
import type { AgentExecutor } from "./types.js";
import { applyAgentDecisionToPlan } from "./apply-decision.js";
import {
  createReasoningProvider,
  readReasoningConfigFromEnv,
  type ReasoningRuntimeConfig,
} from "./reasoning-config.js";

export interface AgentBackedReplannerOptions {
  executor: AgentExecutor;
  agent_id?: string;
  agent_version?: string;
  /** When AgentExecutor fails, optionally fall back to DeterministicReplanner-like logic */
  fallback?: Replanner;
}

/**
 * Skeleton for future LLMReplanner — same Replanner interface, AgentExecutor-backed.
 * UNDECIDED default reasoning provider — inject via constructor.
 */
export class AgentBackedReplanner implements Replanner {
  private executor: AgentExecutor;
  private agent_id: string;
  private agent_version: string;
  private fallback?: Replanner;

  constructor(options: AgentBackedReplannerOptions) {
    this.executor = options.executor;
    this.agent_id = options.agent_id ?? "replan-agent";
    this.agent_version = options.agent_version ?? "0.1.0";
    this.fallback = options.fallback;
  }

  async replan(input: ReplanInput): Promise<ReplanResult> {
    if (input.failure.disposition === "POLICY_BLOCKED") {
      return {
        status: "REPLAN_REJECTED",
        reason: "Cannot replan to bypass policy/authority denial",
        code: "POLICY_BLOCKED",
      };
    }

    const request = assembleAgentExecutionRequest({
      execution_id: input.execution_id,
      task_id: input.feature_id,
      attempt: input.attempt,
      agent_id: this.agent_id,
      agent_version: this.agent_version,
      role: "replanner",
      objective: `Replan after failure: ${input.failure.failure_class} on ${input.failed_node?.capability ?? "unknown"}`,
      decision_mode: "REPLAN",
      policy_summary: {
        policy_id: input.policy_id,
        max_replans: input.max_replans,
      },
      failure_context: {
        failure_class: input.failure.failure_class,
        error_code: input.failure.error_code,
        failed_capability: input.failed_node?.capability,
        failed_node_id: input.failed_node?.id,
        failed_provider_id: input.failed_provider_id,
        disposition: input.failure.disposition,
      },
      current_plan_summary: input.current_plan.spec.nodes.map((n) => ({
        id: n.id,
        capability: n.capability,
      })),
      available_capabilities: input.available_capabilities.map((c) => ({
        capability_id: c,
        available: true,
      })),
      available_providers: input.available_providers.map((p) => ({
        provider_id: p,
      })),
      resource_budget_summary: {
        remaining_replans: Math.max(0, input.max_replans - input.replan_count),
      },
    });

    const agentResult = await this.executor.execute(request);

    if (!agentResult.success || !agentResult.decision) {
      if (this.fallback) {
        return this.fallback.replan(input);
      }
      return {
        status: "REPLAN_UNAVAILABLE",
        reason: agentResult.error?.message ?? "AgentExecutor produced no decision",
        code: agentResult.error?.code ?? "AGENT_EXECUTOR_FAILED",
      };
    }

    if (agentResult.decision.decision_type !== "REPLAN_PROPOSAL") {
      if (agentResult.decision.decision_type === "AGENT_UNABLE") {
        return {
          status: "REPLAN_UNAVAILABLE",
          reason: agentResult.decision.reason,
          code: "AGENT_UNABLE",
        };
      }
      return {
        status: "REPLAN_REJECTED",
        reason: `Expected REPLAN_PROPOSAL, got ${agentResult.decision.decision_type}`,
        code: "UNEXPECTED_DECISION",
      };
    }

    const applied = applyAgentDecisionToPlan(agentResult, input.execution_id, {
      parent_plan_id: input.current_plan.metadata.id,
      plan_version: (input.current_plan.metadata.plan_version ?? 1) + 1,
      replan_id: agentResult.decision_id,
    });

    if (!applied.ok) {
      return {
        status: "REPLAN_REJECTED",
        reason: applied.message,
        code: applied.code,
      };
    }

    let candidate = applied.ir;

    // Prefer provider switch constraints when intent didn't set them
    const failed = input.failed_node;
    if (failed && input.failed_provider_id) {
      const alternatives = input.available_providers.filter((p) => p !== input.failed_provider_id);
      if (alternatives.length && candidate.spec.nodes.some((n) => n.id === failed.id)) {
        candidate = {
          ...candidate,
          spec: {
            ...candidate.spec,
            nodes: candidate.spec.nodes.map((n) => {
              if (n.id !== failed.id) return n;
              return {
                ...n,
                constraints: {
                  ...(n.constraints ?? {}),
                  exclude_providers: [
                    ...new Set([
                      ...((n.constraints?.exclude_providers as string[] | undefined) ?? []),
                      input.failed_provider_id!,
                    ]),
                  ],
                  prefer_provider:
                    (n.constraints?.prefer_provider as string | undefined) ?? alternatives[0],
                },
              };
            }),
          },
        };
      }
    }

    const strategy: ReplanStrategy =
      (agentResult.decision.replan_strategy as ReplanStrategy) ??
      "RETRY_WITH_CHANGED_PROVIDER";
    const replan_id = agentResult.decision_id ?? newRunId();

    candidate = stampPlanLineage(candidate, {
      execution_id: input.execution_id,
      plan_version: (input.current_plan.metadata.plan_version ?? 1) + 1,
      parent_plan_id: input.current_plan.metadata.id,
      replan_id,
      replan_reason: agentResult.decision.reason,
    });

    const hash = hashCapabilityIR(candidate);
    if (input.recent_plan_hashes.includes(hash)) {
      return {
        status: "REPLAN_REJECTED",
        reason: "Candidate plan hash already attempted",
        code: "NO_PROGRESS",
      };
    }

    const evidence = buildPlanningEvidence(
      input.execution_id,
      {
        type: "planning",
        decomposition_confidence: 0.85,
        unresolved_dependencies: [],
        critical_path: candidate.spec.nodes.filter((n) => !n.dependencies.length).map((n) => n.id),
      },
      [
        `decision_id:${replan_id}`,
        `replan_id:${replan_id}`,
        `strategy:${strategy}`,
        `agent_id:${this.agent_id}`,
        `agent_version:${this.agent_version}`,
      ],
    );

    return {
      status: "REPLAN_PROPOSED",
      candidate_ir: candidate,
      reason: agentResult.decision.reason,
      strategy,
      replan_id,
      evidence,
    };
  }
}

/**
 * Live opt-in LLMReplanner — uses AgentExecutor + concrete ReasoningProvider.
 * Does not replace DeterministicReplanner. Default provider remains UNDECIDED.
 */
export class LLMReplanner extends AgentBackedReplanner {
  /**
   * Build from explicit config. Returns null if live provider unavailable.
   * Callers must treat null as NOT_MEASURED / unavailable — never as PASS.
   */
  static tryCreate(
    config: ReasoningRuntimeConfig,
    options?: { agent_id?: string; agent_version?: string; timeout_ms?: number },
  ): LLMReplanner | null {
    if (config.mode !== "live") return null;
    const created = createReasoningProvider(config);
    if (!created.ok) return null;
    const executor = new DefaultAgentExecutor({
      provider: created.provider,
      timeout_ms: options?.timeout_ms ?? config.timeout_ms,
    });
    return new LLMReplanner({
      executor,
      agent_id: options?.agent_id ?? "llm-replanner",
      agent_version: options?.agent_version ?? "0.1.0",
    });
  }

  static tryCreateFromEnv(env: NodeJS.ProcessEnv = process.env): LLMReplanner | null {
    return LLMReplanner.tryCreate(readReasoningConfigFromEnv(env));
  }
}

/** Helper: emit IR from a REPLAN intent without AgentExecutor (test utility). */
export function emitReplanIntent(
  intent: Parameters<typeof emitPlan>[0],
  _executionId?: string,
): CapabilityIR | null {
  const r = emitPlan(intent);
  return r.ok ? r.ir : null;
}
