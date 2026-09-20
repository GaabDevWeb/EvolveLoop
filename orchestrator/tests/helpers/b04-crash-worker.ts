/**
 * Child worker for B04 process-kill tests.
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
  buildRegistryFromManifests,
  buildSuccessEvidence,
  type CapabilityIR,
  type ExecuteRequest,
  type ExecuteResult,
} from "../../src/index.js";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith("--")) {
      const v = argv[i + 1];
      if (v && !v.startsWith("--")) {
        args[k.slice(2)] = v;
        i++;
      } else {
        args[k.slice(2)] = "true";
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const jobsDir = resolve(args["jobs-dir"]!);
const artifacts = resolve(args.artifacts!);
const featureId = args["feature-id"] ?? "b04-crash";
const resume = args.resume === "true";
const hangAfter = args["hang-after"] ?? "";

mkdirSync(jobsDir, { recursive: true });
mkdirSync(artifacts, { recursive: true });

const ir: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: {
    id: featureId,
    ir_version: "2.0.0",
    policy_ref: "rapid-prototype",
    execution_id: featureId,
    plan_version: 1,
  },
  spec: {
    nodes: ["a", "b", "c"].map((id) => ({
      id,
      capability: "demo.work",
      type: "worker" as const,
      dependencies: id === "a" ? [] : id === "b" ? ["a"] : ["b"],
      definition_of_done: [{ id: "d1", check: "ok", verification: "automated" as const }],
    })),
  },
};

const registry = buildRegistryFromManifests([
  {
    capability: "demo.work",
    provider: {
      id: "crash-prov",
      priority: 100,
      cost: "low",
      quality_score: 1,
      availability: "active",
      version: "1",
    },
  },
]);

const router = new ProviderRouter();
const base = createMockProvider("crash-prov");
const counts: Record<string, number> = {};

base.execute = async (req: ExecuteRequest): Promise<ExecuteResult> => {
  const id = req.node_id;
  counts[id] = (counts[id] ?? 0) + 1;
  writeFileSync(join(artifacts, `artifact-${id}.txt`), `ok:${id}:attempt=${counts[id]}\n`, "utf-8");
  appendFileSync(join(artifacts, "exec-log.txt"), `${id}\n`);

  if (hangAfter === id) {
    writeFileSync(join(artifacts, "ready-signal"), id, "utf-8");
    // Keep event loop alive (Node 24 can exit on unsettled TLA alone in some runners).
    setInterval(() => {}, 60_000);
    await new Promise(() => {});
  }

  const evidence = buildSuccessEvidence(req.node, req.run_id, "crash-prov", 1);
  return {
    run_id: req.run_id,
    success: true,
    evidence,
    duration_ms: 1,
    provider_id: "crash-prov",
    usage: { tokens: 1 },
  };
};

router.register(base);

const engine = new ExecutionEngine({
  registry,
  providers: router,
  jobsDir,
});

const result = await engine.run({
  ir,
  policy_id: "rapid-prototype",
  feature_id: featureId,
  resume,
  worker_id: `crash-worker-${process.pid}`,
  orchestrator_overrides: {
    parallelism: { max_parallel: 1, mode: "async" },
    token_budget: 1000,
    max_replans: 2,
    retries: { default: 1 },
    fail_fast: false,
  },
});

writeFileSync(
  join(artifacts, "run-result.json"),
  JSON.stringify({ success: result.success, blocked: result.blocked_reason, pid: process.pid }),
);
process.exit(result.success ? 0 : 2);
