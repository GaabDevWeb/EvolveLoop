import type { DetectedPattern, NeedCandidate, RootCauseAnalysis, RootCauseType } from "./types.js";

const PATTERN_TO_CAUSE: Record<string, { primary: RootCauseType; alternatives: RootCauseType[] }> = {
  RepeatedFailure: { primary: "UNKNOWN", alternatives: ["SKILL_GAP", "CAPABILITY_GAP", "PROVIDER_GAP", "ENVIRONMENT"] },
  RepeatedRetry: { primary: "RUNTIME_GAP", alternatives: ["PROVIDER_GAP", "ENVIRONMENT"] },
  RepeatedHumanIntervention: { primary: "AGENT_BOUNDARY", alternatives: ["SKILL_GAP", "KNOWLEDGE_GAP", "POLICY_GAP"] },
  RepeatedUserCorrection: { primary: "KNOWLEDGE_GAP", alternatives: ["SKILL_GAP", "ROUTING_GAP"] },
  CapabilityGap: { primary: "CAPABILITY_GAP", alternatives: ["PROVIDER_GAP", "ROUTING_GAP"] },
  SkillGap: { primary: "SKILL_GAP", alternatives: ["KNOWLEDGE_GAP", "AGENT_BOUNDARY"] },
  ExcessiveExecutionSteps: { primary: "ROUTING_GAP", alternatives: ["SKILL_GAP", "KNOWLEDGE_GAP"] },
  RepeatedPolicyBlock: { primary: "POLICY_GAP", alternatives: ["USER_CONFIGURATION", "NO_CHANGE"] },
  EvaluationGap: { primary: "EVAL_GAP", alternatives: ["OBSERVABILITY_GAP"] },
  RepeatedUnsuccessfulRecovery: { primary: "RUNTIME_GAP", alternatives: ["CAPABILITY_GAP"] },
  TaskAbandonment: { primary: "UNKNOWN", alternatives: ["SKILL_GAP", "USER_CONFIGURATION", "NO_CHANGE"] },
  LatencyPattern: { primary: "PROVIDER_GAP", alternatives: ["RUNTIME_GAP", "NO_CHANGE"] },
};

/**
 * Root Cause Analysis: need → suspected causes (never a single forced fact).
 */
export class RootCauseAnalyzer {
  analyze(need: NeedCandidate, patterns: DetectedPattern[]): RootCauseAnalysis {
    const related = patterns.filter((p) => need.pattern_ids.includes(p.id));
    const kind = related[0]?.kind ?? need.type;
    const mapped = PATTERN_TO_CAUSE[kind] ?? {
      primary: "UNKNOWN" as RootCauseType,
      alternatives: ["NO_CHANGE" as RootCauseType],
    };

    // Isolated / low confidence → prefer NO_CHANGE / UNKNOWN
    if (need.status === "INSUFFICIENT_EVIDENCE" || need.confidence === "LOW") {
      return {
        need_id: need.id,
        primary: "NO_CHANGE",
        alternatives: [mapped.primary, ...mapped.alternatives],
        evidence: need.evidence.slice(0, 5),
        uncertainties: ["insufficient_corroboration", "do_not_evolve_on_weak_evidence"],
      };
    }

    // Metadata hint from signals (deterministic): if pattern kind is SkillGap, prefer SKILL
    return {
      need_id: need.id,
      primary: mapped.primary,
      alternatives: mapped.alternatives,
      evidence: need.evidence.slice(0, 10),
      uncertainties: [
        "primary_is_suspected_not_proven",
        "alternatives_must_be_considered_before_agent_creation",
      ],
    };
  }
}
