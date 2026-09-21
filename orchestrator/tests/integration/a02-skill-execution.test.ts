/**
 * GAP-A02 tests — autonomous skill execution (real handler, not mock/prompt).
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  ExecutionEngine,
  emitPlanOrThrow,
  bootstrapProviders,
  loadProviderManifests,
  buildRegistryFromManifestFiles,
  AutonomousSkillExecutor,
  JobStore,
  SkillWorker,
  JobFileExecutor,
  PluginLoader,
  type StructuredIntent,
} from "../../src/index.js";
import type { CapabilityIR, GraphNode, ExecuteRequest } from "../../src/types/index.js";
import { loadYamlFile } from "../../src/registry/manifest-loader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const orchestratorRoot = resolve(__dirname, "../..");
const agentsRoot = resolve(orchestratorRoot, "..");
const providersDir = join(orchestratorRoot, "providers");

describe("AutonomousSkillExecutor", () => {
  it("writes a real file and returns valid evidence", async () => {
    const ws = mkdtempSync(join(tmpdir(), "a02-ws-"));
    const manifest = loadYamlFile(join(providersDir, "test-autonomous-write/provider.yaml"));
    const exec = new AutonomousSkillExecutor({
      workspaceRoot: ws,
      resolveProviderDir: () => join(providersDir, "test-autonomous-write"),
    });

    const node: GraphNode = {
      id: "w1",
      capability: "test.autonomous-write",
      type: "worker",
      status: "running",
      dependencies: [],
      definition_of_done: [{ id: "wrote", check: "file exists", verification: "automated" }],
      constraints: { path: "out/a02.txt", content: "hello-a02" },
      retry_count: 0,
    };
    const request: ExecuteRequest = {
      run_id: "run-a02-1",
      node_id: "w1",
      capability: "test.autonomous-write",
      inputs: [],
      definition_of_done: node.definition_of_done,
      policy: { retries_remaining: 0 },
      memory_scope: "t",
      knowledge_hits: [],
      briefing: "write file",
      node,
    };

    const skillPath = join(providersDir, "test-autonomous-write/SKILL.md");
    const result = await exec.execute(request, skillPath, manifest as never);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(existsSync(join(ws, "out/a02.txt"))).toBe(true);
    expect(readFileSync(join(ws, "out/a02.txt"), "utf-8")).toBe("hello-a02");
    expect(result.evidence?.spec.checks.some((c) => c.dod_id === "wrote" && c.result === "pass")).toBe(
      true,
    );
  });

  it("returns EXECUTOR_UNAVAILABLE for LLM-only skill (no autonomous block)", async () => {
    const testing = loadYamlFile(join(providersDir, "testing/provider.yaml"));
    const exec = new AutonomousSkillExecutor({
      workspaceRoot: agentsRoot,
      resolveProviderDir: () => join(providersDir, "testing"),
    });
    const node: GraphNode = {
      id: "t1",
      capability: "testing",
      type: "gate",
      status: "running",
      dependencies: [],
      definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
      retry_count: 0,
    };
    const result = await exec.execute(
      {
        run_id: "r",
        node_id: "t1",
        capability: "testing",
        inputs: [],
        definition_of_done: node.definition_of_done,
        policy: { retries_remaining: 0 },
        memory_scope: "t",
        knowledge_hits: [],
        briefing: "x",
        node,
      },
      resolve(agentsRoot, (testing as { spec: { plugin: { entrypoint: string } } }).spec.plugin.entrypoint),
      testing as never,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("EXECUTOR_UNAVAILABLE");
  });

  it("times out with EXECUTOR_TIMEOUT", async () => {
    const ws = mkdtempSync(join(tmpdir(), "a02-to-"));
    const handler = join(ws, "slow.mjs");
    writeFileSync(
      handler,
      `export async function execute(ctx) {
        await new Promise(r => setTimeout(r, 5000));
        return { success: true, evidence: { apiVersion:"capability-orchestrator.io/v2", kind:"Evidence", metadata:{node_id:ctx.node_id,run_id:ctx.run_id,emitter:"worker",provider_id:ctx.provider_id,capability:ctx.capability,submitted_at:new Date().toISOString()}, spec:{status:"complete",confidence:1,coverage:1,assumptions:[],known_gaps:[],checks:ctx.definition_of_done.map(d=>({dod_id:d.id,result:"pass"})),payload:{type:"worker",artifacts:[],checks:[],side_effects:{files_created:[],files_modified:[],commands_run:[]}}} } };
      }`,
    );
    const skill = join(ws, "SKILL.md");
    writeFileSync(skill, "# slow\n");
    const manifest = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "Provider" as const,
      metadata: { name: "slow", version: "1.0.0" },
      spec: {
        plugin: {
          type: "cursor-skill",
          entrypoint: skill,
          autonomous: { type: "node-module" as const, module: "./slow.mjs" },
        },
        capabilities: [{ id: "slow.cap", type: "worker" as const }],
      },
    };
    const exec = new AutonomousSkillExecutor({
      workspaceRoot: ws,
      defaultTimeoutMs: 50,
      resolveProviderDir: () => ws,
    });
    const node: GraphNode = {
      id: "s",
      capability: "slow.cap",
      type: "worker",
      status: "running",
      dependencies: [],
      definition_of_done: [{ id: "d", check: "ok", verification: "automated" }],
      retry_count: 0,
    };
    const result = await exec.execute(
      {
        run_id: "slow-1",
        node_id: "s",
        capability: "slow.cap",
        inputs: [],
        definition_of_done: node.definition_of_done,
        policy: { retries_remaining: 0, timeout_ms: 50 },
        memory_scope: "t",
        knowledge_hits: [],
        briefing: "slow",
        node,
      },
      skill,
      manifest,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("EXECUTOR_TIMEOUT");
  });
});

describe("JobStore claim / lease", () => {
  it("only one worker claims the same job", () => {
    const dir = mkdtempSync(join(tmpdir(), "a02-claim-"));
    const store = new JobStore(dir);
    store.writeJob({
      apiVersion: "v2",
      kind: "SkillJob",
      run_id: "job-1",
      provider_id: "test-autonomous-write",
      skill_path: "/x",
      capability: "test.autonomous-write",
      node_id: "n1",
      briefing: "",
      definition_of_done: [],
      inputs: [],
      status: "pending",
    });

    const a = store.claimJob("job-1", { workerId: "w-a", leaseMs: 60_000 });
    const b = store.claimJob("job-1", { workerId: "w-b", leaseMs: 60_000 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(["race_lost", "not_claimable"]).toContain(b.reason);
  });

  it("expired lease can be reclaimed (recovery)", () => {
    const dir = mkdtempSync(join(tmpdir(), "a02-lease-"));
    const store = new JobStore(dir);
    store.writeJob({
      apiVersion: "v2",
      kind: "SkillJob",
      run_id: "job-2",
      provider_id: "p",
      skill_path: "/x",
      capability: "c",
      node_id: "n",
      briefing: "",
      definition_of_done: [],
      inputs: [],
      status: "pending",
    });
    const t0 = Date.now();
    const first = store.claimJob("job-2", {
      workerId: "w1",
      leaseMs: 10,
      now: () => t0,
    });
    expect(first.ok).toBe(true);
    const second = store.claimJob("job-2", {
      workerId: "w2",
      leaseMs: 60_000,
      now: () => t0 + 50,
    });
    expect(second.ok).toBe(true);
    expect(second.job?.worker_id).toBe("w2");
    expect(second.job?.attempt).toBe(2);
  });
});

describe("A02 e2e — Intent → autonomous cursor-skill → evidence", () => {
  it("completes without pickup/complete/resume", async () => {
    const ws = mkdtempSync(join(tmpdir(), "a02-e2e-"));
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "real",
      manifests,
      registry,
      workspaceRoot: agentsRoot,
      skillExecutor: "autonomous",
      providersDir,
      // Handler writes into authorized workspace — use ws as root for executor via custom boot:
    });

    // Re-bind autonomous provider with workspace = ws for side-effect verification
    const manifest = loadYamlFile(join(providersDir, "test-autonomous-write/provider.yaml"));
    const loader = new PluginLoader(agentsRoot);
    const exec = new AutonomousSkillExecutor({
      workspaceRoot: ws,
      resolveProviderDir: () => join(providersDir, "test-autonomous-write"),
    });
    boot.router.register(loader.load(manifest as never, exec));

    // Ensure capability is in registry (filter may have dropped LLM-only skills)
    if (!boot.registry.capabilities["test.autonomous-write"]?.providers.length) {
      boot.registry.capabilities["test.autonomous-write"] = {
        providers: [
          {
            id: "test-autonomous-write",
            priority: 10,
            cost: "low",
            quality_score: 0.9,
            availability: "active",
            version: "1.0.0",
          },
        ],
      };
    }

    const intent: StructuredIntent = {
      id: "a02-e2e",
      goal: "Execute test.autonomous-write",
      policy_ref: "rapid-prototype",
      steps: [
        {
          id: "write-1",
          capability: "test.autonomous-write",
          inputs: { path: "proof.txt", content: "AUTONOMOUS_REAL" },
          definition_of_done: [{ id: "wrote", check: "file", verification: "automated" }],
        },
      ],
    };

    const emission = emitPlanOrThrow(intent, {
      preflight: {
        registry: boot.registry,
        router: boot.router,
        requireProviders: true,
      },
    });

    const engine = new ExecutionEngine({
      registry: boot.registry,
      providers: boot.router,
      authorityContext: {
        workspaceRoot: ws,
        allowWrite: true,
        allowShell: false,
        allowNetwork: false,
      },
    });

    const result = await engine.run({
      ir: emission.ir,
      policy_id: "rapid-prototype",
      feature_id: emission.execution_id,
    });

    expect(result.success).toBe(true);
    expect(result.graph.nodes[0].status).toBe("satisfied");
    expect(existsSync(join(ws, "proof.txt"))).toBe(true);
    expect(readFileSync(join(ws, "proof.txt"), "utf-8")).toBe("AUTONOMOUS_REAL");
    expect(result.blocked_reason).toBeUndefined();
    // No JOB_PENDING path
    expect(result.events.some((e) => e.type === "NodeCompleted")).toBe(true);
  });
});

describe("External JobFileExecutor still works", () => {
  it("writes pending job (EXTERNAL mode)", async () => {
    const jobsDir = mkdtempSync(join(tmpdir(), "a02-ext-"));
    const executor = new JobFileExecutor(jobsDir);
    expect(executor.kind).toBe("external");
    const manifest = loadYamlFile(join(providersDir, "testing/provider.yaml"));
    const node: GraphNode = {
      id: "g",
      capability: "testing",
      type: "gate",
      status: "running",
      dependencies: [],
      definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
      retry_count: 0,
    };
    const result = await executor.execute(
      {
        run_id: "ext-1",
        node_id: "g",
        capability: "testing",
        inputs: [],
        definition_of_done: node.definition_of_done,
        policy: { retries_remaining: 0 },
        memory_scope: "t",
        knowledge_hits: [],
        briefing: "b",
        node,
      },
      resolve(agentsRoot, (manifest as { spec: { plugin: { entrypoint: string } } }).spec.plugin.entrypoint),
      manifest as never,
    );
    expect(result.error?.code).toBe("JOB_PENDING");
    expect(existsSync(join(jobsDir, "ext-1.json"))).toBe(true);
  });
});

describe("SkillWorker", () => {
  it("executes claimable autonomous job without manual complete", async () => {
    const base = mkdtempSync(join(tmpdir(), "a02-worker-"));
    const jobsDir = join(base, "jobs");
    const ws = join(base, "ws");
    mkdirSync(jobsDir, { recursive: true });
    mkdirSync(ws, { recursive: true });

    const store = new JobStore(jobsDir);
    const skillPath = join(providersDir, "test-autonomous-write/SKILL.md");
    store.writeJob({
      apiVersion: "capability-orchestrator.io/v2",
      kind: "SkillJob",
      run_id: "wj1",
      provider_id: "test-autonomous-write",
      skill_path: skillPath,
      capability: "test.autonomous-write",
      node_id: "n1",
      briefing: "write",
      definition_of_done: [{ id: "wrote", check: "file", verification: "automated" }],
      inputs: [],
      constraints: { path: "worker-out.txt", content: "from-worker" },
      status: "pending",
    });

    const worker = new SkillWorker({
      jobsDir,
      workspaceRoot: ws,
      workerId: "tw1",
      maxJobs: 1,
      idleExitPolls: 2,
      pollIntervalMs: 20,
      resolveManifest: () =>
        loadYamlFile(join(providersDir, "test-autonomous-write/provider.yaml")) as never,
    });

    const stats = await worker.run();
    expect(stats.completed).toBe(1);
    const result = store.readResult("wj1");
    expect(result?.success).toBe(true);
    expect(existsSync(join(ws, "worker-out.txt"))).toBe(true);
    expect(readFileSync(join(ws, "worker-out.txt"), "utf-8")).toBe("from-worker");
  });
});
