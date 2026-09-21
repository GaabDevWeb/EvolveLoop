/**
 * Runtime verification of skill-gate attestation artifacts.
 *
 * Caller-declared status fields are NOT authority. Only an on-disk artifact
 * under workspaceRoot, with gate + context binding, can satisfy gates.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { GateStatus } from "../policy/skill-gates.js";
import { pathEscapesWorkspace } from "../authority/capability-authority.js";

export type AttestationGateId = "grill-me" | "image-to-code" | "knowledge-grounding";

export interface GateAttestationArtifact {
  gate: AttestationGateId;
  status: "satisfied" | "exempt";
  feature_id?: string;
  execution_id?: string;
  task_id?: string;
  project_id?: string;
  /** Provenance / source identifiers from real retrieval (optional but recommended) */
  source_ids?: string[];
  exempt_reason?: string;
  verified_at?: string;
}

export interface VerifyAttestationInput {
  workspaceRoot?: string;
  artifactPath?: string;
  expectedGate: AttestationGateId;
  expectedFeatureId?: string;
  expectedExecutionId?: string;
  expectedTaskId?: string;
  expectedProjectId?: string;
}

export interface VerifyAttestationResult {
  ok: boolean;
  status: GateStatus;
  reason: string;
  exempt_reason?: string;
  source_ids?: string[];
}

function resolveArtifactPath(workspaceRoot: string, artifactPath: string): string | null {
  if (pathEscapesWorkspace(artifactPath, workspaceRoot)) return null;
  const abs = isAbsolute(artifactPath) ? resolve(artifactPath) : resolve(workspaceRoot, artifactPath);
  if (pathEscapesWorkspace(abs, workspaceRoot)) return null;
  try {
    if (!existsSync(abs)) return null;
    const realRoot = realpathSync(workspaceRoot);
    const real = realpathSync(abs);
    if (!(real === realRoot || real.startsWith(realRoot + "/"))) return null;
    return real;
  } catch {
    return null;
  }
}

/**
 * Independently verify a gate attestation artifact on disk.
 * Never trusts caller-provided status alone.
 */
export function verifyGateAttestationArtifact(
  input: VerifyAttestationInput,
): VerifyAttestationResult {
  if (!input.workspaceRoot) {
    return {
      ok: false,
      status: "absent",
      reason: "attestation_workspace_required",
    };
  }
  if (!input.artifactPath) {
    return {
      ok: false,
      status: "absent",
      reason: "attestation_artifact_path_required",
    };
  }

  const abs = resolveArtifactPath(input.workspaceRoot, input.artifactPath);
  if (!abs) {
    return {
      ok: false,
      status: "absent",
      reason: "attestation_artifact_unreadable_or_escapes",
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(abs, "utf-8"));
  } catch {
    return { ok: false, status: "failed", reason: "attestation_artifact_corrupt" };
  }

  if (raw == null || typeof raw !== "object") {
    return { ok: false, status: "failed", reason: "attestation_artifact_invalid" };
  }

  const doc = raw as Record<string, unknown>;
  if (doc.gate !== input.expectedGate) {
    return { ok: false, status: "failed", reason: "attestation_gate_mismatch" };
  }
  if (doc.status !== "satisfied" && doc.status !== "exempt") {
    return { ok: false, status: "failed", reason: "attestation_status_invalid" };
  }

  // Binding: when expected* is provided, artifact MUST declare matching field
  // (missing field on artifact when expected is set = mismatch — fail closed).
  if (input.expectedFeatureId) {
    if (doc.feature_id == null || String(doc.feature_id) !== input.expectedFeatureId) {
      return { ok: false, status: "failed", reason: "attestation_feature_mismatch" };
    }
  }
  if (input.expectedExecutionId) {
    if (doc.execution_id == null || String(doc.execution_id) !== input.expectedExecutionId) {
      return { ok: false, status: "failed", reason: "attestation_execution_mismatch" };
    }
  }
  if (input.expectedTaskId) {
    if (doc.task_id == null || String(doc.task_id) !== input.expectedTaskId) {
      return { ok: false, status: "failed", reason: "attestation_task_mismatch" };
    }
  }
  if (input.expectedProjectId) {
    if (doc.project_id == null || String(doc.project_id) !== input.expectedProjectId) {
      return { ok: false, status: "failed", reason: "attestation_project_mismatch" };
    }
  }

  // knowledge-grounding satisfied requires non-empty provenance (empty/missing → DENY)
  if (input.expectedGate === "knowledge-grounding" && doc.status === "satisfied") {
    if (!Array.isArray(doc.source_ids) || doc.source_ids.length === 0) {
      return { ok: false, status: "failed", reason: "attestation_provenance_missing" };
    }
    if (!doc.source_ids.every((x) => typeof x === "string" && x.trim().length > 0)) {
      return { ok: false, status: "failed", reason: "attestation_provenance_invalid" };
    }
  }

  return {
    ok: true,
    status: doc.status as GateStatus,
    reason: "attestation_verified",
    exempt_reason: typeof doc.exempt_reason === "string" ? doc.exempt_reason : undefined,
    source_ids: Array.isArray(doc.source_ids)
      ? doc.source_ids.filter((x): x is string => typeof x === "string")
      : undefined,
  };
}
