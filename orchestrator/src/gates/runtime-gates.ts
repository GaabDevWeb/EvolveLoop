/**
 * Runtime gate evaluation — PRE_EXECUTE enforcement for ExecutionEngine.
 *
 * Distinguishes:
 * - DETERMINISTIC: CapabilityAuthority, deny-lists, path checks
 * - AGENT-ATTESTED: grill-me / image-to-code evidence status (attestation artifacts)
 * - HUMAN: CONFIRMATION_REQUIRED structured pause
 *
 * Skill-gate helpers were eval-only; this module applies them on the hot path
 * when RuntimeGateContext declares requirements.
 */

import type { GraphNode, ProviderEntry } from "../types/index.js";
import {
  authorize,
  type AuthorityContext,
  type AuthorityResult,
} from "../authority/capability-authority.js";
import {
  evaluateGrillMeTransition,
  evaluateImageToCodeGate,
  type GateStatus,
  type GrillMeGateInput,
  type ImageToCodeGateInput,
  type SkillGateDecision,
} from "../policy/skill-gates.js";
import { buildAuthorityEvidence } from "../evidence/builders.js";
import type { Evidence } from "../types/index.js";

export type PreExecuteDecision =
  | "ALLOW"
  | "DENY"
  | "CONFIRMATION_REQUIRED"
  | "DEFERRED";

export type GateKind = "DETERMINISTIC" | "AGENT_ATTESTED" | "HUMAN_CONFIRMATION";

export interface RuntimeGateContext {
  /** Grill-me attestation (AGENT_ATTESTED). Absent ⇒ gate not evaluated (n/a). */
  grill_me?: GrillMeGateInput;
  /** Image-to-code attestation. */
  image_to_code?: ImageToCodeGateInput;
  /**
   * Knowledge grounding requirement.
   * required=true + status absent/failed ⇒ DENY (fail-closed).
   */
  grounding?: {
    required: boolean;
    status: GateStatus;
    /** Observed retrieval hit count (optional telemetry). */
    hit_count?: number;
  };
  /**
   * Explicit capability deny-list (policy profile / test / risk).
   * Checked before provider execute — cannot be bypassed by mock.
   */
  denied_capabilities?: string[];
  /**
   * If true and a skill gate input is missing while IR metadata requires it → DENY.
   * Default false for V1 compatibility (gates only when context supplied).
   */
  fail_closed_missing_attestation?: boolean;
}

export interface PreExecuteInput {
  node: GraphNode;
  provider: ProviderEntry;
  authority: AuthorityContext;
  gateContext?: RuntimeGateContext;
  /** Plan hash — confirmation only valid for this plan. */
  plan_hash?: string;
  /** Hash for which confirmation was granted (replan invalidates). */
  confirmed_for_plan_hash?: string;
  run_id: string;
  execution_id: string;
  policy_id: string;
}

export interface PreExecuteResult {
  decision: PreExecuteDecision;
  gate_id: string;
  gate_kind: GateKind;
  reason: string;
  authority?: AuthorityResult;
  skill_gates?: SkillGateDecision[];
  evidence: Evidence;
  code?:
    | "ALLOW"
    | "AUTHORITY_DENIED"
    | "GATE_DENIED"
    | "CONFIRMATION_REQUIRED"
    | "GROUNDING_REQUIRED"
    | "CAPABILITY_DENIED"
    | "NOT_IMPLEMENTED";
}

function inferPermissions(capability: string): {
  filesystem?: "none" | "read" | "write";
  network?: boolean;
  shell?: boolean;
} {
  if (capability === "shell.execute" || capability.startsWith("shell.") || capability === "test.run") {
    return { shell: true, filesystem: "read" };
  }
  if (
    capability === "filesystem.write" ||
    capability.endsWith(".write") ||
    capability.includes("write")
  ) {
    return { filesystem: "write" };
  }
  if (capability.startsWith("browser.") || capability.startsWith("network.")) {
    return { network: true };
  }
  if (capability.startsWith("knowledge.")) {
    return { filesystem: "read", network: false };
  }
  return { filesystem: "read" };
}

function targetPathFromNode(node: GraphNode): string | undefined {
  const c = node.constraints;
  if (!c) return undefined;
  const p = c.path ?? c.file ?? c.targetPath;
  return typeof p === "string" ? p : undefined;
}

/**
 * PRE_EXECUTE authorization + required gates.
 * MUST be called before ProviderRuntime.execute on the public engine path.
 */
export function evaluatePreExecute(input: PreExecuteInput): PreExecuteResult {
  const { node, provider, gateContext, run_id, execution_id, policy_id } = input;
  const skill_gates: SkillGateDecision[] = [];

  const mkEvidence = (
    decision: "allow" | "deny" | "confirm",
    reason: string,
    auth?: AuthorityResult,
  ): Evidence =>
    buildAuthorityEvidence(node.id, run_id, node.capability, {
      decision,
      reason,
      checked_at: new Date().toISOString(),
      type: "authority",
      capability: node.capability,
      ...(auth?.evidence ?? {}),
    });

  // 1) Explicit deny-list (DETERMINISTIC)
  const denied = gateContext?.denied_capabilities ?? [];
  if (denied.includes(node.capability)) {
    const evidence = mkEvidence("deny", `capability_denied:${node.capability}`);
    (evidence.metadata as { execution_id?: string }).run_id = run_id;
    evidence.spec.assumptions = [
      `execution_id:${execution_id}`,
      `policy_id:${policy_id}`,
      `provider_id:${provider.id}`,
      `gate:capability_deny_list`,
    ];
    return {
      decision: "DENY",
      gate_id: "capability_deny_list",
      gate_kind: "DETERMINISTIC",
      reason: `Capability ${node.capability} is denied by policy`,
      evidence,
      code: "CAPABILITY_DENIED",
    };
  }

  // 2) Knowledge grounding (DETERMINISTIC observation of attestation status)
  if (gateContext?.grounding?.required) {
    const st = gateContext.grounding.status;
    if (st !== "satisfied" && st !== "exempt") {
      return {
        decision: "DENY",
        gate_id: "knowledge-grounding",
        gate_kind: "DETERMINISTIC",
        reason: `Grounding required but status=${st}`,
        evidence: mkEvidence("deny", `grounding_${st}`),
        code: "GROUNDING_REQUIRED",
      };
    }
  }

  // 3) AGENT_ATTESTED skill gates (when context provided)
  if (gateContext?.grill_me) {
    const d = evaluateGrillMeTransition(gateContext.grill_me);
    skill_gates.push(d);
    if (d.required && !d.allow_transition && d.fail_closed) {
      return {
        decision: "DENY",
        gate_id: "grill-me",
        gate_kind: "AGENT_ATTESTED",
        reason: d.reason,
        skill_gates,
        evidence: mkEvidence("deny", d.reason),
        code: "GATE_DENIED",
      };
    }
  }

  if (gateContext?.image_to_code) {
    const d = evaluateImageToCodeGate(gateContext.image_to_code);
    skill_gates.push(d);
    if (d.required && !d.allow_transition && d.fail_closed) {
      return {
        decision: "DENY",
        gate_id: "image-to-code",
        gate_kind: "AGENT_ATTESTED",
        reason: d.reason,
        skill_gates,
        evidence: mkEvidence("deny", d.reason),
        code: "GATE_DENIED",
      };
    }
  }

  // 4) CapabilityAuthority (DETERMINISTIC / HUMAN confirm)
  // Confirmation is bound to plan_hash when present — replan invalidates unless re-bound.
  const confirmed = (() => {
    if (!input.authority.confirmed) return false;
    if (!input.plan_hash) return true;
    return input.confirmed_for_plan_hash === input.plan_hash;
  })();

  const auth = authorize({
    capability: node.capability,
    permissions: inferPermissions(node.capability),
    side_effects:
      node.capability.includes("write") ||
      node.capability === "shell.execute" ||
      node.capability === "test.run" ||
      !!node.constraints?.side_effects,
    requires_confirmation: !!(node.constraints?.requires_confirmation || node.metadata?.requires_confirmation),
    targetPath: targetPathFromNode(node),
    context: {
      ...input.authority,
      confirmed,
    },
  });

  if (auth.decision === "deny") {
    return {
      decision: "DENY",
      gate_id: "capability_authority",
      gate_kind: "DETERMINISTIC",
      reason: auth.reason,
      authority: auth,
      skill_gates,
      evidence: mkEvidence("deny", auth.reason, auth),
      code: "AUTHORITY_DENIED",
    };
  }

  if (auth.decision === "confirm") {
    return {
      decision: "CONFIRMATION_REQUIRED",
      gate_id: "capability_authority",
      gate_kind: "HUMAN_CONFIRMATION",
      reason: auth.reason,
      authority: auth,
      skill_gates,
      evidence: mkEvidence("confirm", auth.reason, auth),
      code: "CONFIRMATION_REQUIRED",
    };
  }

  return {
    decision: "ALLOW",
    gate_id: "capability_authority",
    gate_kind: "DETERMINISTIC",
    reason: auth.reason,
    authority: auth,
    skill_gates,
    evidence: mkEvidence("allow", auth.reason, auth),
    code: "ALLOW",
  };
}
