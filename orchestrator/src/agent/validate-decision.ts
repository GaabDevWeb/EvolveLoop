/**
 * Parse → schema validate → semantic normalize → AgentDecision.
 * Invalid decisions never reach the Runtime as proposals.
 */

import { randomUUID } from "node:crypto";
import {
  validateStructuredIntent,
  type StructuredIntent,
} from "../planning/structured-intent.js";
import type { CapabilityIR } from "../types/index.js";
import type {
  ActionProposal,
  AgentDecision,
  AgentDecisionType,
  ReasoningErrorCode,
} from "./types.js";

const DECISION_TYPES = new Set<AgentDecisionType>([
  "PLAN_PROPOSAL",
  "ACTION_PROPOSAL",
  "REPLAN_PROPOSAL",
  "REQUIREMENTS_PROPOSAL",
  "ARCHITECTURE_PROPOSAL",
  "TASK_GRAPH_PROPOSAL",
  "NEED_INFORMATION",
  "NEED_CONFIRMATION",
  "FINAL_RESPONSE",
  "DELEGATION_PROPOSAL",
  "AGENT_UNABLE",
  "FAILURE",
]);

export interface DecisionValidationOptions {
  /** Known capability ids — unknown → semantic rejection */
  known_capabilities?: Set<string> | string[];
  /** Compatible roles for this agent turn (optional) */
  allowed_roles?: string[];
  agent_role?: string;
}

export type DecisionValidationResult =
  | { ok: true; decision: AgentDecision }
  | {
      ok: false;
      code: ReasoningErrorCode;
      message: string;
    };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function parseIntent(raw: unknown): StructuredIntent | null {
  const o = asRecord(raw);
  if (!o) return null;
  if (typeof o.id !== "string" || typeof o.goal !== "string" || !Array.isArray(o.steps)) {
    return null;
  }
  return raw as StructuredIntent;
}

/**
 * Reject vendor tool_call shapes — must become ACTION_PROPOSAL via structured decision.
 */
export function rejectDirectToolCall(payload: unknown): DecisionValidationResult | null {
  const o = asRecord(payload);
  if (!o) return null;
  if ("tool_call" in o || "tool_calls" in o || "function_call" in o) {
    return {
      ok: false,
      code: "REASONING_SCHEMA_ERROR",
      message: "Direct tool_call is forbidden; emit ACTION_PROPOSAL instead",
    };
  }
  return null;
}

export function validateAgentDecisionPayload(
  payload: unknown,
  options: DecisionValidationOptions = {},
): DecisionValidationResult {
  const toolReject = rejectDirectToolCall(payload);
  if (toolReject) return toolReject;

  const o = asRecord(payload);
  if (!o) {
    return {
      ok: false,
      code: "REASONING_MALFORMED_OUTPUT",
      message: "Decision payload must be a non-null object",
    };
  }

  const decision_type = o.decision_type;
  if (typeof decision_type !== "string" || !DECISION_TYPES.has(decision_type as AgentDecisionType)) {
    return {
      ok: false,
      code: "REASONING_SCHEMA_ERROR",
      message: `Unknown or missing decision_type: ${String(decision_type)}`,
    };
  }

  const reason = typeof o.reason === "string" ? o.reason : "";
  if (!reason.trim()) {
    return {
      ok: false,
      code: "REASONING_SCHEMA_ERROR",
      message: "decision.reason is required",
    };
  }

  const decision_id =
    typeof o.decision_id === "string" && o.decision_id.trim()
      ? o.decision_id
      : randomUUID();

  const references = Array.isArray(o.references)
    ? o.references.filter((r): r is string => typeof r === "string")
    : undefined;
  const confidence = typeof o.confidence === "number" ? o.confidence : undefined;

  if (options.allowed_roles && options.agent_role) {
    if (!options.allowed_roles.includes(options.agent_role)) {
      return {
        ok: false,
        code: "REASONING_SEMANTIC_ERROR",
        message: `Agent role ${options.agent_role} not compatible with this turn`,
      };
    }
  }

  const known = options.known_capabilities
    ? options.known_capabilities instanceof Set
      ? options.known_capabilities
      : new Set(options.known_capabilities)
    : null;

  const type = decision_type as AgentDecisionType;

  if (type === "PLAN_PROPOSAL") {
    const intent = parseIntent(o.proposed_intent);
    if (!intent) {
      return {
        ok: false,
        code: "REASONING_SCHEMA_ERROR",
        message: "PLAN_PROPOSAL requires proposed_intent",
      };
    }
    const intentErrs = validateStructuredIntent(intent);
    if (intentErrs.length) {
      return {
        ok: false,
        code: "REASONING_SEMANTIC_ERROR",
        message: intentErrs.map((e) => e.message).join("; "),
      };
    }
    if (known) {
      for (const step of intent.steps) {
        if (!known.has(step.capability)) {
          return {
            ok: false,
            code: "REASONING_SEMANTIC_ERROR",
            message: `Unknown capability: ${step.capability}`,
          };
        }
      }
    }
    return {
      ok: true,
      decision: {
        decision_id,
        decision_type: "PLAN_PROPOSAL",
        reason,
        confidence,
        references,
        proposed_intent: intent,
      },
    };
  }

  if (type === "ACTION_PROPOSAL") {
    const actionsRaw = o.proposed_actions;
    if (!Array.isArray(actionsRaw) || actionsRaw.length === 0) {
      return {
        ok: false,
        code: "REASONING_SCHEMA_ERROR",
        message: "ACTION_PROPOSAL requires non-empty proposed_actions",
      };
    }
    const proposed_actions: ActionProposal[] = [];
    for (const a of actionsRaw) {
      const ar = asRecord(a);
      if (!ar || typeof ar.capability !== "string" || !ar.capability.trim()) {
        return {
          ok: false,
          code: "REASONING_SCHEMA_ERROR",
          message: "Each action requires capability string",
        };
      }
      if (known && !known.has(ar.capability)) {
        return {
          ok: false,
          code: "REASONING_SEMANTIC_ERROR",
          message: `Unknown capability: ${ar.capability}`,
        };
      }
      proposed_actions.push({
        capability: ar.capability,
        inputs:
          ar.inputs && typeof ar.inputs === "object" && !Array.isArray(ar.inputs)
            ? Object.fromEntries(
                Object.entries(ar.inputs as Record<string, unknown>).map(([k, v]) => [
                  k,
                  String(v),
                ]),
              )
            : undefined,
        reason: typeof ar.reason === "string" ? ar.reason : undefined,
        references: Array.isArray(ar.references)
          ? ar.references.filter((r): r is string => typeof r === "string")
          : undefined,
      });
    }
    return {
      ok: true,
      decision: {
        decision_id,
        decision_type: "ACTION_PROPOSAL",
        reason,
        confidence,
        references,
        proposed_actions,
      },
    };
  }

  if (type === "REPLAN_PROPOSAL") {
    const intent = o.proposed_intent != null ? parseIntent(o.proposed_intent) : undefined;
    const candidate_ir =
      o.candidate_ir && typeof o.candidate_ir === "object"
        ? (o.candidate_ir as CapabilityIR)
        : undefined;
    if (!intent && !candidate_ir) {
      return {
        ok: false,
        code: "REASONING_SCHEMA_ERROR",
        message: "REPLAN_PROPOSAL requires proposed_intent or candidate_ir",
      };
    }
    if (intent) {
      const intentErrs = validateStructuredIntent(intent);
      if (intentErrs.length) {
        return {
          ok: false,
          code: "REASONING_SEMANTIC_ERROR",
          message: intentErrs.map((e) => e.message).join("; "),
        };
      }
      if (known) {
        for (const step of intent.steps) {
          if (!known.has(step.capability)) {
            return {
              ok: false,
              code: "REASONING_SEMANTIC_ERROR",
              message: `Unknown capability: ${step.capability}`,
            };
          }
        }
      }
    }
    if (candidate_ir?.spec?.nodes && known) {
      for (const n of candidate_ir.spec.nodes) {
        if (!known.has(n.capability)) {
          return {
            ok: false,
            code: "REASONING_SEMANTIC_ERROR",
            message: `Unknown capability: ${n.capability}`,
          };
        }
      }
    }
    return {
      ok: true,
      decision: {
        decision_id,
        decision_type: "REPLAN_PROPOSAL",
        reason,
        confidence,
        references,
        proposed_intent: intent ?? undefined,
        candidate_ir,
        replan_strategy:
          typeof o.replan_strategy === "string" ? o.replan_strategy : undefined,
      },
    };
  }

  if (type === "DELEGATION_PROPOSAL") {
    if (typeof o.target_agent_id !== "string" || !o.target_agent_id.trim()) {
      return {
        ok: false,
        code: "REASONING_SCHEMA_ERROR",
        message: "DELEGATION_PROPOSAL requires target_agent_id",
      };
    }
    return {
      ok: true,
      decision: {
        decision_id,
        decision_type: "DELEGATION_PROPOSAL",
        reason,
        confidence,
        references,
        target_agent_id: o.target_agent_id,
        delegated_task_id:
          typeof o.delegated_task_id === "string" ? o.delegated_task_id : undefined,
      },
    };
  }

  if (type === "REQUIREMENTS_PROPOSAL") {
    const rawSpec =
      asRecord(o.proposed_requirements_spec) ??
      asRecord(o.requirements_spec) ??
      null;
    if (!rawSpec) {
      return {
        ok: false,
        code: "REASONING_SCHEMA_ERROR",
        message: "REQUIREMENTS_PROPOSAL requires proposed_requirements_spec object",
      };
    }
    // Soft structural check — full validation is RequirementsValidator (deterministic)
    if (rawSpec.baseline === true) {
      return {
        ok: false,
        code: "REASONING_SEMANTIC_ERROR",
        message: "LLM cannot declare requirements baseline=true; Runtime owns baseline",
      };
    }
    return {
      ok: true,
      decision: {
        decision_id,
        decision_type: "REQUIREMENTS_PROPOSAL",
        reason,
        confidence,
        references,
        proposed_requirements_spec: rawSpec,
      },
    };
  }

  if (type === "ARCHITECTURE_PROPOSAL") {
    const rawSpec =
      asRecord(o.proposed_architecture_spec) ??
      asRecord(o.architecture_spec) ??
      null;
    if (!rawSpec) {
      return {
        ok: false,
        code: "REASONING_SCHEMA_ERROR",
        message: "ARCHITECTURE_PROPOSAL requires proposed_architecture_spec object",
      };
    }
    if (rawSpec.baseline === true) {
      return {
        ok: false,
        code: "REASONING_SEMANTIC_ERROR",
        message: "LLM cannot declare architecture baseline=true; Runtime owns baseline",
      };
    }
    return {
      ok: true,
      decision: {
        decision_id,
        decision_type: "ARCHITECTURE_PROPOSAL",
        reason,
        confidence,
        references,
        proposed_architecture_spec: rawSpec,
      },
    };
  }

  if (type === "TASK_GRAPH_PROPOSAL") {
    const rawSpec =
      asRecord(o.proposed_task_graph) ?? asRecord(o.task_graph) ?? null;
    if (!rawSpec) {
      return {
        ok: false,
        code: "REASONING_SCHEMA_ERROR",
        message: "TASK_GRAPH_PROPOSAL requires proposed_task_graph object",
      };
    }
    if (rawSpec.baseline === true) {
      return {
        ok: false,
        code: "REASONING_SEMANTIC_ERROR",
        message: "LLM cannot declare task graph baseline=true; Runtime owns baseline",
      };
    }
    return {
      ok: true,
      decision: {
        decision_id,
        decision_type: "TASK_GRAPH_PROPOSAL",
        reason,
        confidence,
        references,
        proposed_task_graph: rawSpec,
      },
    };
  }

  // NEED_INFORMATION | NEED_CONFIRMATION | FINAL_RESPONSE | AGENT_UNABLE | FAILURE
  return {
    ok: true,
    decision: {
      decision_id,
      decision_type: type as
        | "NEED_INFORMATION"
        | "NEED_CONFIRMATION"
        | "FINAL_RESPONSE"
        | "AGENT_UNABLE"
        | "FAILURE",
      reason,
      confidence,
      references,
      details: typeof o.details === "string" ? o.details : undefined,
    },
  };
}
