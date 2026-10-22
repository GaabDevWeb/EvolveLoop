import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  buildRegistryFromManifestFiles,
  PluginLoader,
  JobFileExecutor,
  loadYamlFile,
  invokePickup,
  EventBus,
} from "../../src/index.js";
import { JobStore } from "../../src/jobs/job-store.js";
import type { CapabilityIR, ProviderManifest } from "../../src/types/index.js";
import { manifestToRegistryEntries } from "../../src/registry/manifest-loader.js";

function supplementLikeCli(
  registry: ReturnType<typeof buildRegistryFromManifestFiles>,
  ir: CapabilityIR,
  manifests: ProviderManifest[],
) {
  const byCap = new Map<string, ProviderManifest>();
  for (const m of manifests) {
    for (const c of m.spec.capabilities) {
      if (!byCap.has(c.id)) byCap.set(c.id, m);
    }
  }
  const capabilities = { ...registry.capabilities };
  for (const cap of new Set(ir.spec.nodes.map((n) => n.capability))) {
    if (capabilities[cap]) continue;
    const manifest = byCap.get(cap);
    const entry = manifest
      ? manifestToRegistryEntries(manifest).find((e) => e.capability === cap)
      : undefined;
    if (entry) capabilities[cap] = { providers: [entry.provider] };
  }
  return { ...registry, capabilities };
}

describe("run-engine discovery → invoke pickup with context budget", () => {
  it("pickup respects budget, preserves DoD verbatim, records ContextBudget evidence", async () => {
    const base = mkdtempSync(join(tmpdir(), "ctx-pickup-"));
    const jobsDir = join(base, "jobs");
    const promptDir = join(base, "pickup");
    mkdirSync(jobsDir, { recursive: true });

    const orchestratorRoot = join(import.meta.dirname, "../..");
    const agentsRoot = join(orchestratorRoot, "..");
    const providersDir = join(orchestratorRoot, "providers");
    const fullIr = loadYamlFile<CapabilityIR>(
      join(orchestratorRoot, "tests/fixtures/login-dashboard.ir.yaml"),
    );

    const ir: CapabilityIR = {
      ...fullIr,
      metadata: { ...fullIr.metadata, id: "ctx-budget-pickup" },
      spec: {
        ...fullIr.spec,
        nodes: fullIr.spec.nodes
          .filter((n) => n.id === "be-auth")
          .map((n) => ({
            ...n,
            dependencies: [],
            metadata: {
              gate_bundle: {
                parent_cycle_id: "ctx-budget-pickup",
                spawn_depth: 1,
                max_spawn_depth: 3,
                role: "exec",
                context_budget: { max_paths: 2 },
              },
              context_retrieval: [
                { path: "noise/a.txt", content: "filler", priority: 1 },
                { path: "noise/b.txt", content: "filler", priority: 2 },
                { path: "noise/c.txt", content: "filler", priority: 3 },
              ],
              security_restrictions: "NEVER_COMMIT_SECRET_CANARY_XYZ",
            },
          })),
      },
    };

    const manifests: ProviderManifest[] = [];
    for (const entry of readdirSync(providersDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      try {
        manifests.push(
          loadYamlFile<ProviderManifest>(join(providersDir, entry.name, "provider.yaml")),
        );
      } catch {
        /* skip */
      }
    }

    let registry = buildRegistryFromManifestFiles(manifests);
    registry = supplementLikeCli(registry, ir, manifests);

    const router = new ProviderRouter();
    const loader = new PluginLoader(agentsRoot);
    for (const cap of Object.values(registry.capabilities)) {
      for (const p of cap.providers) {
        const manifest = manifests.find((m) => m.metadata.name === p.id);
        if (manifest?.spec.plugin?.type === "cursor-skill") {
          router.register(loader.load(manifest, new JobFileExecutor(jobsDir)));
        }
      }
    }

    const bus = new EventBus();
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      agentsRoot,
      jobsDir,
      discovery: { agentsRoot, orchestratorProvidersDir: providersDir },
    });

    const result = await engine.run({
      ir,
      policy_id: "rapid-prototype",
      feature_id: "ctx-budget-pickup",
    });

    expect(result.blocked_reason).toBe("awaiting_external_jobs");
    const store = new JobStore(jobsDir);
    const pending = store.listPending();
    expect(pending.length).toBe(1);
    const job = pending[0];
    expect(job.gate_bundle?.context_budget?.max_paths).toBe(2);
    expect(job.context_retrieval?.length).toBe(3);

    const plan = invokePickup({ jobsDir, promptDir, eventBus: bus });
    expect(plan.status).toBe("ready");

    const md = readFileSync(join(promptDir, "current-job.md"), "utf-8");
    expect(md).toContain("GATE_BUNDLE");
    expect(md).toContain("NEVER_COMMIT_SECRET_CANARY_XYZ");
    expect(md).toContain('"check"');
    expect(md).not.toContain("noise/c.txt");

    const meta = JSON.parse(readFileSync(join(promptDir, "current-job.json"), "utf-8"));
    expect(meta.context_owner_id).toContain("ctx-budget-pickup:exec:d1");
    expect(meta.context_budget_evidence).toBeTruthy();
    expect(existsSync(meta.context_budget_evidence)).toBe(true);

    const evidence = JSON.parse(readFileSync(meta.context_budget_evidence, "utf-8"));
    expect(evidence.kind).toBe("ContextBudgetEvidence");
    expect(evidence.telemetry.paths_read.length).toBeLessThanOrEqual(2);

    const events = bus.getEvents().filter((e) => e.type === "ContextBudget");
    expect(events.length).toBeGreaterThanOrEqual(1);

    const sidecar = join(jobsDir, "checkpoints", "ctx-budget-pickup.spawn-context.json");
    expect(existsSync(sidecar)).toBe(true);
  });
});
