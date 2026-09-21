/**
 * Runtime gate evaluation — PRE_EXECUTE enforcement for ExecutionEngine.
 *
 * Distinguishes:
 * - DETERMINISTIC: CapabilityAuthority, deny-lists, path checks
 * - AGENT_ATTESTED: grill-me / image-to-code — artifact-verified only
 * - HUMAN: CONFIRMATION_REQUIRED structured pause
 *
 * Caller-declared evidence_status is never authoritative alone.
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
import { verifyGateAttestationArtifact } from "./attestation.js";
import { buildAuthorityEvidence } from "../evidence/builders.js";
import type { Evidence } from "../types/index.js";

export type PreExecuteDecision =
  | "ALLOW"
  | "DENY"
  | "CONFIRMATION_REQUIRED"
  | "DEFERRED";

export type GateKind = "DETERMINISTIC" | "AGENT_ATTESTED" | "HUMAN_CONFIRMATION";

export interface RuntimeGateContext {
  /** Grill-me attestation input (status forged by caller is ignored until artifact verified). */
  grill_me?: GrillMeGateInput;
  /** Image-to-code attestation. */
  image_to_code?: ImageToCodeGateInput;
  /**
   * Knowledge grounding requirement.
   * Caller-declared `status` is IGNORED — only on-disk artifact verification counts.
   */
  grounding?: {
    required: boolean;
    /**
     * @deprecated Declarative caller status — never authoritative.
     * Kept for telemetry/debug; Runtime ignores for ALLOW decisions.
     */
    status?: GateStatus;
    hit_count?: number;
    /** Workspace-relative path to gate.knowledge-grounding.json */
    artifact_path?: string;
    project_id?: string;
    task_id?: string;
  };
  /**
   * Explicit capability deny-list (policy profile / test / risk).
   * Checked before provider execute — cannot be bypassed by mock.
   */
  denied_capabilities?: string[];
  /**
   * If true and a skill gate input is missing while IR/node metadata requires it → DENY.
   */
  fail_closed_missing_attestation?: boolean;
  /** Optional binding for attestation artifact verification */
  attestation_binding?: {
    feature_id?: string;
    project_id?: string;
  };
  /** Workspace used to verify attestation artifacts when authority.workspaceRoot absent */
  attestation_workspace?: string;
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

function requireFlags(node: GraphNode): string[] {
  const meta = node.metadata as Record<string, unknown> | undefined;
  const constraints = node.constraints as Record<string, unknown> | undefined;
  const out: string[] = [];
  for (const src of [meta?.require, constraints?.require]) {
    if (Array.isArray(src)) {
      for (const x of src) if (typeof x === "string") out.push(x);
    }
  }
  return out;
}

function sanitizeGrillMe(
  caller: GrillMeGateInput,
  executionId: string,
  gateContext: RuntimeGateContext | undefined,
  authority: AuthorityContext,
): GrillMeGateInput {
  const workspaceRoot = authority.workspaceRoot ?? gateContext?.attestation_workspace;
  const verification = verifyGateAttestationArtifact({
    workspaceRoot,
    artifactPath: caller.artifact_path,
    expectedGate: "grill-me",
    expectedFeatureId: gateContext?.attestation_binding?.feature_id,
    expectedExecutionId: executionId,
  });

  return {
    risk_tier: caller.risk_tier,
    phase05_active: caller.phase05_active,
    docs_approved: caller.docs_approved,
    fully_specified_execution: caller.fully_specified_execution,
    trivial_non_design: caller.trivial_non_design,
    significant_scope_change: caller.significant_scope_change,
    artifact_path: caller.artifact_path,
    // Ignore caller evidence_status / explicit_exempt — only verified artifact decides.
    evidence_status: verification.ok ? verification.status : "absent",
    explicit_exempt: verification.ok && verification.status === "exempt",
    exempt_reason: verification.ok ? verification.exempt_reason : undefined,
    runtime_verified: verification.ok,
  };
}

function sanitizeImageToCode(
  caller: ImageToCodeGateInput,
  executionId: string,
  gateContext: RuntimeGateContext | undefined,
  authority: AuthorityContext,
): ImageToCodeGateInput {
  if (!caller.image_attachment) {
    return { image_attachment: false };
  }
  const workspaceRoot = authority.workspaceRoot ?? gateContext?.attestation_workspace;
  const verification = verifyGateAttestationArtifact({
    workspaceRoot,
    artifactPath: caller.artifact_path,
    expectedGate: "image-to-code",
    expectedFeatureId: gateContext?.attestation_binding?.feature_id,
    expectedExecutionId: executionId,
  });
  return {
    image_attachment: true,
    artifact_path: caller.artifact_path,
    evidence_status: verification.ok ? verification.status : "absent",
    runtime_verified: verification.ok,
  };
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

  // 0) fail_closed_missing_attestation — wired (was dead)
  if (gateContext?.fail_closed_missing_attestation) {
    const req = requireFlags(node);
    if (req.includes("grill-me") && !gateContext.grill_me) {
      return {
        decision: "DENY",
        gate_id: "grill-me",
        gate_kind: "AGENT_ATTESTED",
        reason: "grill_me_attestation_missing",
        evidence: mkEvidence("deny", "grill_me_attestation_missing"),
        code: "GATE_DENIED",
      };
    }
    if (req.includes("image-to-code") && !gateContext.image_to_code) {
      return {
        decision: "DENY",
        gate_id: "image-to-code",
        gate_kind: "AGENT_ATTESTED",
        reason: "image_to_code_attestation_missing",
        evidence: mkEvidence("deny", "image_to_code_attestation_missing"),
        code: "GATE_DENIED",
      };
    }
  }

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

  // 2) Knowledge grounding — artifact-verified only (caller status ignored)
  if (gateContext?.grounding?.required) {
    const workspaceRoot = input.authority.workspaceRoot ?? gateContext.attestation_workspace;
    const g = gateContext.grounding;
    const verification = verifyGateAttestationArtifact({
      workspaceRoot,
      artifactPath: g.artifact_path,
      expectedGate: "knowledge-grounding",
      expectedFeatureId: gateContext.attestation_binding?.feature_id,
      expectedExecutionId: execution_id,
      expectedProjectId: g.project_id ?? gateContext.attestation_binding?.project_id,
      expectedTaskId: g.task_id ?? node.id,
    });
    if (!verification.ok || (verification.status !== "satisfied" && verification.status !== "exempt")) {
      return {
        decision: "DENY",
        gate_id: "knowledge-grounding",
        gate_kind: "DETERMINISTIC",
        reason: `Grounding required but verification failed: ${verification.reason}`,
        evidence: mkEvidence("deny", `grounding_${verification.reason}`),
        code: "GROUNDING_REQUIRED",
      };
    }
  }

  // 3) AGENT_ATTESTED skill gates — sanitize caller claims via artifact verification
  if (gateContext?.grill_me) {
    const sanitized = sanitizeGrillMe(gateContext.grill_me, execution_id, gateContext, input.authority);
    const d = evaluateGrillMeTransition(sanitized);
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
    const sanitized = sanitizeImageToCode(
      gateContext.image_to_code,
      execution_id,
      gateContext,
      input.authority,
    );
    const d = evaluateImageToCodeGate(sanitized);
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
