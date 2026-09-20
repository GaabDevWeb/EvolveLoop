import type { OrchestratorDecision } from "../types/index.js";
import type { EventBus } from "../events/event-bus.js";
import { classifyFailure, type FailureClassification } from "../replan/failure-class.js";
import { shouldReplan } from "../replan/decide-replan.js";

export interface DecideContext {
  blocked_reason: string;
  feature_id: string;
  error_code?: string;
  replan_count?: number;
  max_replans?: number;
  same_failure_no_progress?: boolean;
}

export interface DecideResult {
  decision: OrchestratorDecision;
  classification: FailureClassification;
  should_replan: boolean;
  replan_block_code?: string;
}

export class Orchestrator {
  /**
   * Decide continuar | corrigir | replan.
   * Does NOT generate IR — that is Replanner responsibility.
   */
  decide(context: DecideContext): OrchestratorDecision {
    return this.decideDetailed(context).decision;
  }

  decideDetailed(context: DecideContext): DecideResult {
    const classification = classifyFailure({
      blocked_reason: context.blocked_reason,
      error_code: context.error_code,
    });

    const gate =
      context.blocked_reason === "gate_rejected" ||
      context.blocked_reason.startsWith("dod_failed:");

    if (gate && classification.disposition !== "POLICY_BLOCKED") {
      return {
        decision: "corrigir",
        classification,
        should_replan: false,
      };
    }

    if (
      context.blocked_reason === "deadlock_or_waiting_external" ||
      context.blocked_reason === "awaiting_external_jobs"
    ) {
      return {
        decision: "continuar",
        classification: classifyFailure({ blocked_reason: context.blocked_reason }),
        should_replan: false,
      };
    }

    // Retries exhausted: replanable UNLESS the underlying error is policy/authority
    let effective = classification;
    if (context.blocked_reason === "unrecoverable_failure") {
      const fromCode = classifyFailure({
        blocked_reason: context.blocked_reason,
        error_code: context.error_code,
      });
      if (fromCode.disposition === "POLICY_BLOCKED") {
        effective = fromCode;
      } else {
        effective = {
          disposition: "REPLANABLE",
          failure_class: "unrecoverable_after_retries",
          error_code: context.error_code ?? "UNRECOVERABLE",
          reason: "Retries exhausted — replan may change strategy",
        };
      }
    }

    const check = shouldReplan({
      classification: effective,
      replan_count: context.replan_count ?? 0,
      max_replans: context.max_replans ?? 3,
      same_failure_no_progress: context.same_failure_no_progress,
    });

    if (check.should) {
      return {
        decision: "replan",
        classification: effective,
        should_replan: true,
      };
    }

    if (check.code === "POLICY_BLOCKED" || check.code === "FATAL" || check.code === "REPLAN_EXHAUSTED" || check.code === "NO_PROGRESS") {
      return {
        decision: "corrigir",
        classification: effective,
        should_replan: false,
        replan_block_code: check.code === "FATAL" && effective.disposition === "BUDGET_BLOCKED"
          ? (effective.error_code ?? "BUDGET_EXCEEDED")
          : check.code,
      };
    }

    if (check.code === "HUMAN_REQUIRED") {
      return {
        decision: "continuar",
        classification: effective,
        should_replan: false,
        replan_block_code: check.code,
      };
    }

    return {
      decision: "corrigir",
      classification: effective,
      should_replan: false,
      replan_block_code: check.code,
    };
  }

  applyDecision(
    decision: OrchestratorDecision,
    eventBus: EventBus,
    featureId: string,
    reason: string,
  ): void {
    eventBus.emit("OrchestratorDecision", featureId, "orchestrator", {
      decision,
      reason,
    });
  }
}
