import { createHash } from "node:crypto";
import type {
  CandidateType,
  EvolutionCandidate,
  NeedCandidate,
  RootCauseAnalysis,
  RootCauseType,
} from "./types.js";

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

const CAUSE_TO_CANDIDATE: Record<RootCauseType, { type: CandidateType; alternatives: CandidateType[]; target: string }> = {
  KNOWLEDGE_GAP: { type: "KNOWLEDGE", alternatives: ["SKILL", "DOCUMENTATION", "NO_CHANGE"], target: "knowledge_store" },
  SKILL_GAP: { type: "SKILL", alternatives: ["KNOWLEDGE", "CAPABILITY", "AGENT", "NO_CHANGE"], target: "skill_authoring" },
  CAPABILITY_GAP: { type: "CAPABILITY", alternatives: ["PROVIDER", "SKILL", "NO_CHANGE"], target: "capability_registry" },
  PROVIDER_GAP: { type: "PROVIDER", alternatives: ["CAPABILITY", "NO_CHANGE"], target: "provider_manifest" },
  POLICY_GAP: { type: "POLICY", alternatives: ["DOCUMENTATION", "NO_CHANGE"], target: "policy_engine" },
  ROUTING_GAP: { type: "ROUTING", alternatives: ["SKILL", "CAPABILITY", "NO_CHANGE"], target: "scheduler_routing" },
  AGENT_BOUNDARY: { type: "AGENT", alternatives: ["SKILL", "CAPABILITY", "NO_CHANGE"], target: "agent_authoring" },
  RUNTIME_GAP: { type: "RUNTIME", alternatives: ["CAPABILITY", "NO_CHANGE"], target: "execution_engine" },
  OBSERVABILITY_GAP: { type: "DOCUMENTATION", alternatives: ["RUNTIME", "NO_CHANGE"], target: "telemetry" },
  EVAL_GAP: { type: "DOCUMENTATION", alternatives: ["NO_CHANGE"], target: "evals" },
  USER_CONFIGURATION: { type: "NO_CHANGE", alternatives: ["DOCUMENTATION"], target: "user_config" },
  ENVIRONMENT: { type: "NO_CHANGE", alternatives: ["DOCUMENTATION"], target: "environment" },
  NO_CHANGE: { type: "NO_CHANGE", alternatives: [], target: "none" },
  UNKNOWN: { type: "NO_CHANGE", alternatives: ["KNOWLEDGE", "SKILL", "CAPABILITY"], target: "investigate" },
};

/**
 * Prefer smaller changes: existing skill/knowledge/capability before AGENT/RUNTIME.
 * AGENT only when primary is AGENT_BOUNDARY and alternatives listed.
 */
export class EvolutionCandidateGenerator {
  private emitted = new Map<string, EvolutionCandidate>();

  generate(need: NeedCandidate, rca: RootCauseAnalysis): EvolutionCandidate[] {
    if (need.status !== "CANDIDATE") {
      return [
        this.make(
          need,
          rca,
          "NO_CHANGE",
          "none",
          "Insufficient evidence — do not evolve",
          ["insufficient_evidence"],
        ),
      ];
    }

    const mapping = CAUSE_TO_CANDIDATE[rca.primary];
    const fingerprint = hash([need.fingerprint, rca.primary, mapping.type]);
    if (this.emitted.has(fingerprint)) {
      return [this.emitted.get(fingerprint)!];
    }

    const primary = this.make(
      need,
      rca,
      mapping.type,
      mapping.target,
      `Suspected ${rca.primary}; prefer ${mapping.type} before larger changes`,
      mapping.alternatives,
    );

    // Always include NO_CHANGE alternative representation when not already
    const alts: EvolutionCandidate[] = [primary];
    if (mapping.type !== "NO_CHANGE") {
      alts.push(
        this.make(
          need,
          { ...rca, primary: "NO_CHANGE" },
          "NO_CHANGE",
          "none",
          "Explicit no-change alternative must remain available",
          [],
          "DRAFT",
        ),
      );
    }

    this.emitted.set(fingerprint, primary);
    return alts;
  }

  private make(
    need: NeedCandidate,
    rca: RootCauseAnalysis,
    type: CandidateType,
    target: string,
    rationale: string,
    alternatives: CandidateType[],
    status: EvolutionCandidate["status"] = "DRAFT",
  ): EvolutionCandidate {
    const fingerprint = hash([need.fingerprint, rca.primary, type, target]);
    const agentGuard =
      type === "AGENT"
        ? [
            "must_verify_existing_agents_skills_capabilities",
            "requires_distinct_responsibility_context_authority_evals",
          ]
        : [];

    return {
      id: `cand-${fingerprint}`,
      fingerprint,
      need_id: need.id,
      root_cause_primary: rca.primary,
      scope: need.scope,
      scope_class: need.scope_class,
      type,
      target,
      rationale,
      expected_effect: type === "NO_CHANGE" ? "no_system_mutation" : `address_${rca.primary.toLowerCase()}`,
      evidence: [...need.evidence, ...rca.evidence].slice(0, 20),
      alternatives,
      risks: [
        ...(type === "AGENT" || type === "RUNTIME" ? ["high_architectural_impact"] : []),
        ...(need.scope_class === "CORE_CANDIDATE" ? ["core_contamination_if_auto_applied"] : []),
        ...agentGuard,
      ],
      complexity: type === "NO_CHANGE" || type === "DOCUMENTATION" || type === "KNOWLEDGE" ? "LOW" : type === "AGENT" || type === "RUNTIME" ? "HIGH" : "MEDIUM",
      rollback: type === "NO_CHANGE" ? "n/a" : "revert_via_evolution_pipeline_only",
      eval_strategy: "synthetic_eval_then_prototype_gate_if_authorized",
      success_criteria: [
        "need_recurrence_reduced_under_eval",
        "no_unauthorized_mutation",
        "scope_preserved",
      ],
      failure_criteria: [
        "false_positive_need",
        "scope_leak_to_core",
        "unauthorized_runtime_mutation",
      ],
      status,
    };
  }

  reset(): void {
    this.emitted.clear();
  }
}
