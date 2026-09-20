#!/usr/bin/env node
/**
 * CLI — run Execution Engine from Capability IR YAML.
 *
 * Usage:
 *   node dist/cli/run-engine.js --ir path/to/ir.yaml [--policy high-reliability] [--feature-id feat-1]
 *   node dist/cli/run-engine.js --ir ir.yaml --jobs-dir ./jobs   # cursor-skill via JobFileExecutor
 *   node dist/cli/run-engine.js --ir ir.yaml --discovery --jobs-dir ./jobs  # runtime provider discovery
 */
import { mkdtempSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
  loadYamlFile,
  buildRegistryFromManifestFiles,
  PluginLoader,
  JobFileExecutor,
  FilesystemKnowledgeStore,
  FilesystemMemoryStore,
  resolveDataPaths,
  LongitudinalEvolveLoop,
  LiveAnalysisCoordinator,
} from "../index.js";
import type { AnalysisScope } from "../evolveloop/longitudinal-types.js";
import type { CapabilityIR, ProviderManifest } from "../types/index.js";

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

function loadProviderManifests(providersDir: string): ProviderManifest[] {
  const manifests: ProviderManifest[] = [];
  for (const name of readdirSync(providersDir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const path = join(providersDir, name.name, "provider.yaml");
    try {
      manifests.push(loadYamlFile<ProviderManifest>(path));
    } catch {
      // skip dirs without provider.yaml
    }
  }
  return manifests;
}

function supplementRegistry(
  registry: ReturnType<typeof buildRegistryFromManifestFiles>,
  ir: CapabilityIR,
): ReturnType<typeof buildRegistryFromManifestFiles> {
  const caps = new Set(ir.spec.nodes.map((n) => n.capability));
  const capabilities = { ...registry.capabilities };

  for (const cap of caps) {
    if (!capabilities[cap]) {
      capabilities[cap] = {
        providers: [
          {
            id: cap,
            priority: 100,
            cost: "medium",
            quality_score: 0.85,
            availability: "active",
            version: "1.0.0",
          },
        ],
      };
    }
  }

  return { ...registry, capabilities };
}

function registryForMockRun(
  registry: ReturnType<typeof buildRegistryFromManifestFiles>,
  ir: CapabilityIR,
): ReturnType<typeof buildRegistryFromManifestFiles> {
  let result = supplementRegistry(registry, ir);
  const capabilities = { ...result.capabilities };

  for (const [capId, cap] of Object.entries(capabilities)) {
    const hasActive = cap.providers.some((p) => p.availability !== "experimental" && p.availability !== "deprecated");
    if (!hasActive) {
      capabilities[capId] = {
        providers: [
          {
            id: capId,
            priority: 100,
            cost: "medium",
            quality_score: 0.85,
            availability: "active",
            version: "1.0.0",
          },
        ],
      };
    }
  }

  return { ...result, capabilities };
}

function setupProviders(
  registry: ReturnType<typeof buildRegistryFromManifestFiles>,
  agentsRoot: string,
  jobsDir?: string,
): ProviderRouter {
  const router = new ProviderRouter();
  const loader = new PluginLoader(agentsRoot);
  const executor = jobsDir ? new JobFileExecutor(resolve(jobsDir)) : undefined;

  const ids = new Set<string>();
  for (const cap of Object.values(registry.capabilities)) {
    for (const p of cap.providers) ids.add(p.id);
  }

  const manifestsDir = resolve(__dirname, "../../providers");
  const manifests = loadProviderManifests(manifestsDir);
  const manifestByName = new Map(manifests.map((m) => [m.metadata.name, m]));

  for (const id of ids) {
    const manifest = manifestByName.get(id);
    if (manifest?.spec.plugin?.type === "cursor-skill" && executor) {
      router.register(loader.load(manifest, executor));
    } else {
      router.register(createMockProvider(id));
    }
  }

  return router;
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
      `Usage: run-engine --ir <path.yaml> [--policy id] [--feature-id id] [--jobs-dir path] [--data-dir path] [--discovery] [--resume] [--wait-for-jobs ms] [--evolve] [--evolve-scope-type USER|PROJECT|WORKSPACE|SYSTEM] [--evolve-scope-id id] [--evolve-authorize-system]`,
    );
    process.exit(1);
  }

  const enableDiscovery = args.discovery === "true";
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
  const resume = args.resume === "true";
  const waitForJobsMs = args["wait-for-jobs"] ? parseInt(args["wait-for-jobs"], 10) : 0;
  const manifests = loadProviderManifests(providersDir);

  let registry = enableDiscovery
    ? buildRegistryFromManifestFiles([])
    : buildRegistryFromManifestFiles(manifests);
  registry = jobsDir ? supplementRegistry(registry, ir) : registryForMockRun(registry, ir);
  const providers = setupProviders(registry, agentsRoot, jobsDir);

  const dataDir = args["data-dir"] ? resolve(args["data-dir"]) : undefined;
  const dataPaths = dataDir ? resolveDataPaths(dataDir) : undefined;

  // EvolveLoop is default OFF — opt-in via --evolve only.
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

  const engine = new ExecutionEngine({
    registry,
    providers,
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
    wait_for_jobs_ms: waitForJobsMs,
  });

  const summary = {
    success: result.success,
    finished: result.finished,
    state: result.state,
    blocked_reason: result.blocked_reason,
    evidence_count: result.evidence.length,
    nodes: result.graph.nodes.map((n) => ({ id: n.id, status: n.status, capability: n.capability })),
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
