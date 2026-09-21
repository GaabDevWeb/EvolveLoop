import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  buildRegistryFromManifests,
  PluginLoader,
  JobFileExecutor,
} from "../../src/index.js";
import { JobStore } from "../../src/jobs/job-store.js";
import { jobResultToExecuteResult } from "../../src/jobs/job-resume.js";
import { buildSuccessEvidence } from "../../src/evidence/validator.js";
import type { CapabilityIR, GraphNode } from "../../src/types/index.js";
import { loadCheckpoint } from "../../src/jobs/checkpoint.js";

const testingIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: "job-resume-test", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
  spec: {
    nodes: [
      {
        id: "test-only",
        capability: "testing",
        type: "gate",
        dependencies: [],
        inputs: [],
        outputs: [{ id: "test-report", path: "telemetry/evidence/test.json" }],
        definition_of_done: [{ id: "d1", check: "Suite verde", verification: "automated" }],
        gate: { verdict_required: true },
      },
    ],
  },
};

describe("Job pickup resume", () => {
  it("fail-closed when success without evidence_path (no invented PASS)", () => {
    const er = jobResultToExecuteResult(
      {
        run_id: "r1",
        provider_id: "testing",
        skill_path: "/x",
        capability: "testing",
        node_id: "n1",
        created_at: new Date().toISOString(),
        status: "completed",
      } as never,
      { success: true } as never,
      {
        id: "n1",
        capability: "testing",
        type: "gate",
        dependencies: [],
        definition_of_done: [{ id: "d1", check: "x", verification: "automated" }],
        status: "running",
        retry_count: 0,
      },
    );
    expect(er.success).toBe(false);
    expect(er.error?.code).toBe("EVIDENCE_MISSING");
  });

  it("completes waiting node when job result arrives (--wait-for-jobs)", async () => {
    const base = mkdtempSync(join(tmpdir(), "job-resume-"));
    const jobsDir = join(base, "jobs");
    mkdirSync(jobsDir, { recursive: true });

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
    const { loadYamlFile } = await import("../../src/registry/manifest-loader.js");
    const manifest = loadYamlFile<{ metadata: { name: string }; spec: unknown }>(
      join(providersDir, "testing/provider.yaml"),
    );
    router.register(loader.load(manifest as never, new JobFileExecutor(jobsDir)));

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      agentsRoot,
      jobsDir,
      jobPollIntervalMs: 50,
      discovery: { agentsRoot, orchestratorProvidersDir: providersDir },
    });

    const runPromise = engine.run({
      ir: testingIR,
      policy_id: "rapid-prototype",
      feature_id: "job-resume-test",
      wait_for_jobs_ms: 10_000,
    });

    await new Promise((r) => setTimeout(r, 150));

    const store = new JobStore(jobsDir);
    const pending = store.listPending();
    expect(pending.length).toBe(1);

    const runId = pending[0].run_id;
    const node: GraphNode = {
      ...testingIR.spec.nodes[0],
      status: "running",
      retry_count: 0,
    };
    const evidence = buildSuccessEvidence(node, runId, "testing", 10);
    const evidencePath = join(base, "evidence.json");
    writeFileSync(evidencePath, JSON.stringify(evidence));

    store.completeJob(runId, { success: true, evidence_path: evidencePath });

    const result = await runPromise;
    expect(result.success).toBe(true);
    expect(result.graph.nodes[0].status).toBe("satisfied");
  });

  it("saves checkpoint and resumes with --resume after external complete", async () => {
    const base = mkdtempSync(join(tmpdir(), "resume-cp-"));
    const jobsDir = join(base, "jobs");
    mkdirSync(jobsDir, { recursive: true });

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
    const { loadYamlFile } = await import("../../src/registry/manifest-loader.js");
    const manifest = loadYamlFile(join(providersDir, "testing/provider.yaml"));
    router.register(loader.load(manifest as never, new JobFileExecutor(jobsDir)));

    const engineOpts = {
      registry,
      providers: router,
      agentsRoot,
      jobsDir,
      discovery: { agentsRoot, orchestratorProvidersDir: providersDir },
    };

    const engine1 = new ExecutionEngine(engineOpts);
    const first = await engine1.run({
      ir: testingIR,
      policy_id: "rapid-prototype",
      feature_id: "job-resume-test",
      wait_for_jobs_ms: 0,
    });

    expect(first.success).toBe(false);
    expect(first.blocked_reason).toBe("awaiting_external_jobs");
    expect(loadCheckpoint(jobsDir, "job-resume-test")).not.toBeNull();

    const store = new JobStore(jobsDir);
    const job = store.listPending()[0];
    const node: GraphNode = { ...testingIR.spec.nodes[0], status: "running", retry_count: 0 };
    const evidencePath = join(base, "evidence.json");
    writeFileSync(evidencePath, JSON.stringify(buildSuccessEvidence(node, job.run_id, "testing", 5)));
    store.completeJob(job.run_id, { success: true, evidence_path: evidencePath });

    const engine2 = new ExecutionEngine(engineOpts);
    const second = await engine2.run({
      ir: testingIR,
      policy_id: "rapid-prototype",
      feature_id: "job-resume-test",
      resume: true,
    });

    expect(second.success).toBe(true);
    expect(second.graph.nodes[0].status).toBe("satisfied");
  });
});
