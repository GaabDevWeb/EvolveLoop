import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  createDeterministicProvider,
  resolveDataPaths,
  FilesystemMemoryStore,
  FakeKnowledgeBackend,
  resetKnowledgeBackendCache,
  EVIDENCE_SECRET_CANARY,
  invokePickup,
  JobStore,
} from "../../src/index.js";
import type { CapabilityIR, Evidence, GraphNode } from "../../src/types/index.js";

const FAKE_TOKEN = "sk-fakeintegrationtoken1234567890";

function walkFiles(dir: string): string[] {
  if (!statSync(dir).isDirectory()) return [dir];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

function countSubstringInTree(root: string, needle: string): number {
  let total = 0;
  for (const file of walkFiles(root)) {
    const text = readFileSync(file, "utf-8");
    let idx = text.indexOf(needle);
    while (idx !== -1) {
      total += 1;
      idx = text.indexOf(needle, idx + needle.length);
    }
  }
  return total;
}

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
        details: `leak ${EVIDENCE_SECRET_CANARY} token ${FAKE_TOKEN}`,
      })),
      verdict: "passed",
      payload: {
        type: "gate",
        verdict: "passed",
        findings: [
          {
            severity: "info",
            message: `nested ${EVIDENCE_SECRET_CANARY} ${FAKE_TOKEN}`,
          },
        ],
        artifacts: [],
      },
    },
  };
}

const testingIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: "v22-wire-test", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
  spec: {
    nodes: [
      {
        id: "test-only",
        capability: "testing",
        type: "gate",
        dependencies: [],
        inputs: [],
        outputs: [],
        definition_of_done: [{ id: "d1", check: "Suite verde", verification: "automated" }],
        gate: { verdict_required: true },
      },
    ],
  },
};

const knowledgeIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: "v22-knowledge-fence", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
  spec: {
    nodes: [
      {
        id: "ks",
        capability: "knowledge.search",
        type: "worker",
        dependencies: [],
        inputs: [{ ref: "query:auth" }],
        outputs: [],
        definition_of_done: [],
      },
    ],
  },
};

describe("V22 wire integration", () => {
  const prevEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ["KNOWLEDGE_BACKEND", "KNOWLEDGE_TRUTH_FENCE"]) {
      prevEnv[k] = process.env[k];
    }
    resetKnowledgeBackendCache();
    process.env.KNOWLEDGE_BACKEND = "fake";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetKnowledgeBackendCache();
  });

  it("GOAL-007: invoke + complete redacts secrets in jobs-dir and memory evidence bus", async () => {
    const base = mkdtempSync(join(tmpdir(), "v22-wire-"));
    const jobsDir = join(base, "jobs");
    const dataRoot = join(base, "data");
    const promptDir = join(base, "pickup");
    const paths = resolveDataPaths(dataRoot);
    mkdirSync(jobsDir, { recursive: true });

    const orchestratorRoot = join(import.meta.dirname, "../..");
    const agentsRoot = join(orchestratorRoot, "..");
    const providersDir = join(orchestratorRoot, "providers");

    const registry = {
      capabilities: {
        testing: {
          providers: [
            {
              id: "testing",
              priority: 80,
              cost: "low",
              quality_score: 0.9,
              availability: "active",
              version: "0.1.0",
            },
          ],
        },
      },
    };

    const router = new ProviderRouter();
    const { loadYamlFile } = await import("../../src/registry/manifest-loader.js");
    const { PluginLoader, JobFileExecutor } = await import("../../src/index.js");
    const loader = new PluginLoader(agentsRoot);
    const manifest = loadYamlFile(join(providersDir, "testing/provider.yaml"));
    router.register(loader.load(manifest as never, new JobFileExecutor(jobsDir)));

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      agentsRoot,
      jobsDir,
      dataPaths: paths,
      memory: new FilesystemMemoryStore(paths.memoryDir),
    });

    const featureId = "v22-secret-wire";
    const blocked = await engine.run({
      ir: testingIR,
      policy_id: "rapid-prototype",
      feature_id: featureId,
      wait_for_jobs_ms: 200,
    });
    expect(blocked.blocked_reason).toBe("awaiting_external_jobs");

    const store = new JobStore(jobsDir);
    const job = store.listPending()[0];
    expect(job).toBeTruthy();

    invokePickup({ jobsDir, promptDir, runId: job!.run_id });

    const rawEvidencePath = join(base, "raw-evidence.json");
    const node = testingIR.spec.nodes[0];
    writeFileSync(rawEvidencePath, JSON.stringify(observedEvidence(node, job!.run_id, "testing")));

    store.completeJob(job!.run_id, { success: true, evidence_path: rawEvidencePath });

    const resumed = await engine.run({
      ir: testingIR,
      policy_id: "rapid-prototype",
      feature_id: featureId,
      resume: true,
      wait_for_jobs_ms: 200,
    });
    expect(resumed.success).toBe(true);

    expect(countSubstringInTree(jobsDir, EVIDENCE_SECRET_CANARY)).toBe(0);
    expect(countSubstringInTree(jobsDir, FAKE_TOKEN)).toBe(0);
    expect(countSubstringInTree(promptDir, EVIDENCE_SECRET_CANARY)).toBe(0);
    expect(countSubstringInTree(paths.memoryDir, EVIDENCE_SECRET_CANARY)).toBe(0);
    expect(countSubstringInTree(paths.memoryDir, FAKE_TOKEN)).toBe(0);

    const gatePath = join(paths.memoryDir, featureId, "evidence", "gate.testing.json");
    expect(readFileSync(gatePath, "utf-8")).toContain("[REDACTED");
  });

  it("GOAL-002: knowledge.search via engine applies truth fence by default", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "v22-ks-"));
    process.env.KNOWLEDGE_BACKEND = "fake";
    resetKnowledgeBackendCache();

    const fake = new FakeKnowledgeBackend({
      hits: [
        { source: "", excerpt: "bad", retrieval_method: "fake" },
        { source: "vault/page.md", excerpt: "good", retrieval_method: "fake" },
      ],
    });

    const { resolveKnowledgeBackend } = await import("../../src/knowledge/backend/resolve.js");
    resolveKnowledgeBackend({ instance: fake });

    const registry = {
      capabilities: {
        "knowledge.search": {
          providers: [
            {
              id: "deterministic",
              priority: 100,
              cost: "low",
              quality_score: 1,
              availability: "active",
              version: "1.0.0",
            },
          ],
        },
      },
    };

    const router = new ProviderRouter();
    router.register(
      createDeterministicProvider({
        workspaceRoot: workspace,
        id: "deterministic",
        authority: { allowHostInspect: true },
      }),
    );

    const orchestratorRoot = join(import.meta.dirname, "../..");
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      policiesDir: join(orchestratorRoot, "policies"),
      contractsDir: join(orchestratorRoot, "contracts"),
    });

    const result = await engine.run({
      ir: knowledgeIR,
      policy_id: "rapid-prototype",
      feature_id: "v22-knowledge-fence-run",
    });

    expect(result.success).toBe(true);
    const workerEvidence = result.evidence.find(
      (e) => e.metadata.capability === "knowledge.search" && e.metadata.node_id === "ks",
    );
    expect(workerEvidence).toBeTruthy();
    const spec = workerEvidence!.spec as {
      normalized?: { hits?: unknown[] };
      payload?: { result?: { hits?: unknown[] } };
    };
    const hits = spec.normalized?.hits ?? spec.payload?.result?.hits;
    const sources = (hits ?? []).map((h) => String((h as { source?: string }).source ?? ""));
    expect(sources).toContain("vault/page.md");
    expect(sources.filter((s) => !s.trim() || /^unknown$/i.test(s)).length).toBe(0);
    expect(sources.filter((s) => s === "vault/page.md").length).toBe(1);
  });
});
