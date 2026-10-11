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
import type { CapabilityIR, Evidence, GraphNode } from "../../src/types/index.js";
import { loadCheckpoint } from "../../src/jobs/checkpoint.js";

function observedEvidence(node: GraphNode, runId: string, providerId: string): Evidence {
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
      assumptions: [],
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
    const evidence = observedEvidence(node, runId, "testing");
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
    writeFileSync(evidencePath, JSON.stringify(observedEvidence(node, job.run_id, "testing")));
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
