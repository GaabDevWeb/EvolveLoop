/**
 * EvolveLoop V2 — Final integrity campaign (pre-freeze).
 * ATTACK → VERIFY → CLASSIFY. Disposable fixtures only.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  symlinkSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { evaluatePreExecute } from "../../src/gates/runtime-gates.js";
import { verifyGateAttestationArtifact } from "../../src/gates/attestation.js";
import {
  validateCheckpoint,
  saveCheckpoint,
  loadAndValidateCheckpoint,
  CHECKPOINT_SCHEMA_VERSION,
  type EngineCheckpoint,
} from "../../src/jobs/checkpoint.js";
import { buildWorkerEvidence, validateEvidenceV21 } from "../../src/evidence/builders.js";
import { jobResultToExecuteResult } from "../../src/jobs/job-resume.js";
import { authorize, pathEscapesWorkspace } from "../../src/authority/capability-authority.js";
import {
  filesystemWrite,
  filesystemRead,
} from "../../src/providers/deterministic/filesystem.js";
import { PathEscapeError, assertWithinWorkspace } from "../../src/providers/deterministic/paths.js";
import { isForbiddenPath } from "../../src/engineering/scope.js";
import { resolveAutonomousModule } from "../../src/plugins/autonomous-module-resolve.js";
import { ForbiddenPathError } from "../../src/providers/deterministic/paths.js";
import type { GraphNode, ProviderEntry, SkillJob, SkillJobResult } from "../../src/types/index.js";
import type { CapabilityIR, ExecutionPolicy } from "../../src/types/index.js";

const FINDINGS: Array<{
  id: string;
  area: string;
  attack: string;
  result: "DENY" | "DETECT" | "PASS_LEGIT" | "LIMITED" | "UNSAFE";
  classification?: string;
  detail: string;
}> = [];

function record(
  id: string,
  area: string,
  attack: string,
  result: (typeof FINDINGS)[0]["result"],
  detail: string,
  classification?: string,
) {
  FINDINGS.push({ id, area, attack, result, detail, classification });
}

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

function minimalIr(nodes: GraphNode[]): CapabilityIR {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityGraph",
    metadata: { id: "ir-1", ir_version: "2.0.0", policy_ref: "p1" },
    spec: {
      nodes: nodes.map(({ status: _s, retry_count: _r, ...n }) => n),
    },
  };
}

function minimalPolicy(id = "p1"): ExecutionPolicy {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "ExecutionPolicy",
    metadata: { id, version: "1" },
    spec: {
      retries: { default: 2 },
      max_replans: 2,
      fail_fast: false,
    },
  } as ExecutionPolicy;
}

function validCheckpoint(partial: Partial<EngineCheckpoint> & { feature_id: string; execution_id: string }): EngineCheckpoint {
  const n = node("a");
  const ir = minimalIr([n]);
  const policy = minimalPolicy();
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "EngineCheckpoint",
    checkpoint_schema_version: CHECKPOINT_SCHEMA_VERSION,
    checkpoint_id: randomUUID(),
    revision: 1,
    feature_id: partial.feature_id,
    execution_id: partial.execution_id,
    policy_id: "p1",
    ir_id: "ir-1",
    plan_version: 1,
    plan_hash: "hash-1",
    current_ir: ir,
    policy_snapshot: policy,
    graph: { feature_id: partial.feature_id, nodes: [{ ...n, status: "pending" }] },
    accounting: {
      iterations: 1,
      replans: 0,
      total_retries: 0,
      provider_attempts: 1,
      fallback_switches: 0,
      nodes_completed: 0,
      tokens_used: 0,
      tokens_unknown_events: 0,
      started_at_ms: Date.now(),
      providers_tried: {},
      fallback_count: {},
    },
    replan_count: 0,
    recent_plan_hashes: ["hash-1"],
    feature_started_at: new Date().toISOString(),
    delivery_semantics: "AT_LEAST_ONCE",
    saved_at: new Date().toISOString(),
    ...partial,
  } as EngineCheckpoint;
}

describe("V2 Final Integrity — Checkpoint", () => {
  let dir: string;
  beforeEach(() => {
    dir = join(tmpdir(), `fi-cp-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("valid schema + semantics → ok", () => {
    const cp = validCheckpoint({ feature_id: "f1", execution_id: "e1" });
    const v = validateCheckpoint(cp);
    expect(v.ok).toBe(true);
    record("FI-CP-01", "checkpoint", "valid", "PASS_LEGIT", "ok");
  });

  it("impossible accounting detected", () => {
    const cp = validCheckpoint({ feature_id: "f1", execution_id: "e1" });
    cp.accounting.nodes_completed = 99;
    const v = validateCheckpoint(cp);
    expect(v.ok).toBe(false);
    record("FI-CP-02", "checkpoint", "inflated nodes_completed", "DETECT", String(!v.ok && v.reason));
  });

  it("negative accounting detected", () => {
    const cp = validCheckpoint({ feature_id: "f1", execution_id: "e1" });
    cp.accounting.total_retries = -1;
    expect(validateCheckpoint(cp).ok).toBe(false);
    record("FI-CP-03", "checkpoint", "negative retries", "DETECT", "corrupt");
  });

  it("policy/replan inflation detected", () => {
    const cp = validCheckpoint({ feature_id: "f1", execution_id: "e1" });
    cp.replan_count = 99;
    (cp.policy_snapshot.spec as { max_replans: number }).max_replans = 2;
    expect(validateCheckpoint(cp).ok).toBe(false);
    record("FI-CP-04", "checkpoint", "replan exceeds policy", "DETECT", "corrupt");
  });

  it("ir_id lineage mismatch detected", () => {
    const cp = validCheckpoint({ feature_id: "f1", execution_id: "e1" });
    cp.ir_id = "other-ir";
    expect(validateCheckpoint(cp).ok).toBe(false);
    record("FI-CP-05", "checkpoint", "ir lineage mismatch", "DETECT", "corrupt");
  });

  it("HMAC residual: semantically-consistent forge still loads (LIMITED)", () => {
    // Attacker with jobsDir write rewrites a coherent checkpoint claiming a completed.
    const n = node("a");
    n.status = "satisfied";
    const cp = validCheckpoint({
      feature_id: "f-forge",
      execution_id: "e-attacker",
      graph: { feature_id: "f-forge", nodes: [n] },
      accounting: {
        iterations: 3,
        replans: 0,
        total_retries: 0,
        provider_attempts: 3,
        fallback_switches: 0,
        nodes_completed: 1,
        tokens_used: 10,
        tokens_unknown_events: 0,
        started_at_ms: Date.now(),
        providers_tried: { a: ["p"] },
        fallback_count: {},
      },
    });
    saveCheckpoint(dir, cp);
    const loaded = loadAndValidateCheckpoint(dir, "f-forge");
    // Without HMAC, coherent forge is accepted — LIMITED, not silent schema-only corruption
    expect(loaded.ok).toBe(true);
    record(
      "FI-CP-HMAC",
      "checkpoint",
      "coherent forge without HMAC",
      "LIMITED",
      "loads=true; no cryptographic authenticity",
      "ACCEPTED_V2_LIMITATION",
    );
  });

  it("cross-feature file name isolation (copied checkpoint under wrong feature id path)", () => {
    const cp = validCheckpoint({ feature_id: "proj-A", execution_id: "e1" });
    saveCheckpoint(dir, cp);
    // Copy bytes under another feature id — load by that id reads the forged file
    const src = join(dir, "checkpoints", "proj-A.json");
    const dst = join(dir, "checkpoints", "proj-B.json");
    writeFileSync(dst, readFileSync(src));
    const loaded = loadAndValidateCheckpoint(dir, "proj-B");
    // Schema may pass but feature_id inside still says proj-A — recovery must not trust name alone
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.checkpoint.feature_id).toBe("proj-A");
      record(
        "FI-CP-CROSS",
        "checkpoint",
        "copied checkpoint cross-feature path",
        "LIMITED",
        "file loads; inner feature_id mismatch vs path — caller must bind",
        "ACCEPTED_V2_LIMITATION",
      );
    }
  });

  it("corrupt JSON detected", () => {
    mkdirSync(join(dir, "checkpoints"), { recursive: true });
    writeFileSync(join(dir, "checkpoints", "bad.json"), "{not-json");
    const v = loadAndValidateCheckpoint(dir, "bad");
    expect(v.ok).toBe(false);
    record("FI-CP-06", "checkpoint", "corrupt JSON", "DETECT", String(!v.ok && v.reason));
  });
});

describe("V2 Final Integrity — Attestation planting", () => {
  let ws: string;
  beforeEach(() => {
    ws = join(tmpdir(), `fi-att-${randomUUID()}`);
    mkdirSync(join(ws, "evidence"), { recursive: true });
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  function plant(name: string, doc: Record<string, unknown>) {
    const rel = `evidence/${name}`;
    writeFileSync(join(ws, rel), JSON.stringify(doc));
    return rel;
  }

  it("trust model: existence alone is NOT authenticity (planted file with wrong binding → DENY)", () => {
    const art = plant("gate.grill-me.json", {
      gate: "grill-me",
      status: "satisfied",
      feature_id: "feat-OTHER",
      execution_id: "exec-OTHER",
    });
    const r = evaluatePreExecute({
      node: node("n1", "planning"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grill_me: {
          risk_tier: "sensitive",
          phase05_active: true,
          docs_approved: true,
          artifact_path: art,
        },
        attestation_binding: { feature_id: "feat-1" },
      },
      run_id: "r",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
    record(
      "FI-ATT-01",
      "attestation",
      "planted wrong-binding artifact",
      "DENY",
      "existence≠trust for wrong context",
    );
  });

  it("same-context planted artifact CAN authorize (no HMAC) — LIMITED", () => {
    const art = plant("gate.grill-me.json", {
      gate: "grill-me",
      status: "satisfied",
      feature_id: "feat-1",
      execution_id: "exec-1",
    });
    const r = evaluatePreExecute({
      node: node("n1", "planning"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grill_me: {
          risk_tier: "sensitive",
          phase05_active: true,
          docs_approved: true,
          artifact_path: art,
        },
        attestation_binding: { feature_id: "feat-1" },
      },
      run_id: "r",
      execution_id: "exec-1",
      policy_id: "p",
    });
    expect(r.decision).toBe("ALLOW");
    record(
      "FI-ATT-PLANT",
      "attestation",
      "same-context workspace plant",
      "LIMITED",
      "workspace writer can satisfy gate without cryptographic creator proof",
      "ACCEPTED_V2_LIMITATION",
    );
  });

  it("copy artifact from other execution → DENY", () => {
    const art = plant("gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "exec-OLD",
      task_id: "n1",
      project_id: "proj",
      source_ids: ["wiki:x"],
    });
    const r = evaluatePreExecute({
      node: node("n1"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: {
        grounding: {
          required: true,
          artifact_path: art,
          project_id: "proj",
          task_id: "n1",
        },
      },
      run_id: "r",
      execution_id: "exec-NEW",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
    record("FI-ATT-02", "attestation", "cross-execution copy", "DENY", "execution binding");
  });

  it("tamper after emit → INVALID", () => {
    const art = plant("gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "e1",
      task_id: "n1",
      project_id: "p1",
      source_ids: ["wiki:ok"],
    });
    expect(
      verifyGateAttestationArtifact({
        workspaceRoot: ws,
        artifactPath: art,
        expectedGate: "knowledge-grounding",
        expectedExecutionId: "e1",
        expectedTaskId: "n1",
        expectedProjectId: "p1",
      }).ok,
    ).toBe(true);
    plant("gate.knowledge-grounding.json", {
      gate: "knowledge-grounding",
      status: "satisfied",
      execution_id: "e1",
      task_id: "TAMPERED",
      project_id: "p1",
      source_ids: ["wiki:ok"],
    });
    expect(
      verifyGateAttestationArtifact({
        workspaceRoot: ws,
        artifactPath: art,
        expectedGate: "knowledge-grounding",
        expectedExecutionId: "e1",
        expectedTaskId: "n1",
        expectedProjectId: "p1",
      }).ok,
    ).toBe(false);
    record("FI-ATT-03", "attestation", "post-emit tamper", "DETECT", "task mismatch");
  });

  it("caller status without artifact → DENY (grill-me / grounding / image)", () => {
    for (const [label, gateContext] of [
      [
        "grill-me",
        {
          grill_me: {
            risk_tier: "sensitive" as const,
            phase05_active: true,
            docs_approved: true,
            evidence_status: "satisfied" as const,
          },
        },
      ],
      ["grounding", { grounding: { required: true, status: "satisfied" as const } }],
      [
        "image-to-code",
        {
          image_to_code: {
            image_attachment: true,
            evidence_status: "satisfied" as const,
          },
        },
      ],
    ] as const) {
      const r = evaluatePreExecute({
        node: node("n1"),
        provider,
        authority: { workspaceRoot: ws, allowWrite: true },
        gateContext,
        run_id: "r",
        execution_id: "e",
        policy_id: "p",
      });
      expect(r.decision).toBe("DENY");
      record(`FI-ATT-CALLER-${label}`, "attestation", `caller ${label}`, "DENY", r.reason ?? "");
    }
  });
});

describe("V2 Final Integrity — Grounding / completion / evidence", () => {
  let ws: string;
  beforeEach(() => {
    ws = join(tmpdir(), `fi-g-${randomUUID()}`);
    mkdirSync(ws, { recursive: true });
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("forged grounding status → DENY", () => {
    const r = evaluatePreExecute({
      node: node("t"),
      provider,
      authority: { workspaceRoot: ws, allowWrite: true },
      gateContext: { grounding: { required: true, status: "satisfied" } },
      run_id: "r",
      execution_id: "e",
      policy_id: "p",
    });
    expect(r.decision).toBe("DENY");
    record("FI-GR-01", "grounding", "forged status", "DENY", "ok");
  });

  it("job-resume without evidence_path → fail-closed (no invented PASS)", () => {
    const job = {
      run_id: "run-1",
      provider_id: "testing",
      skill_path: "/x",
      capability: "testing",
      node_id: "n1",
      created_at: new Date().toISOString(),
      status: "completed",
    } as SkillJob;
    const result = { success: true } as SkillJobResult;
    const er = jobResultToExecuteResult(job, result, node("n1"));
    expect(er.success).toBe(false);
    expect(er.error?.code).toBe("EVIDENCE_MISSING");
    record("FI-EV-RESUME", "evidence", "missing evidence invent PASS", "DENY", "fail-closed", "MUST_FIX_BEFORE_FREEZE_CLOSED");
  });

  it("stale lineage evidence rejected", () => {
    const n = node("n1");
    const ev = buildWorkerEvidence(n, "run-1", "p", 1, {
      checkResults: [{ dod_id: "d1", result: "pass", details: "ok" }],
      status: "complete",
      execution_id: "exec-real",
      agent_id: "agent-real",
    });
    const tampered = structuredClone(ev);
    tampered.metadata.run_id = "forged";
    const v = validateEvidenceV21(tampered, n.definition_of_done, n, 0, {
      run_id: "run-1",
      agent_id: "agent-real",
      execution_id: "exec-real",
    });
    expect(v.valid).toBe(false);
    record("FI-EV-LIN", "evidence", "lineage tamper", "DETECT", v.reason ?? "");
  });

  it("default evidence is not auto-PASS", () => {
    const ev = buildWorkerEvidence(node("n1"), "r", "p", 1);
    expect(ev.spec.status).toBe("partial");
    record("FI-EV-AUTO", "evidence", "auto-PASS", "DENY", "partial default");
  });
});

describe("V2 Final Integrity — Symlink TOCTOU", () => {
  let ws: string;
  beforeEach(() => {
    ws = join(tmpdir(), `fi-toctou-${randomUUID()}`);
    mkdirSync(join(ws, "safe"), { recursive: true });
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("direct symlink escape → DETECT at assert", () => {
    const outside = join(tmpdir(), `out-${randomUUID()}.txt`);
    writeFileSync(outside, "secret");
    try {
      symlinkSync(outside, join(ws, "safe", "link.txt"));
      let denied = false;
      try {
        assertWithinWorkspace(ws, "safe/link.txt");
      } catch (e) {
        denied = e instanceof PathEscapeError || (e as Error).name === "PathEscapeError";
      }
      expect(denied).toBe(true);
      record("FI-TOCTOU-01", "workspace", "symlink escape", "DETECT", "realpath deny");
    } finally {
      rmSync(outside, { force: true });
    }
  });

  it("TOCTOU check→replace→use is LIMITED without OS sandbox", () => {
    // 1) validate safe file 2) replace with symlink 3) subsequent use may race
    writeFileSync(join(ws, "safe", "target.txt"), "ok");
    assertWithinWorkspace(ws, "safe/target.txt");
    const outside = join(tmpdir(), `race-${randomUUID()}.txt`);
    writeFileSync(outside, "escaped");
    try {
      unlinkSync(join(ws, "safe", "target.txt"));
      symlinkSync(outside, join(ws, "safe", "target.txt"));
      // After replacement, assert must still deny
      let denied = false;
      try {
        assertWithinWorkspace(ws, "safe/target.txt");
      } catch {
        denied = true;
      }
      expect(denied).toBe(true);
      record(
        "FI-TOCTOU-02",
        "workspace",
        "check-then-replace",
        "LIMITED",
        "post-replace assert denies; true TOCTOU race between check and open remains without OS sandbox",
        "ACCEPTED_V2_LIMITATION",
      );
    } finally {
      rmSync(outside, { force: true });
    }
  });

  it("rename / delete-recreate still confined on re-check", () => {
    writeFileSync(join(ws, "safe", "a.txt"), "1");
    assertWithinWorkspace(ws, "safe/a.txt");
    renameSync(join(ws, "safe", "a.txt"), join(ws, "safe", "b.txt"));
    expect(() => assertWithinWorkspace(ws, "safe/b.txt")).not.toThrow();
    unlinkSync(join(ws, "safe", "b.txt"));
    writeFileSync(join(ws, "safe", "b.txt"), "2");
    expect(() => assertWithinWorkspace(ws, "safe/b.txt")).not.toThrow();
    record("FI-TOCTOU-03", "workspace", "rename recreate", "PASS_LEGIT", "in-workspace ok");
  });
});

describe("V2 Final Integrity — Authority / historical / mutations", () => {
  let ws: string;
  beforeEach(() => {
    ws = join(tmpdir(), `fi-auth-${randomUUID()}`);
    mkdirSync(ws, { recursive: true });
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("workspace escape + missing root + .env", () => {
    expect(pathEscapesWorkspace("../etc/passwd", ws)).toBe(true);
    expect(
      authorize({
        capability: "filesystem.write",
        permissions: { filesystem: "write" },
        context: { allowWrite: true },
      }).decision,
    ).toBe("deny");
    writeFileSync(join(ws, ".env"), "SECRET=1");
    expect(isForbiddenPath(".env")).toBe(true);
    let denied = false;
    try {
      filesystemRead(ws, ".env");
    } catch (e) {
      denied = e instanceof ForbiddenPathError || (e as Error).name === "ForbiddenPathError";
    }
    expect(denied).toBe(true);
    record("FI-HIST-WS", "authority", "escape/.env/root", "DENY", "ok");
  });

  it("arbitrary autonomous import denied", () => {
    expect(resolveAutonomousModule(ws, "../../evil.mjs").ok).toBe(false);
    expect(resolveAutonomousModule(ws, "/tmp/x.mjs").ok).toBe(false);
    record("FI-HIST-AUTO", "autonomous", "traversal/absolute", "DENY", "ok");
  });

  it("MUTATION detectors M1–M6 properties", () => {
    // M1/M2 grounding
    expect(
      evaluatePreExecute({
        node: node("t"),
        provider,
        authority: { workspaceRoot: ws, allowWrite: true },
        gateContext: { grounding: { required: true, status: "satisfied" } },
        run_id: "r",
        execution_id: "e",
        policy_id: "p",
      }).decision,
    ).toBe("DENY");

    // M3 checkpoint semantic
    const cp = validCheckpoint({ feature_id: "f", execution_id: "e" });
    cp.accounting.nodes_completed = 50;
    expect(validateCheckpoint(cp).ok).toBe(false);

    // M4 workspaceRoot
    expect(
      authorize({
        capability: "filesystem.write",
        permissions: { filesystem: "write" },
        context: { allowWrite: true },
      }).decision,
    ).toBe("deny");

    // M5 forged evidence default
    expect(buildWorkerEvidence(node("n"), "r", "p", 1).spec.status).not.toBe("complete");

    // M6 stale lineage
    const n = node("n");
    const ev = buildWorkerEvidence(n, "run-1", "p", 1, {
      checkResults: [{ dod_id: "d1", result: "pass", details: "x" }],
      status: "complete",
      execution_id: "e1",
    });
    const bad = structuredClone(ev);
    (bad.metadata as { run_id: string }).run_id = "other";
    expect(
      validateEvidenceV21(bad, n.definition_of_done, n, 0, {
        run_id: "run-1",
        execution_id: "e1",
      }).valid,
    ).toBe(false);

    record("FI-MUT-M1-6", "mutation", "M1-M6", "DETECT", "all properties hold");
  });
});

describe("V2 Final Integrity — WIKI_ROOT classification", () => {
  it("WIKI_ROOT is product knowledge config, not freeze-blocker when unset", async () => {
    const prev = process.env.WIKI_ROOT;
    delete process.env.WIKI_ROOT;
    delete process.env.RAG_REPO_ROOT;
    const { resolveWikiRoot } = await import("../../src/knowledge/backend/wiki-backend.js");
    expect(resolveWikiRoot()).toBe("");
    // Product degrades; Runtime gates do not require WIKI_ROOT for A03
    if (prev !== undefined) process.env.WIKI_ROOT = prev;
    record(
      "FI-WIKI",
      "wiki",
      "WIKI_ROOT unset",
      "LIMITED",
      "required for wiki knowledge backend retrieval; optional for deterministic Runtime gates; agent log writer env",
      "ACCEPTED_V2_LIMITATION",
    );
  });
});

describe("V2 Final Integrity — summary export", () => {
  it("writes findings dump", () => {
    const out = join(
      tmpdir(),
      `v2-final-integrity-findings-${randomUUID()}.json`,
    );
    writeFileSync(out, JSON.stringify(FINDINGS, null, 2));
    const dump = process.env.V2_INTEGRITY_DUMP;
    if (dump) {
      mkdirSync(dump, { recursive: true });
      writeFileSync(join(dump, "final-integrity-findings.json"), JSON.stringify(FINDINGS, null, 2));
    }
    const unsafe = FINDINGS.filter((f) => f.result === "UNSAFE");
    expect(unsafe.length).toBe(0);
    expect(FINDINGS.length).toBeGreaterThan(10);
  });
});
