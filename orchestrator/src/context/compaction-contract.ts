/**
 * Compaction/reinject contract — architecture only until fidelity tests exist (ADR-0013 / ADR-DR-0005).
 */

export const COMPACTION_ADR = "docs/adr/0013-context-ownership-working-context.md";

export interface CompactionReinjectContract {
  status: "NOT_IMPLEMENTED";
  adr: string;
  working_context_disposable_at: "model_call_boundary";
  reconstruction_sources: Array<"checkpoint" | "memory" | "knowledge" | "ai_pages" | "evidence_files">;
  reinject_allowed: boolean;
  reinject_requires_fidelity_test: true;
  fidelity_must_preserve: Array<
    "paths" | "negations" | "commands" | "definition_of_done" | "acceptance_criteria" | "security_restrictions" | "evidence"
  >;
  acceptable_loss: Array<"redundant_prose_covered_by_evidence" | "redundant_prose_on_atual_pages">;
  stores_must_remain_distinct: Array<"Knowledge" | "Memory" | "Checkpoint">;
}

export function getCompactionReinjectContract(): CompactionReinjectContract {
  return {
    status: "NOT_IMPLEMENTED",
    adr: COMPACTION_ADR,
    working_context_disposable_at: "model_call_boundary",
    reconstruction_sources: ["checkpoint", "memory", "knowledge", "ai_pages", "evidence_files"],
    reinject_allowed: false,
    reinject_requires_fidelity_test: true,
    fidelity_must_preserve: [
      "paths",
      "negations",
      "commands",
      "definition_of_done",
      "acceptance_criteria",
      "security_restrictions",
      "evidence",
    ],
    acceptable_loss: ["redundant_prose_covered_by_evidence", "redundant_prose_on_atual_pages"],
    stores_must_remain_distinct: ["Knowledge", "Memory", "Checkpoint"],
  };
}

export function assertReinjectAllowed(fidelityTestPassed: boolean): { allowed: boolean; reason: string } {
  const contract = getCompactionReinjectContract();
  if (contract.status !== "NOT_IMPLEMENTED") {
    return { allowed: false, reason: "unexpected_compaction_status" };
  }
  if (!fidelityTestPassed) {
    return { allowed: false, reason: "fidelity_test_required" };
  }
  return { allowed: false, reason: "compaction_not_implemented" };
}
