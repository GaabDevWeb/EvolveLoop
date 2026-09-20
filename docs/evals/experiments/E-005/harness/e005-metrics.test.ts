/**
 * E-005 harness — isolated experimental metrics (does NOT modify orchestrator package).
 * Measures job-path resume/checkpoint integrity only (not full product HITL UX).
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  buildRegistryFromManifests,
  PluginLoader,
  JobFileExecutor,
} from "../../../../orchestrator/src/index.js";
import { JobStore } from "../../../../orchestrator/src/jobs/job-store.js";
import { buildSuccessEvidence } from "../../../../orchestrator/src/evidence/validator.js";
import type { CapabilityIR, GraphNode } from "../../../../orchestrator/src/types/index.js";
import { loadCheckpoint, checkpointPath } from "../../../../orchestrator/src/jobs/checkpoint.js";
import { loadYamlFile } from "../../../../orchestrator/src/registry/manifest-loader.js";

const SECRET_PATTERNS = [/api[_-]?key/i, /password/i, /secret/i, /token/i, /bearer/i];

const testingIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: "e005-hitl-fixture", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
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

function setupEngine(jobsDir: string) {
  const orchestratorRoot = join(import.meta.dirname, "../../../../orchestrator");
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
  return {
    engineOpts: {
      registry,
      providers: router,
      agentsRoot,
      jobsDir,
      discovery: { agentsRoot, orchestratorProvidersDir: providersDir },
    },
  };
}

function scanSecrets(obj: unknown, hits: string[] = [], path = ""): string[] {
  if (obj === null || obj === undefined) return hits;
  if (typeof obj === "string") {
    for (const re of SECRET_PATTERNS) {
      if (re.test(path) || re.test(obj)) hits.push(`${path}=<redacted_match>`);
    }
    return hits;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : k;
      if (SECRET_PATTERNS.some((re) => re.test(k))) hits.push(`${p}=<key_name_match>`);
      scanSecrets(v, hits, p);
    }
  }
  return hits;
}

describe("E-005 experimental harness — job-path resume (partial HITL)", () => {
  it("CONTROL+TREATMENT: abandon engine + resume from checkpoint (simulates process boundary)", async () => {
    const base = mkdtempSync(join(tmpdir(), "e005-"));
    const jobsDir = join(base, "jobs");
    mkdirSync(jobsDir, { recursive: true });
    const { engineOpts } = setupEngine(jobsDir);

    // CONTROL phase: first run blocks awaiting jobs + checkpoint
    const engine1 = new ExecutionEngine(engineOpts);
    const first = await engine1.run({
      ir: testingIR,
      policy_id: "rapid-prototype",
      feature_id: "e005-hitl-fixture",
      wait_for_jobs_ms: 0,
    });

    expect(first.success).toBe(false);
    expect(first.blocked_reason).toBe("awaiting_external_jobs");
    const cp = loadCheckpoint(jobsDir, "e005-hitl-fixture");
    expect(cp).not.toBeNull();

    const cpPath = checkpointPath(jobsDir, "e005-hitl-fixture");
    expect(existsSync(cpPath)).toBe(true);
    const cpRaw = JSON.parse(readFileSync(cpPath, "utf-8"));
    const secretHits = scanSecrets(cpRaw);
    expect(secretHits).toEqual([]);

    // TREATMENT: new engine instance (process-boundary analogue) after external complete
    const store = new JobStore(jobsDir);
    const job = store.listPending()[0];
    expect(job).toBeTruthy();
    const node: GraphNode = {
      ...testingIR.spec.nodes[0],
      status: "running",
      retry_count: 0,
    };
    const evidencePath = join(base, "evidence.json");
    writeFileSync(evidencePath, JSON.stringify(buildSuccessEvidence(node, job.run_id, "testing", 5)));
    store.completeJob(job.run_id, { success: true, evidence_path: evidencePath });

    const engine2 = new ExecutionEngine(engineOpts);
    const second = await engine2.run({
      ir: testingIR,
      policy_id: "rapid-prototype",
      feature_id: "e005-hitl-fixture",
      resume: true,
    });

    expect(second.success).toBe(true);
    expect(second.graph.nodes[0].status).toBe("satisfied");

    // Persist metrics for raw evidence collector
    const metrics = {
      resume_success: second.success ? 1 : 0,
      checkpoint_present_before_resume: cp !== null ? 1 : 0,
      secret_exfiltration_in_state: secretHits.length,
      duplicate_mutate_count: null,
      duplicate_mutate_status: "NOT_MEASURED_NO_MUTATING_APPROVAL_FIXTURE",
      process_kill: "SIMULATED_NEW_ENGINE_INSTANCE",
      hitl_scope: "job_path_only",
    };
    writeFileSync(join(base, "e005-metrics.json"), JSON.stringify(metrics, null, 2));
    // Also write under experiment raw if env set
    const outDir = process.env.E005_RAW_DIR;
    if (outDir) {
      writeFileSync(join(outDir, "last-run-metrics.json"), JSON.stringify(metrics, null, 2));
      writeFileSync(join(outDir, "checkpoint-sample.json"), JSON.stringify(cpRaw, null, 2));
    }
  });
});
