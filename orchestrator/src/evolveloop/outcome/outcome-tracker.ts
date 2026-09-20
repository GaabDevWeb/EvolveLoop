import { createHash } from "node:crypto";
import type { EvolutionOutcome, OutcomeKind } from "../longitudinal-types.js";
import type { LongitudinalNeed } from "../longitudinal-types.js";
import type { NeedSignal } from "../types.js";

export interface OutcomeInput {
  evolution_request_id: string;
  candidate_id: string;
  need: LongitudinalNeed;
  signals_before: NeedSignal[];
  signals_after: NeedSignal[];
  implementation_id?: string;
  baseline_before?: string;
  baseline_after?: string;
  window_start: string;
  window_end: string;
}

/**
 * Post-evolution outcome — never SUCCESS without criteria.
 * Implementation alone does NOT resolve a need.
 * Low-sample windows must not produce strong IMPROVED/REGRESSED claims.
 */
export class OutcomeTracker {
  evaluate(input: OutcomeInput): { outcome: EvolutionOutcome; need_lifecycle: LongitudinalNeed["lifecycle"] } {
    const beforeComparable = input.signals_before.filter(matchNeed(input.need));
    const afterComparable = input.signals_after.filter(matchNeed(input.need));
    const beforeFail = countFailures(input.signals_before, input.need);
    const afterFail = countFailures(input.signals_after, input.need);
    const beforeTotal = Math.max(1, beforeComparable.length);
    const afterTotal = afterComparable.length;
    const sampleBefore = beforeComparable.length;
    const sampleAfter = afterComparable.length;

    let kind: OutcomeKind = "INCONCLUSIVE";
    let lifecycle: LongitudinalNeed["lifecycle"] = "REMAINS_ACTIVE";
    const notes = [
      "outcome_requires_measurable_before_after",
      "implementation_alone_does_not_resolve_need",
    ];

    // Empty after-window must never count as IMPROVED (zero observations ≠ cured).
    if (afterTotal === 0) {
      kind = "INCONCLUSIVE";
      lifecycle = "REMAINS_ACTIVE";
      notes.push("empty_after_window");
    } else if (sampleBefore <= 1 && sampleAfter <= 1) {
      // Both windows too small for strong claims
      kind = "INCONCLUSIVE";
      lifecycle = "REMAINS_ACTIVE";
      notes.push("low_sample_both_windows");
    } else if (afterTotal < 2 && beforeFail < 3) {
      kind = "INCONCLUSIVE";
      lifecycle = "REMAINS_ACTIVE";
      notes.push("low_sample_after");
    } else if (afterTotal < 2 && beforeFail >= 3) {
      // insufficient after-window evidence vs established before failures
      kind = "INCONCLUSIVE";
      lifecycle = "REMAINS_ACTIVE";
      notes.push("insufficient_after_evidence");
    } else {
      const rateBefore = beforeFail / beforeTotal;
      const rateAfter = afterFail / Math.max(1, afterTotal);
      if (rateAfter < rateBefore * 0.5) {
        kind = "IMPROVED";
        lifecycle = "RESOLVED";
      } else if (rateAfter > rateBefore * 1.2) {
        kind = "REGRESSED";
        lifecycle = "REGRESSED";
      } else {
        kind = "UNCHANGED";
        lifecycle = "REMAINS_ACTIVE";
      }
    }

    const id = `out-${createHash("sha256")
      .update([input.evolution_request_id, input.candidate_id, input.window_end].join("|"))
      .digest("hex")
      .slice(0, 12)}`;

    return {
      outcome: {
        id,
        evolution_request_id: input.evolution_request_id,
        candidate_id: input.candidate_id,
        implementation_id: input.implementation_id,
        baseline_before: input.baseline_before,
        baseline_after: input.baseline_after,
        observation_window: { start: input.window_start, end: input.window_end },
        metrics: {
          failure_rate_before: beforeFail / beforeTotal,
          failure_rate_after: afterTotal === 0 ? undefined : afterFail / Math.max(1, afterTotal),
          signal_count_before: sampleBefore,
          signal_count_after: afterTotal,
          sample_size_before: sampleBefore,
          sample_size_after: sampleAfter,
        },
        outcome: kind,
        need_id: input.need.id,
        need_fingerprint: input.need.fingerprint,
        scope_id: input.need.scope_id,
        created_at: new Date().toISOString(),
        notes,
      },
      need_lifecycle: lifecycle,
    };
  }
}

function matchNeed(need: LongitudinalNeed) {
  return (s: NeedSignal) =>
    s.domain === need.domain &&
    s.task_class === need.affected_tasks[0] &&
    (need.scope_class !== "USER_LOCAL" || s.user_id === need.scope_id || s.scope.id === need.scope_id);
}

function countFailures(signals: NeedSignal[], need: LongitudinalNeed): number {
  return signals
    .filter(matchNeed(need))
    .filter((s) => s.type === "failure" || s.type === "skill_failure" || s.type === "capability_unavailable")
    .length;
}
