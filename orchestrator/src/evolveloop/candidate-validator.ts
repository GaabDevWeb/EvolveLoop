import type { EvolutionCandidate, EvolutionRequest, NeedCandidate, RootCauseAnalysis } from "./types.js";

export type ValidationResult =
  | { ok: true; candidate: EvolutionCandidate }
  | { ok: false; status: "INCOMPLETE" | "REJECTED"; reasons: string[] };

/**
 * Candidate Validation — schema/provenance/scope/rollback/eval before pipeline handoff.
 * NEVER mutates runtime.
 */
export class CandidateValidator {
  validate(candidate: EvolutionCandidate, need: NeedCandidate, rca: RootCauseAnalysis): ValidationResult {
    const reasons: string[] = [];

    if (!candidate.need_id || candidate.need_id !== need.id) reasons.push("need_link_missing_or_mismatch");
    if (rca.need_id !== need.id) reasons.push("root_cause_need_mismatch");
    if (!candidate.evidence.length) reasons.push("evidence_empty");
    if (!candidate.scope_class) reasons.push("scope_missing");
    if (!candidate.rollback) reasons.push("rollback_missing");
    if (!candidate.eval_strategy) reasons.push("eval_strategy_missing");
    if (!candidate.success_criteria.length || !candidate.failure_criteria.length) {
      reasons.push("success_or_failure_criteria_missing");
    }

    // AGENT without alternatives listed → incomplete (must consider skill/capability first)
    if (candidate.type === "AGENT" && !candidate.alternatives.includes("SKILL")) {
      reasons.push("agent_candidate_must_list_skill_alternative");
    }

    if (reasons.length) {
      return { ok: false, status: "INCOMPLETE", reasons };
    }

    return {
      ok: true,
      candidate: { ...candidate, status: "VALIDATED" },
    };
  }
}

export function buildEvolutionRequest(
  need: NeedCandidate,
  rca: RootCauseAnalysis,
  candidate: EvolutionCandidate,
  patternIds: string[],
): EvolutionRequest {
  const isNoChange = candidate.type === "NO_CHANGE";
  // CORE_CANDIDATE: classify and hold for explicit pipeline intake — never auto-promote Core
  const requested_action = isNoChange
    ? "NO_CHANGE"
    : need.scope_class === "CORE_CANDIDATE"
      ? "HOLD"
      : "SUBMIT_TO_PROTOTYPE_GATE";

  return {
    id: `ereq-${candidate.fingerprint}`,
    source_need: need.id,
    source_patterns: patternIds,
    root_cause: rca,
    candidate,
    evidence: candidate.evidence,
    scope: need.scope_class,
    requested_action,
    evaluation: {
      strategy: candidate.eval_strategy,
      success_criteria: candidate.success_criteria,
      failure_criteria: candidate.failure_criteria,
    },
    autonomy_ceiling: "PROPOSE",
    created_at: new Date().toISOString(),
    mutates_core: false,
    mutates_runtime: false,
  };
}
