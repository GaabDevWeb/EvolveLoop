/**
 * EvolveLoop V2 — RED TEAM adversarial campaign harness (post-remediation).
 * Expectation after fixes: attacks are DENY/fail-closed with no forbidden side effects.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { authorize, pathEscapesWorkspace } from "../../src/authority/capability-authority.js";
import { evaluatePreExecute } from "../../src/gates/runtime-gates.js";
import {
  validateCheckpoint,
  saveCheckpoint,
  loadAndValidateCheckpoint,
  claimExecutionRecovery,
  checkpointPath,
  CHECKPOINT_SCHEMA_VERSION,
  type EngineCheckpoint,
} from "../../src/jobs/checkpoint.js";
import { buildWorkerEvidence, validateEvidenceV21 } from "../../src/evidence/builders.js";
import {
  filesystemWrite,
  filesystemRead,
} from "../../src/providers/deterministic/filesystem.js";
import { PathEscapeError, ForbiddenPathError } from "../../src/providers/deterministic/paths.js";
import { isForbiddenPath } from "../../src/engineering/scope.js";
import { PolicyEngine } from "../../src/policies/policy-engine.js";
import type { GraphNode, ProviderEntry } from "../../src/types/index.js";
import {
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
  buildRegistryFromManifests,
} from "../../src/index.js";

const FINDINGS: Array<{
  id: string;
  severity: string;
  component: string;
  attack: string;
  expected: string;
  observed: string;
  broken: boolean;
}> = [];

function record(
  id: string,
  severity: string,
  component: string,
  attack: string,
  expected: string,
  observed: string,
  broken: boolean,
) {
  FINDINGS.push({ id, severity, component, attack, expected, observed, broken });
}

function baseNode(capability: string, constraints?: Record<string, unknown>): GraphNode {
  return {
    id: "n1",
    capability,
    type: "worker",
    dependencies: [],
    definition_of_done: [{ id: "d1", check: "must pass real test", verification: "automated" }],
    status: "pending",
    retry_count: 0,
    constraints,
  };
}

const provider: ProviderEntry = {
  id: "prov",
  priority: 1,
  cost: "low",
  quality_score: 1,
  availability: "active",
  version: "1",
};

let workspace: string;
let jobsDir: string;

beforeEach(() => {
  workspace = join(tmpdir(), `el-rt-${randomUUID()}`);
  jobsDir = join(workspace, "jobs");
  mkdirSync(workspace, { recursive: true });
  mkdirSync(join(workspace, "safe"), { recursive: true });
  mkdirSync(jobsDir, { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("RT-A03 authority / gates (remediated)", () => {
  it("RT-A03-01 forged grill-me satisfied → DENY + provider never runs", async () => {
    const r = evaluatePreExecute({
      node: baseNode("planning"),
      provider,
      authority: { allowWrite: true, workspaceRoot: workspace },
      gateContext: {
        grill_me: {
          risk_tier: "sensitive",
          phase05_active: true,
          docs_approved: false,
          evidence_status: "satisfied",
        },
      },
      run_id: "r",
      execution_id: "e",
      policy_id: "p",
    });
    const broken = r.decision !== "DENY";
    record(
      "RT-A03-01",
      "CRITICAL",
      "runtime-gates",
      "forge grill_me.evidence_status=satisfied without artifact",
      "DENY",
      `decision=${r.decision} reason=${r.reason}`,
      broken,
    );
    expect(r.decision).toBe("DENY");

    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "prov-demo.work",
          priority: 100,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
      },
    ]);
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      authorityContext: { workspaceRoot: workspace, allowWrite: true },
      gateContext: {
        grill_me: {
          risk_tier: "sensitive",
          phase05_active: true,
          docs_approved: true,
          evidence_status: "satisfied",
        },
      },
    });
    await engine.run({
      ir: {
        apiVersion: "capability-orchestrator.io/v2",
        kind: "CapabilityGraph",
        metadata: { id: "rt", ir_version: "2.0.0", policy_ref: "rapid-prototype", plan_version: 1 },
        spec: {
          nodes: [
            {
              id: "step-a",
              capability: "demo.work",
              type: "worker",
              dependencies: [],
              definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
            },
          ],
        },
      },
    });
    expect(mock.getExecuteCount()).toBe(0);
  });

  it("RT-A03-02 fail_closed_missing_attestation with missing grill-me → DENY", () => {
    const node = {
      ...baseNode("planning"),
      metadata: { require: ["grill-me"] },
    };
    const r = evaluatePreExecute({
      node,
      provider,
      authority: { allowWrite: true, workspaceRoot: workspace },
      gateContext: { fail_closed_missing_attestation: true },
      run_id: "r",
      execution_id: "e",
      policy_id: "p",
    });
    const broken = r.decision !== "DENY";
    record(
      "RT-A03-02",
      "HIGH",
      "runtime-gates",
      "fail_closed_missing_attestation=true with missing grill_me",
      "DENY",
      `decision=${r.decision} reason=${r.reason}`,
      broken,
    );
    expect(r.decision).toBe("DENY");
  });

  it("RT-A03-03 pathEscapesWorkspace true when workspaceRoot omitted", () => {
    const escapes = pathEscapesWorkspace("../../etc/passwd", undefined);
    record(
      "RT-A03-03",
      "CRITICAL",
      "capability-authority",
      "path escape check with undefined workspaceRoot",
      "escapes=true",
      `pathEscapesWorkspace=${escapes}`,
      escapes !== true,
    );
    expect(escapes).toBe(true);
  });

  it("RT-A03-04 authorize denies write without workspaceRoot", () => {
    const a = authorize({
      capability: "filesystem.write",
      permissions: { filesystem: "write" },
      targetPath: "/etc/passwd",
      context: { allowWrite: true },
    });
    record(
      "RT-A03-04",
      "CRITICAL",
      "capability-authority",
      "write with allowWrite:true and no workspaceRoot",
      "deny",
      `decision=${a.decision} reason=${a.reason}`,
      a.decision !== "deny",
    );
    expect(a.decision).toBe("deny");
  });

  it("RT-A03-05 deterministic FS rejects traversal when root set", () => {
    let blocked = false;
    try {
      filesystemWrite(workspace, "../outside.txt", "pwn");
    } catch (e) {
      blocked = e instanceof PathEscapeError;
    }
    expect(blocked).toBe(true);
    record("RT-A03-05", "INFO", "filesystem", "../ traversal", "blocked", `blocked=${blocked}`, false);
  });

  it("RT-A03-06 symlink escape denied", () => {
    const outside = join(tmpdir(), `el-secret-${randomUUID()}.txt`);
    writeFileSync(outside, "SECRET_VALUE_FAKE");
    const linkPath = join(workspace, "safe", "leak.txt");
    symlinkSync(outside, linkPath);
    let threw = false;
    let leaked = false;
    try {
      const r = filesystemRead(workspace, "safe/leak.txt");
      leaked = (r.content ?? "").includes("SECRET_VALUE_FAKE");
    } catch (e) {
      threw = e instanceof PathEscapeError;
    }
    const broken = leaked && !threw;
    record(
      "RT-A03-06",
      "HIGH",
      "deterministic/filesystem",
      "symlink to absolute outside path then read",
      "DENY symlink escape",
      `threw=${threw} leaked=${leaked}`,
      broken,
    );
    rmSync(outside, { force: true });
    expect(threw).toBe(true);
    expect(leaked).toBe(false);
  });
});

describe("RT-B04 checkpoint corruption (remediated)", () => {
  function validCp(overrides: Partial<EngineCheckpoint> = {}): EngineCheckpoint {
    const pe = new PolicyEngine();
    const policy = pe.resolve("high-reliability");
    return {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "EngineCheckpoint",
      checkpoint_schema_version: CHECKPOINT_SCHEMA_VERSION,
      checkpoint_id: randomUUID(),
      revision: 1,
      feature_id: "feat-rt",
      execution_id: "exec-1",
      policy_id: policy.metadata.id,
      ir_id: "ir-1",
      plan_version: 1,
      plan_hash: "hash-a",
      current_ir: {
        apiVersion: "capability-orchestrator.io/v2",
        kind: "CapabilityGraph",
        metadata: { id: "ir-1", ir_version: "2.0.0", policy_ref: policy.metadata.id, plan_version: 1 },
        spec: { nodes: [] },
      },
      policy_snapshot: policy,
      graph: { feature_id: "feat-rt", nodes: [] },
      accounting: {
        iterations: 0,
        replans: 0,
        total_retries: 0,
        provider_attempts: 0,
        fallback_switches: 0,
        nodes_completed: 0,
        tokens_used: 0,
        tokens_unknown_events: 0,
        started_at_ms: Date.now(),
        providers_tried: {},
        fallback_count: {},
      },
      replan_count: 0,
      recent_plan_hashes: [],
      feature_started_at: new Date().toISOString(),
      delivery_semantics: "AT_LEAST_ONCE",
      saved_at: new Date().toISOString(),
      ...overrides,
    };
  }

  it("RT-B04-01 truncated JSON → CORRUPT", () => {
    const path = checkpointPath(jobsDir, "feat-trunc");
    mkdirSync(join(jobsDir, "checkpoints"), { recursive: true });
    writeFileSync(path, '{"kind":"EngineCheckpoint","checkpoint_schema_version":2');
    const v = loadAndValidateCheckpoint(jobsDir, "feat-trunc");
    expect(v.ok).toBe(false);
    record("RT-B04-01", "INFO", "checkpoint", "truncated JSON", "ok:false", `ok=${v.ok}`, false);
  });

  it("RT-B04-02 negative/inflated accounting rejected", () => {
    const forged = validCp({
      accounting: {
        iterations: -1,
        replans: 9999,
        total_retries: -5,
        provider_attempts: 0,
        fallback_switches: 0,
        nodes_completed: 99999,
        tokens_used: -100,
        tokens_unknown_events: 0,
        started_at_ms: Date.now(),
        providers_tried: {},
        fallback_count: {},
      },
    });
    const v = validateCheckpoint(forged);
    record(
      "RT-B04-02",
      "CRITICAL",
      "checkpoint",
      "negative/inflated accounting",
      "reject",
      `ok=${v.ok}`,
      v.ok === true,
    );
    expect(v.ok).toBe(false);
  });

  it("RT-B04-03 FS overwrite with impossible nodes_completed rejected", () => {
    const pe = new PolicyEngine();
    const policy = pe.resolve("rapid-prototype");
    saveCheckpoint(jobsDir, {
      revision: 1,
      feature_id: "feat-tamper",
      execution_id: "e1",
      policy_id: policy.metadata.id,
      ir_id: "ir-1",
      plan_version: 1,
      plan_hash: "h1",
      current_ir: validCp().current_ir,
      policy_snapshot: policy,
      graph: { feature_id: "feat-tamper", nodes: [] },
      accounting: validCp().accounting,
      replan_count: 0,
      recent_plan_hashes: [],
      feature_started_at: new Date().toISOString(),
      delivery_semantics: "AT_LEAST_ONCE",
    });
    const path = checkpointPath(jobsDir, "feat-tamper");
    const raw = JSON.parse(readFileSync(path, "utf-8")) as EngineCheckpoint;
    raw.accounting.nodes_completed = 1000;
    raw.revision = 50;
    raw.terminal = true;
    writeFileSync(path, JSON.stringify(raw));
    const loaded = loadAndValidateCheckpoint(jobsDir, "feat-tamper");
    const broken = loaded.ok === true;
    record(
      "RT-B04-03",
      "CRITICAL",
      "checkpoint",
      "FS tamper inflated nodes_completed",
      "reject CORRUPT",
      `ok=${loaded.ok} code=${!loaded.ok ? loaded.code : "n/a"}`,
      broken,
    );
    expect(loaded.ok).toBe(false);
  });

  it("RT-B04-04 concurrent claim — single owner", () => {
    const pe = new PolicyEngine();
    const policy = pe.resolve("rapid-prototype");
    saveCheckpoint(jobsDir, {
      revision: 1,
      feature_id: "feat-race",
      execution_id: "e1",
      policy_id: policy.metadata.id,
      ir_id: "ir-1",
      plan_version: 1,
      plan_hash: "h1",
      current_ir: validCp().current_ir,
      policy_snapshot: policy,
      graph: { feature_id: "feat-race", nodes: [] },
      accounting: validCp().accounting,
      replan_count: 0,
      recent_plan_hashes: [],
      feature_started_at: new Date().toISOString(),
      delivery_semantics: "AT_LEAST_ONCE",
    });
    const a = claimExecutionRecovery(jobsDir, "feat-race", { workerId: "w1", leaseMs: 60_000 });
    const b = claimExecutionRecovery(jobsDir, "feat-race", { workerId: "w2", leaseMs: 60_000 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    record("RT-B04-04", "INFO", "lease", "dual claim", "one owner", `a=${a.ok} b=${b.ok}`, false);
  });
});

describe("RT-EVIDENCE (remediated)", () => {
  it("RT-EV-01 buildWorkerEvidence does not auto-pass DoD", () => {
    const node = baseNode("demo.work");
    const ev = buildWorkerEvidence(node, "run-1", "mock", 1);
    const forgedPass =
      ev.spec.status === "complete" &&
      ev.spec.checks.every((c) => c.result === "pass");
    record(
      "RT-EV-01",
      "CRITICAL",
      "evidence/builders",
      "auto DoD pass without verification",
      "partial/skip not complete pass",
      `status=${ev.spec.status} forgedPass=${forgedPass}`,
      forgedPass,
    );
    expect(forgedPass).toBe(false);
    expect(ev.spec.status).toBe("partial");
  });

  it("RT-EV-02 lineage tamper rejected when expected lineage supplied", () => {
    const node = baseNode("demo.work");
    const ev = buildWorkerEvidence(node, "run-1", "mock", 1, {
      checkResults: [{ dod_id: "d1", result: "pass", details: "ok" }],
      status: "complete",
      execution_id: "exec-real",
      agent_id: "agent-real",
    });
    const tampered = structuredClone(ev) as typeof ev;
    tampered.metadata.run_id = "forged-run";
    (tampered.metadata as { agent_id?: string }).agent_id = "attacker";
    const v = validateEvidenceV21(tampered, node.definition_of_done, node, 0, {
      run_id: "run-1",
      agent_id: "agent-real",
      execution_id: "exec-real",
    });
    record(
      "RT-EV-02",
      "HIGH",
      "evidence/validator",
      "tamper run_id/agent_id",
      "invalid lineage",
      `valid=${v.valid} reason=${v.reason}`,
      v.valid === true,
    );
    expect(v.valid).toBe(false);
  });
});

describe("RT-SCOPE secrets (remediated)", () => {
  it("RT-SEC-01/03 forbidden .env read denied at FS layer", () => {
    writeFileSync(join(workspace, ".env"), "API_KEY=sk-fake-redteam-key\n");
    expect(isForbiddenPath(".env")).toBe(true);
    let denied = false;
    try {
      filesystemRead(workspace, ".env");
    } catch (e) {
      denied = e instanceof ForbiddenPathError || (e as Error).name === "ForbiddenPathError";
    }
    record(
      "RT-SEC-01",
      "MEDIUM",
      "filesystem",
      "read .env",
      "denied",
      `denied=${denied}`,
      !denied,
    );
    record(
      "RT-SEC-03",
      "HIGH",
      "scope-vs-filesystem",
      "isForbiddenPath + filesystemRead",
      "consistent deny",
      `denied=${denied}`,
      !denied,
    );
    expect(denied).toBe(true);
  });

  it("RT-SEC-02 readonly overwrite fails", () => {
    const p = join(workspace, "ro.txt");
    writeFileSync(p, "locked");
    chmodSync(p, 0o444);
    let failed = false;
    try {
      filesystemWrite(workspace, "ro.txt", "overwrite");
    } catch {
      failed = true;
    }
    const content = readFileSync(p, "utf-8");
    chmodSync(p, 0o644);
    expect(content === "locked" || failed).toBe(true);
    record("RT-SEC-02", "INFO", "filesystem", "readonly", "fail", `failed=${failed}`, false);
  });
});

describe("RT-SKILL-WIKI-01 grounding (remediated)", () => {
  it("caller-attested grounding.status=satisfied → DENY", () => {
    const r = evaluatePreExecute({
      node: baseNode("demo.work"),
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { workspaceRoot: workspace, allowWrite: true },
      gateContext: { grounding: { required: true, status: "satisfied" } },
      run_id: "r",
      execution_id: "e",
      policy_id: "p",
    });
    const broken = r.decision === "ALLOW";
    record(
      "RT-SKILL-WIKI-01",
      "CRITICAL",
      "runtime-gates/grounding",
      "forge grounding.status=satisfied",
      "DENY",
      `decision=${r.decision}`,
      broken,
    );
    expect(r.decision).toBe("DENY");
  });
});

describe("RT-AUTONOMOUS-01 provider.yaml import (remediated)", () => {
  it("path traversal autonomous.module denied", async () => {
    const { resolveAutonomousModule } = await import("../../src/plugins/autonomous-module-resolve.js");
    const r = resolveAutonomousModule(workspace, "../../evil.mjs");
    const broken = r.ok === true;
    record(
      "RT-AUTONOMOUS-01",
      "HIGH",
      "autonomous-loader",
      "provider.yaml module traversal",
      "DENY",
      `ok=${r.ok}`,
      broken,
    );
    expect(r.ok).toBe(false);
  });
});

describe("RT-campaign summary", () => {
  it("writes findings; zero broken expected after remediation", () => {
    const out = join(workspace, "REDTEAM-FINDINGS.json");
    writeFileSync(out, JSON.stringify(FINDINGS, null, 2));
    const dump = process.env.REDTEAM_DUMP;
    if (dump) {
      mkdirSync(dump, { recursive: true });
      writeFileSync(join(dump, "harness-findings.json"), JSON.stringify(FINDINGS, null, 2));
    }
    const brokenCount = FINDINGS.filter((f) => f.broken).length;
    expect(brokenCount).toBe(0);
  });
});
