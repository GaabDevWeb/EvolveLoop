#!/usr/bin/env node
/**
 * CLI — run Execution Engine from Capability IR YAML.
 *
 * Usage:
 *   node dist/cli/run-engine.js --ir path/to/ir.yaml [--policy high-reliability] [--feature-id feat-1]
 *   node dist/cli/run-engine.js --ir ir.yaml --provider-mode real   # default — real providers, no silent mock
 *   node dist/cli/run-engine.js --ir ir.yaml --provider-mode mock   # explicit mock (tests/fixtures)
 *   node dist/cli/run-engine.js --ir ir.yaml --jobs-dir ./jobs      # cursor-skill via JobFileExecutor
 *   node dist/cli/run-engine.js --ir ir.yaml --discovery --jobs-dir ./jobs
 */
import { mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  loadYamlFile,
  buildRegistryFromManifestFiles,
  FilesystemKnowledgeStore,
  FilesystemMemoryStore,
  resolveDataPaths,
  LongitudinalEvolveLoop,
  LiveAnalysisCoordinator,
  PolicyEngine,
  assertExecutableIR,
  RejectedBeforeExecutionError,
  bootstrapProviders,
  loadProviderManifests,
  type ProviderMode,
} from "../index.js";
import type { AnalysisScope } from "../evolveloop/longitudinal-types.js";
import type { CapabilityIR } from "../types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith("--")) {
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key.slice(2)] = val;
        i++;
      } else {
        args[key.slice(2)] = "true";
      }
    }
  }
  return args;
}

function parseProviderMode(raw: string | undefined): ProviderMode {
  if (!raw || raw === "real") return "real";
  if (raw === "mock") return "mock";
  console.error(`Invalid --provider-mode '${raw}'. Expected real|mock.`);
  process.exit(1);
}

function parseSkillExecutor(raw: string | undefined): "external" | "autonomous" {
  if (!raw || raw === "external") return "external";
  if (raw === "autonomous") return "autonomous";
  console.error(`Invalid --skill-executor '${raw}'. Expected external|autonomous.`);
  process.exit(1);
}

function parseEvolveScope(args: Record<string, string>): AnalysisScope | null {
  if (args.evolve !== "true") return null;

  const scopeType = (args["evolve-scope-type"] ?? "USER").toUpperCase();
  const allowed = new Set(["USER", "PROJECT", "WORKSPACE", "SYSTEM"]);
  if (!allowed.has(scopeType)) {
    console.error(
      `Invalid --evolve-scope-type '${scopeType}'. Expected USER|PROJECT|WORKSPACE|SYSTEM.`,
    );
    process.exit(1);
  }
  const scopeId = args["evolve-scope-id"];
  if (!scopeId) {
    console.error(`--evolve requires --evolve-scope-id <id>.`);
    process.exit(1);
  }
  if (scopeType === "SYSTEM" && args["evolve-authorize-system"] !== "true") {
    console.error(`SYSTEM scope requires --evolve-authorize-system.`);
    process.exit(1);
  }
  return { type: scopeType as AnalysisScope["type"], id: scopeId };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.ir) {
    console.error(
      `Usage: run-engine --ir <path.yaml> [--policy id] [--feature-id id] [--provider-mode real|mock] [--skill-executor external|autonomous] [--jobs-dir path] [--data-dir path] [--discovery] [--resume] [--wait-for-jobs ms] [--evolve] ...`,
    );
    process.exit(1);
  }

  const enableDiscovery = args.discovery === "true";
  const providerMode = parseProviderMode(args["provider-mode"]);
  const skillExecutor = parseSkillExecutor(args["skill-executor"]);
  const irPath = resolve(args.ir);
  const ir = loadYamlFile<CapabilityIR>(irPath);
  const policyId = args.policy ?? ir.metadata.policy_ref ?? "high-reliability";
  const featureId = args["feature-id"] ?? ir.metadata.id;

  const orchestratorRoot = resolve(__dirname, "../..");
  const agentsRoot = resolve(orchestratorRoot, "..");
  const providersDir = join(orchestratorRoot, "providers");
  const contractsDir = join(orchestratorRoot, "contracts");
  const policiesDir = join(orchestratorRoot, "policies");
  const jobsDir = args["jobs-dir"] ?? (enableDiscovery ? "./jobs" : undefined);
  const resume = args.resume === "true" || args["auto-recover"] === "true";
  const autoRecover = args["auto-recover"] === "true";
  const waitForJobsMs = args["wait-for-jobs"] ? parseInt(args["wait-for-jobs"], 10) : 0;

  const manifests = loadProviderManifests(providersDir);
  let registry = enableDiscovery
    ? buildRegistryFromManifestFiles([])
    : buildRegistryFromManifestFiles(manifests);

  const boot = bootstrapProviders({
    mode: providerMode,
    manifests,
    registry,
    workspaceRoot: agentsRoot,
    jobsDir: jobsDir ? resolve(jobsDir) : undefined,
    ir,
    skillExecutor,
    providersDir,
    // Read-only default authority — writes/shell still need confirm (GAP-B02 later)
    authority: { allowWrite: false, allowShell: false, allowNetwork: false },
  });
  registry = boot.registry;

  // Unavailable providers (e.g. cursor-skill without --jobs-dir) are OK if the IR
  // does not need them. Fatal only when preflight finds IR capabilities uncovered.
  if (boot.unavailable.length > 0) {
    console.error(
      `[providers] unavailable (not fatal unless required by IR): ${boot.unavailable.map((u) => u.id).join(", ")}`,
    );
  }

  const policyEngine = new PolicyEngine({ policiesDir });

  try {
    assertExecutableIR(ir, {
      registry,
      router: boot.router,
      requireProviders: providerMode === "real" && !enableDiscovery,
      policyEngine,
      requireKnownPolicy: false,
      providerFallbackHook: "reserved_for_gap_b01",
    });
  } catch (err) {
    if (err instanceof RejectedBeforeExecutionError) {
      const needed = new Set(ir.spec.nodes.map((n) => n.capability));
      const relevantUnavailable = boot.unavailable.filter((u) => {
        const caps = manifests
          .find((m) => m.metadata.name === u.id)
          ?.spec.capabilities.map((c) => c.id);
        return caps?.some((c) => needed.has(c));
      });
      console.error(
        JSON.stringify(
          {
            code: err.code,
            provider_mode: providerMode,
            errors: err.errors,
            unavailable: relevantUnavailable.length ? relevantUnavailable : boot.unavailable,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    throw err;
  }

  const dataDir = args["data-dir"] ? resolve(args["data-dir"]) : undefined;
  const dataPaths = dataDir ? resolveDataPaths(dataDir) : undefined;

  const evolveScope = parseEvolveScope(args);
  let evolveLoop: LongitudinalEvolveLoop | undefined;
  let evolveCoordinator: LiveAnalysisCoordinator | undefined;
  if (evolveScope) {
    const evolutionDir = dataDir
      ? join(dataDir, "evolveloop")
      : jobsDir
        ? join(resolve(jobsDir), "evolveloop")
        : mkdtempSync(join(tmpdir(), "evolveloop-"));
    const handoffDir = join(evolutionDir, "handoff");
    evolveLoop = new LongitudinalEvolveLoop({
      evolutionDir,
      handoffDir,
      registry,
      agentsRoot: enableDiscovery || jobsDir ? agentsRoot : undefined,
    });
    evolveCoordinator = new LiveAnalysisCoordinator({
      loop: evolveLoop,
      authorize_system: args["evolve-authorize-system"] === "true",
    });
    console.error(
      `[evolve] enabled (default OFF). scope=${evolveScope.type}:${evolveScope.id} dir=${evolutionDir}`,
    );
    console.error(
      `[evolve] ControlledGateFixture / harness gate artifacts are NOT production Prototype Gate.`,
    );
  }

  console.error(
    `[providers] mode=${providerMode} skill_executor=${skillExecutor} registered=${boot.registered.length} unavailable=${boot.unavailable.length}`,
  );

  const engine = new ExecutionEngine({
    registry,
    providers: boot.router,
    dataPaths,
    contractsDir,
    policiesDir,
    agentsRoot: enableDiscovery || jobsDir ? agentsRoot : undefined,
    jobsDir: jobsDir ? resolve(jobsDir) : undefined,
    discovery: enableDiscovery
      ? { agentsRoot, orchestratorProvidersDir: providersDir }
      : undefined,
    knowledge: dataPaths ? new FilesystemKnowledgeStore(dataPaths.knowledgeDir) : undefined,
    memory: dataPaths ? new FilesystemMemoryStore(dataPaths.memoryDir) : undefined,
    evolveLoop,
    evolveScope: evolveScope ?? undefined,
    evolveCoordinator,
  });
  const result = await engine.run({
    ir,
    policy_id: policyId,
    feature_id: featureId,
    resume,
    auto_recover: autoRecover,
    worker_id: `cli-${process.pid}`,
    wait_for_jobs_ms: waitForJobsMs,
  });

  const summary = {
    success: result.success,
    finished: result.finished,
    state: result.state,
    blocked_reason: result.blocked_reason,
    provider_mode: providerMode,
    skill_executor: skillExecutor,
    providers_registered: boot.registered,
    evidence_count: result.evidence.length,
    execution_id: ir.metadata.execution_id,
    nodes: result.graph.nodes.map((n) => ({
      id: n.id,
      status: n.status,
      capability: n.capability,
      provider_id: n.provider_id,
    })),
    metrics: result.metrics,
    event_count: result.events.length,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
