/**
 * Reviewer independence — implementer ≠ reviewer when required.
 */

export function assertReviewIndependence(input: {
  require_independent_review: boolean;
  implementer_agent_id: string;
  reviewer_agent_id: string;
}): { ok: boolean; error?: string } {
  if (!input.require_independent_review) return { ok: true };
  if (!input.reviewer_agent_id) {
    return { ok: false, error: "independent review required but reviewer_agent_id missing" };
  }
  if (input.implementer_agent_id === input.reviewer_agent_id) {
    return {
      ok: false,
      error: `reviewer must differ from implementer (both=${input.implementer_agent_id})`,
    };
  }
  return { ok: true };
}

/** Deterministic reviewer identity — not the same as implementation agent */
export const DETERMINISTIC_REVIEWER_ID = "deterministic-reviewer";
export const DETERMINISTIC_REVIEWER_VERSION = "0.1.0";
