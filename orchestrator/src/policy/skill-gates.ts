/**
 * Skill gate decision helpers (policy parity).
 * Observe/eval harness — NOT Execution Engine enforcement.
 * Canonical contracts: grill-me-gate.md, image-attachment-gate.md
 */

export type RiskTier = "hotfix" | "standard" | "sensitive" | "audit";

export type GateStatus = "satisfied" | "blocked" | "failed" | "exempt" | "absent" | "n/a";

export type SkillGateId = "grill-me" | "image-to-code";

export interface GrillMeGateInput {
  risk_tier: RiskTier;
  /** Fase 0.5 / formal product docs path */
  phase05_active: boolean;
  docs_approved: boolean;
  /** Explicit human skip with evidence */
  explicit_exempt?: boolean;
  exempt_reason?: string;
  /** Fully specified operational task — no design decisions */
  fully_specified_execution?: boolean;
  /** Factual / translation / non-product */
  trivial_non_design?: boolean;
  /** Significant scope / architecture change mid-cycle */
  significant_scope_change?: boolean;
  /** Current evidence status if any */
  evidence_status?: GateStatus;
}

export interface ImageToCodeGateInput {
  image_attachment: boolean;
  evidence_status?: GateStatus;
}

export interface SkillGateDecision {
  gate: SkillGateId;
  required: boolean;
  allow_transition: boolean;
  status: GateStatus;
  reason: string;
  fail_closed: boolean;
}

/** When is grill-me required before /planejar? */
export function evaluateGrillMeRequired(input: GrillMeGateInput): boolean {
  if (input.trivial_non_design) return false;
  if (input.fully_specified_execution) return false;
  if (input.explicit_exempt) return false;

  if (input.risk_tier === "hotfix" && !input.significant_scope_change && !input.phase05_active) {
    return false;
  }

  if (input.phase05_active && input.docs_approved) return true;
  if (input.significant_scope_change) return true;
  if (input.risk_tier === "standard" || input.risk_tier === "sensitive") {
    // design/planning scope for non-hotfix product work entering planner
    return input.docs_approved || input.phase05_active;
  }
  if (input.risk_tier === "audit" && input.phase05_active) return true;
  return false;
}

/** Fail-closed transition to planner */
export function evaluateGrillMeTransition(input: GrillMeGateInput): SkillGateDecision {
  const required = evaluateGrillMeRequired(input);

  if (!required) {
    if (input.explicit_exempt) {
      return {
        gate: "grill-me",
        required: false,
        allow_transition: true,
        status: "exempt",
        reason: input.exempt_reason ?? "explicit_exempt",
        fail_closed: true,
      };
    }
    return {
      gate: "grill-me",
      required: false,
      allow_transition: true,
      status: "n/a",
      reason: "gate_not_required_for_scope",
      fail_closed: true,
    };
  }

  const st = input.evidence_status ?? "absent";

  if (st === "satisfied" || st === "exempt") {
    return {
      gate: "grill-me",
      required: true,
      allow_transition: true,
      status: st,
      reason: st === "exempt" ? (input.exempt_reason ?? "exempt") : "gate_satisfied",
      fail_closed: true,
    };
  }

  return {
    gate: "grill-me",
    required: true,
    allow_transition: false,
    status: st === "failed" || st === "blocked" ? st : "blocked",
    reason:
      st === "absent"
        ? "grill_me_required_but_evidence_absent"
        : st === "failed"
          ? "grill_me_failed"
          : "grill_me_blocked",
    fail_closed: true,
  };
}

/** Image attachment → image-to-code required (policy) */
export function evaluateImageToCodeGate(input: ImageToCodeGateInput): SkillGateDecision {
  if (!input.image_attachment) {
    return {
      gate: "image-to-code",
      required: false,
      allow_transition: true,
      status: "n/a",
      reason: "no_image_attachment",
      fail_closed: true,
    };
  }

  const st = input.evidence_status ?? "absent";
  if (st === "satisfied") {
    return {
      gate: "image-to-code",
      required: true,
      allow_transition: true,
      status: "satisfied",
      reason: "image_to_code_applied",
      fail_closed: true,
    };
  }

  // Policy: required; TS engine does not block — decision still reports fail-closed intent
  return {
    gate: "image-to-code",
    required: true,
    allow_transition: false,
    status: st === "failed" ? "failed" : "blocked",
    reason: "image_attachment_requires_image_to_code",
    fail_closed: true,
  };
}

/** Build require[] flags for SSOT (additive helpers) */
export function skillGatesToRequireFlags(decisions: SkillGateDecision[]): string[] {
  const flags: string[] = [];
  for (const d of decisions) {
    if (d.required) flags.push(d.gate);
  }
  return flags;
}
