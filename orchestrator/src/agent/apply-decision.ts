/**
 * Bridge AgentDecision → PlanEmitter / candidate IR.
 * AgentExecutor never executes; Runtime uses these helpers.
 */

import {
  emitPlan,
  type PlanEmissionResult,
  type PlanEmitterOptions,
} from "../planning/plan-emitter.js";
import { validateExecutableIR, type PreflightOptions } from "../planning/preflight.js";
import { stampPlanLineage } from "../replan/plan-identity.js";
import type { CapabilityIR } from "../types/index.js";
import type { AgentDecision, AgentExecutionResult } from "./types.js";

export type ApplyDecisionResult =
  | {
      ok: true;
      kind: "plan" | "replan";
      ir: CapabilityIR;
      decision_id: string;
      plan_id: string;
      emission?: PlanEmissionResult;
    }
  | {
      ok: false;
      code: string;
      message: string;
      decision_id?: string;
    };

/**
 * Transform PLAN_PROPOSAL / REPLAN_PROPOSAL into CapabilityIR via PlanEmitter.
 * ACTION_PROPOSAL is returned as not-applied (Runtime must schedule separately).
 */
export function applyAgentDecisionToPlan(
  result: AgentExecutionResult,
  executionId: string,
  options: PlanEmitterOptions & {
    parent_plan_id?: string;
    plan_version?: number;
    replan_id?: string;
  } = {},
): ApplyDecisionResult {
  if (!result.success || !result.decision) {
    return {
      ok: false,
      code: result.error?.code ?? "NO_DECISION",
      message: result.error?.message ?? "AgentExecutionResult has no decision",
    };
  }

  const decision = result.decision;
  const decision_id = decision.decision_id;

  if (decision.decision_type === "PLAN_PROPOSAL") {
    const emission = emitPlan(decision.proposed_intent, {
      preflight: options.preflight,
      now: options.now,
    });
    if (!emission.ok) {
      return {
        ok: false,
        code: emission.status,
        message: emission.errors.map((e) => e.message).join("; "),
        decision_id,
      };
    }
    let ir = emission.ir;
    ir = {
      ...ir,
      metadata: {
        ...ir.metadata,
        execution_id: executionId,
        // Lineage: decision_id → plan_id → execution_id
        decision_id,
        agent_id: result.agent_id,
        agent_version: result.agent_version,
      },
    };
    return {
      ok: true,
      kind: "plan",
      ir,
      decision_id,
      plan_id: ir.metadata.id,
      emission,
    };
  }

  if (decision.decision_type === "REPLAN_PROPOSAL") {
    if (decision.candidate_ir) {
      let ir = decision.candidate_ir;
      const replan_id = options.replan_id ?? decision_id;
      const plan_version = options.plan_version ?? (ir.metadata.plan_version ?? 1) + 1;
      ir = stampPlanLineage(ir, {
        execution_id: executionId,
        plan_version,
        parent_plan_id: options.parent_plan_id ?? ir.metadata.id,
        replan_id,
        replan_reason: decision.reason,
      });
      ir = {
        ...ir,
        metadata: {
          ...ir.metadata,
          decision_id,
          agent_id: result.agent_id,
          agent_version: result.agent_version,
        },
      };
      if (options.preflight) {
        const pre = validateExecutableIR(ir, options.preflight);
        if (!pre.ok) {
          return {
            ok: false,
            code: "PREFLIGHT_REJECTED",
            message: pre.errors.map((e) => e.message).join("; "),
            decision_id,
          };
        }
      }
      return {
        ok: true,
        kind: "replan",
        ir,
        decision_id,
        plan_id: ir.metadata.id,
      };
    }

    if (decision.proposed_intent) {
      const emission = emitPlan(decision.proposed_intent, {
        preflight: options.preflight,
        now: options.now,
      });
      if (!emission.ok) {
        return {
          ok: false,
          code: emission.status,
          message: emission.errors.map((e) => e.message).join("; "),
          decision_id,
        };
      }
      let ir = emission.ir;
      const replan_id = options.replan_id ?? decision_id;
      ir = stampPlanLineage(ir, {
        execution_id: executionId,
        plan_version: options.plan_version ?? 2,
        parent_plan_id: options.parent_plan_id ?? "plan-v1",
        replan_id,
        replan_reason: decision.reason,
      });
      ir = {
        ...ir,
        metadata: {
          ...ir.metadata,
          decision_id,
          agent_id: result.agent_id,
          agent_version: result.agent_version,
        },
      };
      return {
        ok: true,
        kind: "replan",
        ir,
        decision_id,
        plan_id: ir.metadata.id,
        emission,
      };
    }
  }

  return {
    ok: false,
    code: "DECISION_NOT_EXECUTABLE_AS_PLAN",
    message: `Decision type ${decision.decision_type} does not produce IR via PlanEmitter`,
    decision_id,
  };
}

/** Persistable decision identity for B04 correlation (no model CoT). */
export interface PersistableDecisionMeta {
  decision_id: string;
  execution_id: string;
  task_id: string;
  attempt: number;
  agent_id: string;
  agent_version: string;
  decision_type: AgentDecision["decision_type"];
  provider_id?: string;
  model_id?: string;
  plan_id?: string;
  replan_id?: string;
  plan_version?: number;
}

export function toPersistableDecisionMeta(
  request: { execution_id: string; task_id: string; attempt: number },
  result: AgentExecutionResult,
  lineage?: { plan_id?: string; replan_id?: string; plan_version?: number },
): PersistableDecisionMeta | null {
  if (!result.decision_id || !result.decision) return null;
  return {
    decision_id: result.decision_id,
    execution_id: request.execution_id,
    task_id: request.task_id,
    attempt: request.attempt,
    agent_id: result.agent_id,
    agent_version: result.agent_version,
    decision_type: result.decision.decision_type,
    provider_id: result.provider_id,
    model_id: result.model_id,
    plan_id: lineage?.plan_id,
    replan_id: lineage?.replan_id,
    plan_version: lineage?.plan_version,
  };
}

export type { PreflightOptions };
