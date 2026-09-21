/**
 * RT-SKILL-WIKI-01 remediation — grounding attestation trust model.
 * Caller-declared grounding.status alone must never ALLOW.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { evaluatePreExecute } from "../../src/gates/runtime-gates.js";
import { verifyGateAttestationArtifact } from "../../src/gates/attestation.js";
import type { GraphNode, ProviderEntry } from "../../src/types/index.js";

const provider: ProviderEntry = {
  id: "p",
  priority: 1,
  cost: "low",
  quality_score: 1,
  availability: "active",
  version: "1",
};

function node(id: string, capability = "demo.work"): GraphNode {
  return {
    id,
    capability,
    type: "worker",
    status: "pending",
    dependencies: [],
    definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
    retry_count: 0,
  };
}

function writeGrounding(
  ws: string,
  name: string,
  doc: Record<string, unknown>,
): string {
  mkdirSync(join(ws, "evidence"), { recursive: true });
  const rel = `evidence/${name}`;
  writeFileSync(join(ws, rel), JSON.stringify(doc));
  return rel;
}

describe("RT-SKILL-WIKI-01 grounding attestation", () => {
  let ws: string;

  beforeEach(() => {
    ws = join(tmpdir(), `ground-remed-${randomUUID()}`);
    mkdirSync(ws, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(ws)) rmSync(ws, { recursive: true, force: true });
  });

  it("Fake satisfied status without artifact → DENY", () => {
    const r = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: { grounding: { required: true, status: "satisfied" } },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
    expect(r.code).toBe("GROUNDING_REQUIRED");
  });

  it("Empty evidence (satisfied, no source_ids) → DENY", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-a",
      project_id: "proj-a",
    });
    const r = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          status: "satisfied",
          artifact_path: art,
          project_id: "proj-a",
          task_id: "task-a",
        },
      },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
  });

  it("Empty source_ids array → DENY", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-a",
      project_id: "proj-a",
      source_ids: [],
    });
    const v = verifyGateAttestationArtifact({
      workspaceRoot: ws,
      artifactPath: art,
      expectedGate: "knowledge-grounding",
      expectedExecutionId: "exec-1",
      expectedTaskId: "task-a",
      expectedProjectId: "proj-a",
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("attestation_provenance_missing");
  });

  it("Wrong task (T1 evidence on T2) → DENY", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-T1",
      project_id: "proj-a",
      source_ids: ["wiki:page-1"],
    });
    const r = evaluatePreExecute({
      node: node("task-T2"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: art,
          project_id: "proj-a",
          task_id: "task-T2",
        },
      },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
  });

  it("Wrong project → DENY", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-a",
      project_id: "proj-A",
      source_ids: ["wiki:page-1"],
    });
    const r = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: art,
          project_id: "proj-B",
          task_id: "task-a",
        },
      },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
  });

  it("Wrong execution → DENY", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-OLD",
      task_id: "task-a",
      project_id: "proj-a",
      source_ids: ["wiki:page-1"],
    });
    const r = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: art,
          project_id: "proj-a",
          task_id: "task-a",
        },
      },
      run_id: "r1",
      execution_id: "exec-NEW",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
  });

  it("Stale / replay attestation from prior execution → DENY", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-v1",
      task_id: "task-a",
      project_id: "proj-a",
      source_ids: ["wiki:page-1"],
      verified_at: "2020-01-01T00:00:00Z",
    });
    const r = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: art,
          project_id: "proj-a",
          task_id: "task-a",
        },
      },
      run_id: "r2",
      execution_id: "exec-v2",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
  });

  it("Cross-project / cross-task isolation", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-A",
      project_id: "proj-A",
      source_ids: ["wiki:a"],
    });
    const r = evaluatePreExecute({
      node: node("task-B"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: art,
          project_id: "proj-B",
          task_id: "task-B",
        },
      },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
  });

  it("Replan Task v1 → Task v2 does not inherit grounding", () => {
    const artV1 = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-v1",
      project_id: "proj-a",
      source_ids: ["wiki:page-1"],
    });
    const okV1 = evaluatePreExecute({
      node: node("task-v1"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: artV1,
          project_id: "proj-a",
          task_id: "task-v1",
        },
      },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(okV1.decision).toBe("ALLOW");

    const afterReplan = evaluatePreExecute({
      node: node("task-v2"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: artV1,
          project_id: "proj-a",
          task_id: "task-v2",
        },
      },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(afterReplan.decision).toBe("DENY");
  });

  it("Positive path: verified artifact with provenance → ALLOW", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-a",
      project_id: "proj-a",
      source_ids: ["wiki:KernelBot/current-state", "rag:hit-42"],
      verified_at: new Date().toISOString(),
    });
    const r = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          status: "absent", // caller lie ignored
          artifact_path: art,
          project_id: "proj-a",
          task_id: "task-a",
        },
      },
      run_id: "r1",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("ALLOW");
  });

  it("Evidence tamper after valid attestation → INVALID", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-1",
      task_id: "task-a",
      project_id: "proj-a",
      source_ids: ["wiki:ok"],
    });
    const base = {
      workspaceRoot: ws,
      artifactPath: art,
      expectedGate: "knowledge-grounding" as const,
      expectedExecutionId: "exec-1",
      expectedTaskId: "task-a",
      expectedProjectId: "proj-a",
    };
    expect(verifyGateAttestationArtifact(base).ok).toBe(true);

    const tampers: Array<[string, unknown]> = [
      ["task_id", "task-FORGED"],
      ["project_id", "proj-FORGED"],
      ["execution_id", "exec-FORGED"],
      ["status", "forged"],
      ["source_ids", []],
      ["gate", "grill-me"],
    ];
    for (const [field, value] of tampers) {
      writeGrounding(ws, "gate.knowledge-grounding.json", {
        gate: "knowledge-grounding",
        status: "satisfied",
        execution_id: "exec-1",
        task_id: "task-a",
        project_id: "proj-a",
        source_ids: ["wiki:ok"],
        [field]: value,
      });
      expect(verifyGateAttestationArtifact(base).ok).toBe(false);
    }
  });

  it("Checkpoint recovery does not restore grounding authority without re-verify", () => {
    const art = writeGrounding(ws, "gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-cp",
      task_id: "task-a",
      project_id: "proj-a",
      source_ids: ["wiki:ok"],
    });

    // Stale: wrong execution binding on resume
    const stale = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          status: "satisfied",
          artifact_path: art,
          project_id: "proj-a",
          task_id: "task-a",
        },
      },
      run_id: "r-resume",
      execution_id: "exec-RESUME-NEW",
      policy_id: "p",
    });
    expect(stale.decision).toBe("DENY");

    // Forged claim in gateContext alone (as if restored from checkpoint metadata)
    const forged = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: { grounding: { required: true, status: "satisfied" } },
      run_id: "r-resume",
      execution_id: "exec-cp",
      policy_id: "p",
    });
    expect(forged.decision).toBe("DENY");

    // Missing attestation
    const missing = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: { grounding: { required: true } },
      run_id: "r-resume",
      execution_id: "exec-cp",
      policy_id: "p",
    });
    expect(missing.decision).toBe("DENY");

    // Valid re-verify on same execution
    const valid = evaluatePreExecute({
      node: node("task-a"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: art,
          project_id: "proj-a",
          task_id: "task-a",
        },
      },
      run_id: "r-resume",
      execution_id: "exec-cp",
      policy_id: "p",
    });
    expect(valid.decision).toBe("ALLOW");
  });
});

describe("MUTATION detectors — grounding", () => {
  it("MUTATION accept-caller-status: property forbids ALLOW on status alone", () => {
    const ws = join(tmpdir(), `mut-ground-${randomUUID()}`);
    mkdirSync(ws, { recursive: true });
    try {
      const r = evaluatePreExecute({
        node: node("t"),
        provider,
        authority: { workspaceRoot: ws, allowWrite: true },
        gateContext: { grounding: { required: true, status: "satisfied" } },
        run_id: "r",
        execution_id: "e",
        policy_id: "p",
      });
      // If this ALLOW, the mutation "accept caller status" has landed.
      expect(r.decision).not.toBe("ALLOW");
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it("MUTATION remove-evidence-verification: positive path still needs provenance", () => {
    const ws = join(tmpdir(), `mut-prov-${randomUUID()}`);
    mkdirSync(ws, { recursive: true });
    try {
      mkdirSync(join(ws, "evidence"), { recursive: true });
      writeFileSync(
        join(ws, "evidence/gate.knowledge-grounding.json"),
        JSON.stringify({
          gate: "knowledge-grounding",
          status: "satisfied",
          execution_id: "e",
          task_id: "t",
          project_id: "p",
          // missing source_ids
        }),
      );
      const v = verifyGateAttestationArtifact({
        workspaceRoot: ws,
        artifactPath: "evidence/gate.knowledge-grounding.json",
        expectedGate: "knowledge-grounding",
        expectedExecutionId: "e",
        expectedTaskId: "t",
        expectedProjectId: "p",
      });
      expect(v.ok).toBe(false);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it("MUTATION completion-accepts-invalid-grounding: required without artifact never ALLOW", () => {
    const ws = join(tmpdir(), `mut-complete-${randomUUID()}`);
    mkdirSync(ws, { recursive: true });
    try {
      const r = evaluatePreExecute({
        node: node("t"),
        provider,
        authority: { workspaceRoot: ws, allowWrite: true },
        gateContext: { grounding: { required: true, status: "exempt" } },
        run_id: "r",
        execution_id: "e",
        policy_id: "p",
      });
      expect(r.decision).toBe("DENY");
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
