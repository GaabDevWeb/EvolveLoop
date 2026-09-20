/**
 * Validate AgentDecision in delegation context — deterministic.
 */

import { createHash } from "node:crypto";
import type { AgentDecision } from "../agent/types.js";
import { validateAgentDecisionPayload } from "../agent/validate-decision.js";
import type { DelegationRequest, DelegationResult, DelegationOutcomeKind } from "./types.js";

const ENG_TYPES = new Set([
  "IMPLEMENTATION_PROPOSAL",
  "TEST_PROPOSAL",
  "REVIEW_PROPOSAL",
  "VALIDATION_PROPOSAL",
  "TASK_BLOCKED",
  "REPLAN_REQUEST",
  "ACTION_PROPOSAL",
  "FINAL_RESPONSE",
  "NEED_INFORMATION",
  "NEED_CONFIRMATION",
  "AGENT_UNABLE",
  "FAILURE",
  "REPLAN_PROPOSAL",
]);

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function fingerprintResult(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24);
}

export interface DecisionValidationContext {
  delegation: DelegationRequest;
  expected_assignment_id: string;
  expected_task_id: string;
  known_capabilities?: string[];
}

export function validateDelegationDecision(
  rawDecision: unknown,
  ctx: DecisionValidationContext,
): {
  ok: boolean;
  decision?: AgentDecision;
  errors: string[];
  outcome: DelegationOutcomeKind;
} {
  const errors: string[] = [];
  const o = asRecord(rawDecision);

  // Adversarial: wrong assignment/task binding in payload metadata
  if (o) {
    if (typeof o.assignment_id === "string" && o.assignment_id !== ctx.expected_assignment_id) {
      errors.push("decision assignment_id mismatch");
    }
    if (typeof o.task_id === "string" && o.task_id !== ctx.expected_task_id) {
      errors.push("decision task_id mismatch");
    }
  }

  const dtype = o && typeof o.decision_type === "string" ? o.decision_type : "";

  // Baseline SE-01..03 proposals are forbidden on the task-delegation path
  if (
    dtype === "REQUIREMENTS_PROPOSAL" ||
    dtype === "ARCHITECTURE_PROPOSAL" ||
    dtype === "TASK_GRAPH_PROPOSAL"
  ) {
    return {
      ok: false,
      errors: ["SE baseline proposals forbidden on task delegation path"],
      outcome: "INVALID",
    };
  }

  // Engineering-specific types — soft schema
  if (ENG_TYPES.has(dtype) && !["ACTION_PROPOSAL", "REPLAN_PROPOSAL", "FINAL_RESPONSE", "NEED_INFORMATION", "NEED_CONFIRMATION", "AGENT_UNABLE", "FAILURE"].includes(dtype)) {
    if (dtype === "IMPLEMENTATION_PROPOSAL" || dtype === "TEST_PROPOSAL" || dtype === "VALIDATION_PROPOSAL") {
      const actions = o?.proposed_actions ?? o?.proposed_changes;
      if (!Array.isArray(actions) || actions.length === 0) {
        // allow FINAL-like with details
        if (typeof o?.reason !== "string" || !String(o.reason).trim()) {
          errors.push(`${dtype} requires proposed_actions or reason`);
        }
      } else {
        for (const a of actions) {
          const ar = asRecord(a);
          const cap = ar && typeof ar.capability === "string" ? ar.capability : "";
          if (!cap) {
            errors.push("each proposed action needs capability");
            continue;
          }
          if (ctx.delegation.forbidden_capabilities.includes(cap) || /unrestricted/i.test(cap)) {
            errors.push(`forbidden capability in decision: ${cap}`);
          }
          const allowed = ctx.delegation.allowed_capabilities.map((c) => c.capability_id);
          if (!allowed.includes(cap) && !allowed.includes("*")) {
            errors.push(`capability not allowed for this delegation: ${cap}`);
          }
          // Scope escape: paths outside task_scope
          const paths = Array.isArray(ar?.paths)
            ? ar!.paths.filter((x): x is string => typeof x === "string")
            : typeof ar?.path === "string"
              ? [ar.path]
              : [];
          for (const p of paths) {
            if (!pathAllowed(p, ctx.delegation.task_scope)) {
              errors.push(`path escapes task scope: ${p}`);
            }
          }
        }
      }
    }

    if (dtype === "TASK_BLOCKED") {
      return {
        ok: errors.length === 0,
        decision: {
          decision_id: typeof o?.decision_id === "string" ? o.decision_id : "eng-blocked",
          decision_type: "AGENT_UNABLE",
          reason: typeof o?.reason === "string" ? o.reason : "task blocked",
          details: typeof o?.details === "string" ? o.details : undefined,
        },
        errors,
        outcome: errors.length ? "INVALID" : "BLOCKED",
      };
    }

    if (dtype === "REPLAN_REQUEST") {
      return {
        ok: errors.length === 0,
        decision: {
          decision_id: typeof o?.decision_id === "string" ? o.decision_id : "eng-replan",
          decision_type: "FAILURE",
          reason: typeof o?.reason === "string" ? o.reason : "replan requested",
          details: typeof o?.details === "string" ? o.details : undefined,
        },
        errors,
        outcome: errors.length ? "INVALID" : "REQUIRES_REPLAN",
      };
    }

    // Map IMPLEMENTATION_PROPOSAL → ACTION_PROPOSAL shape for Runtime bridge
    if (
      (dtype === "IMPLEMENTATION_PROPOSAL" || dtype === "TEST_PROPOSAL" || dtype === "VALIDATION_PROPOSAL") &&
      errors.length === 0
    ) {
      const actionsRaw = Array.isArray(o?.proposed_actions)
        ? o!.proposed_actions
        : Array.isArray(o?.proposed_changes)
          ? o!.proposed_changes
          : [];
      const mapped = {
        decision_type: "ACTION_PROPOSAL",
        decision_id: o?.decision_id,
        reason: o?.reason ?? dtype,
        proposed_actions: actionsRaw,
      };
      const v = validateAgentDecisionPayload(mapped, {
        known_capabilities: ctx.known_capabilities,
      });
      if (!v.ok) {
        return { ok: false, errors: [...errors, v.message], outcome: "INVALID" };
      }
      return {
        ok: true,
        decision: v.decision,
        errors: [],
        outcome: actionsRaw.length ? "NEEDS_EXECUTION" : "DECISION_PRODUCED",
      };
    }
  }

  // Standard AgentDecision path
  const v = validateAgentDecisionPayload(rawDecision, {
    known_capabilities: ctx.known_capabilities,
  });
  if (!v.ok) {
    return { ok: false, errors: [...errors, v.message], outcome: "INVALID" };
  }

  // Block SE-01..03 proposals from mutating baselines via supervisor path
  if (
    v.decision.decision_type === "REQUIREMENTS_PROPOSAL" ||
    v.decision.decision_type === "ARCHITECTURE_PROPOSAL" ||
    v.decision.decision_type === "TASK_GRAPH_PROPOSAL"
  ) {
    return {
      ok: false,
      errors: ["SE baseline proposals forbidden on task delegation path"],
      outcome: "INVALID",
    };
  }

  if (v.decision.decision_type === "ACTION_PROPOSAL") {
    for (const a of v.decision.proposed_actions) {
      if (
        ctx.delegation.forbidden_capabilities.includes(a.capability) ||
        /unrestricted/i.test(a.capability)
      ) {
        errors.push(`forbidden capability: ${a.capability}`);
      }
      const allowed = ctx.delegation.allowed_capabilities.map((c) => c.capability_id);
      if (!allowed.includes(a.capability) && !allowed.includes("*")) {
        errors.push(`capability not allowed: ${a.capability}`);
      }
    }
  }

  if (errors.length) {
    return { ok: false, decision: v.decision, errors, outcome: "INVALID" };
  }

  let outcome: DelegationOutcomeKind = "DECISION_PRODUCED";
  if (v.decision.decision_type === "ACTION_PROPOSAL") outcome = "NEEDS_EXECUTION";
  if (v.decision.decision_type === "REPLAN_PROPOSAL") outcome = "REQUIRES_REPLAN";
  if (v.decision.decision_type === "AGENT_UNABLE" || v.decision.decision_type === "FAILURE") {
    outcome = "FAILED";
  }
  if (v.decision.decision_type === "NEED_CONFIRMATION") outcome = "WAITING_CONFIRMATION";

  return { ok: true, decision: v.decision, errors: [], outcome };
}

function pathAllowed(path: string, scope: string[]): boolean {
  if (!scope.length) return false;
  const norm = path.replace(/^\.\//, "");
  return scope.some((s) => {
    const prefix = s.replace(/\/\*\*$/, "/").replace(/\*$/, "").replace(/\/\*$/, "/");
    return norm === s || norm.startsWith(prefix) || (s.endsWith("/**") && norm.startsWith(s.slice(0, -3)));
  });
}

export function buildDelegationResult(
  partial: Omit<DelegationResult, "kind" | "apiVersion" | "produced_at" | "fingerprint">,
): DelegationResult {
  const produced_at = new Date().toISOString();
  const fingerprint = fingerprintResult({
    assignment_id: partial.assignment_id,
    task_id: partial.task_id,
    outcome: partial.outcome,
    decision_id: partial.decision_id,
    execution_id: partial.execution_id,
    validation_ok: partial.validation_ok,
    runtime: partial.runtime_effect,
  });
  return {
    kind: "DelegationResult",
    apiVersion: "evolveloop.io/se/v1",
    produced_at,
    fingerprint,
    ...partial,
  };
}
