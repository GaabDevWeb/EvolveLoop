import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  buildRegistryFromManifests,
  PluginLoader,
  JobFileExecutor,
  resolveDataPaths,
  FilesystemMemoryStore,
  loadCheckpoint,
  loadSessionContinuity,
  continuityEvidencePath,
  CheckpointError,
} from "../../src/index.js";
import { JobStore } from "../../src/jobs/job-store.js";
import type { CapabilityIR, Evidence, GraphNode } from "../../src/types/index.js";
import { loadYamlFile } from "../../src/registry/manifest-loader.js";

const DECISION = "V22_CONTINUITY_FIXTURE_DECISION";

function observedEvidence(
  node: GraphNode,
  runId: string,
  providerId: string,
  withDecision = false,
): Evidence {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "Evidence",
    metadata: {
      node_id: node.id,
      run_id: runId,
      emitter: "gate",
      provider_id: providerId,
      capability: node.capability,
      submitted_at: new Date().toISOString(),
    },
    spec: {
      status: "complete",
      confidence: 1,
      coverage: 1,
      assumptions: withDecision ? [`session_decision:${DECISION}`] : [],
      checks: node.definition_of_done.map((dod) => ({
        dod_id: dod.id,
        result: "pass" as const,
        verification: dod.verification,
        details: "observed",
      })),
      verdict: "passed",
    },
  };
}

const twoGateIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: "v22-continuity-ir", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
  spec: {
    nodes: [
      {
        id: "gate-a",
        capability: "testing",
        type: "gate",
        dependencies: [],
        inputs: [],
        outputs: [],
        definition_of_done: [{ id: "d1", check: "A", verification: "automated" }],
        gate: { verdict_required: true },
      },
      {
        id: "gate-b",
        capability: "testing",
        type: "gate",
        dependencies: ["gate-a"],
        inputs: [],
        outputs: [],
        definition_of_done: [{ id: "d1", check: "B", verification: "automated" }],
        gate: { verdict_required: true },
      },
    ],
  },
};

async function createEngine(jobsDir: string, memoryDir: string): Promise<ExecutionEngine> {
  const orchestratorRoot = join(import.meta.dirname, "../..");
  const agentsRoot = join(orchestratorRoot, "..");
  const providersDir = join(orchestratorRoot, "providers");

  const registry = buildRegistryFromManifests([
    {
      capability: "testing",
      provider: {
        id: "testing",
        priority: 80,
        cost: "low",
        quality_score: 0.9,
        availability: "active",
        version: "0.1.0",
      },
    },
  ]);

  const router = new ProviderRouter();
  const loader = new PluginLoader(agentsRoot);
  const manifest = loadYamlFile(join(providersDir, "testing/provider.yaml"));
  router.register(loader.load(manifest as never, new JobFileExecutor(jobsDir)));

  return new ExecutionEngine({
    registry,
    providers: router,
    agentsRoot,
    jobsDir,
    dataPaths: resolveDataPaths(join(memoryDir, "..")),
    memory: new FilesystemMemoryStore(memoryDir),
    discovery: { agentsRoot, orchestratorProvidersDir: providersDir },
    jobPollIntervalMs: 30,
  });
}

describe("V22-GOAL-004 session continuity", () => {
  it("resumes in a new process without redoing completed external jobs", async () => {
    const base = mkdtempSync(join(tmpdir(), "v22-cont-"));
    const jobsDir = join(base, "jobs");
    const dataRoot = join(base, "data");
    const paths = resolveDataPaths(dataRoot);
    mkdirSync(jobsDir, { recursive: true });

    const featureId = "v22-continuity-feature";

    const store = new JobStore(jobsDir);

    const engine1 = await createEngine(jobsDir, paths.memoryDir);
    const waiting = await engine1.run({
      ir: twoGateIR,
      policy_id: "rapid-prototype",
      feature_id: featureId,
      wait_for_jobs_ms: 0,
    });

    expect(waiting.success).toBe(false);
    expect(waiting.blocked_reason).toBe("awaiting_external_jobs");
    expect(loadCheckpoint(jobsDir, featureId)).not.toBeNull();
    expect(loadSessionContinuity(paths.memoryDir, featureId)?.next_action?.node_id).toBe("gate-a");

    let pending = store.listPending();
    expect(pending.length).toBe(1);
    expect(pending[0].node_id).toBe("gate-a");

    const jobA = pending[0];
    const nodeA: GraphNode = { ...twoGateIR.spec.nodes[0], status: "running", retry_count: 0 };
    const evidenceA = join(base, "evidence-a.json");
    writeFileSync(evidenceA, JSON.stringify(observedEvidence(nodeA, jobA.run_id, "testing", true)));
    store.completeJob(jobA.run_id, { success: true, evidence_path: evidenceA });

    const engine1b = await createEngine(jobsDir, paths.memoryDir);
    const mid = await engine1b.run({
      ir: twoGateIR,
      policy_id: "rapid-prototype",
      feature_id: featureId,
      resume: true,
      wait_for_jobs_ms: 0,
    });

    expect(mid.blocked_reason).toBe("awaiting_external_jobs");
    expect(mid.graph.nodes.find((n) => n.id === "gate-a")?.status).toBe("satisfied");
    expect(mid.graph.nodes.find((n) => n.id === "gate-b")?.status).toBe("waiting");
    expect(loadCheckpoint(jobsDir, featureId)).not.toBeNull();

    const continuity = loadSessionContinuity(paths.memoryDir, featureId);
    expect(continuity).not.toBeNull();
    expect(continuity!.next_action?.node_id).toBe("gate-b");
    expect(continuity!.decisions.some((d) => d.content === DECISION)).toBe(true);
    expect(continuity!.satisfied_job_run_ids).toContain(jobA.run_id);
    expect(existsSync(continuityEvidencePath(paths.memoryDir, featureId))).toBe(true);

    const jobJsonFiles = () =>
      readdirSync(jobsDir).filter(
        (f) =>
          f.endsWith(".json") &&
          !f.endsWith(".result.json") &&
          !f.endsWith(".evidence.json"),
      );
    expect(jobJsonFiles().length).toBe(2);

    pending = store.listPending();
    expect(pending.length).toBe(1);
    expect(pending[0].node_id).toBe("gate-b");
    const jobBRunId = pending[0].run_id;

    const jobB = pending[0];
    const nodeB: GraphNode = { ...twoGateIR.spec.nodes[1], status: "running", retry_count: 0 };
    const evidenceB = join(base, "evidence-b.json");
    writeFileSync(evidenceB, JSON.stringify(observedEvidence(nodeB, jobB.run_id, "testing")));
    store.completeJob(jobB.run_id, { success: true, evidence_path: evidenceB });

    const engine2 = await createEngine(jobsDir, paths.memoryDir);
    const final = await engine2.run({
      ir: twoGateIR,
      policy_id: "rapid-prototype",
      feature_id: featureId,
      resume: true,
    });

    expect(final.success).toBe(true);
    expect(final.graph.nodes.every((n) => n.status === "satisfied")).toBe(true);
    expect(store.readJob(jobA.run_id)?.status).toBe("completed");
    expect(store.readJob(jobBRunId)?.status).toBe("completed");
    expect(jobJsonFiles().length).toBe(2);

    const decisionsYaml = join(paths.memoryDir, featureId, "decisions.yaml");
    expect(existsSync(decisionsYaml)).toBe(true);
    expect(readFileSync(decisionsYaml, "utf-8")).toContain(DECISION);
  });

  it("rejects tampered checkpoint on resume", async () => {
    const base = mkdtempSync(join(tmpdir(), "v22-cont-bad-"));
    const jobsDir = join(base, "jobs");
    const dataRoot = join(base, "data");
    const paths = resolveDataPaths(dataRoot);
    mkdirSync(jobsDir, { recursive: true });

    const featureId = "v22-tamper-feature";
    const engine1 = await createEngine(jobsDir, paths.memoryDir);
    await engine1.run({
      ir: twoGateIR,
      policy_id: "rapid-prototype",
      feature_id: featureId,
      wait_for_jobs_ms: 0,
    });
    expect(loadCheckpoint(jobsDir, featureId)).not.toBeNull();

    const cpPath = join(jobsDir, "checkpoints", `${featureId}.json`);
    const envelope = JSON.parse(readFileSync(cpPath, "utf-8")) as {
      payload: { graph: { nodes: Array<{ status: string }> } };
    };
    envelope.payload.graph.nodes[0].status = "pending";
    writeFileSync(cpPath, JSON.stringify(envelope));

    const engine2 = await createEngine(jobsDir, paths.memoryDir);
    await expect(
      engine2.run({
        ir: twoGateIR,
        policy_id: "rapid-prototype",
        feature_id: featureId,
        resume: true,
      }),
    ).rejects.toThrow(CheckpointError);
  });
});
