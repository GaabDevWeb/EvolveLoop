import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  buildRegistryFromManifestFiles,
  PluginLoader,
  JobFileExecutor,
  loadYamlFile,
} from "../../src/index.js";
import { JobStore } from "../../src/jobs/job-store.js";
import type { CapabilityIR, ProviderManifest } from "../../src/types/index.js";
import { manifestToRegistryEntries } from "../../src/registry/manifest-loader.js";
import { readdirSync } from "node:fs";

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

describe("Discovery + jobs-dir SkillJobs", () => {
  it("login-dashboard subgraph (backend→testing) yields JOB_PENDING with provider backend", async () => {
    const base = mkdtempSync(join(tmpdir(), "discovery-jobs-"));
    const jobsDir = join(base, "jobs");
    mkdirSync(jobsDir, { recursive: true });

    const orchestratorRoot = join(import.meta.dirname, "../..");
    const agentsRoot = join(orchestratorRoot, "..");
    const providersDir = join(orchestratorRoot, "providers");
    const irPath = join(orchestratorRoot, "tests/fixtures/login-dashboard.ir.yaml");
    const fullIr = loadYamlFile<CapabilityIR>(irPath);

    const ir: CapabilityIR = {
      ...fullIr,
      metadata: { ...fullIr.metadata, id: "login-dashboard-discovery-subgraph" },
      spec: {
        ...fullIr.spec,
        nodes: fullIr.spec.nodes
          .filter((n) => n.id === "be-auth" || n.id === "test-suite")
          .map((n) => ({
            ...n,
            dependencies: n.dependencies.filter((d) => d === "be-auth"),
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
      feature_id: "login-dashboard-discovery-subgraph",
    });

    expect(result.blocked_reason).toBe("awaiting_external_jobs");
    const store = new JobStore(jobsDir);
    const pending = store.listPending();
    expect(pending.length).toBe(1);
    expect(pending[0].capability).toBe("backend-implementation");
    expect(pending[0].provider_id).toBe("backend");
  });
});
