import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  discoverAllManifests,
  discoverManifestForCapability,
} from "../../src/discovery/provider-discovery.js";

describe("ProviderDiscovery", () => {
  const orchestratorRoot = join(import.meta.dirname, "../..");
  const agentsRoot = join(orchestratorRoot, "..");

  it("discovers manifests from orchestrator providers dir", () => {
    const manifests = discoverAllManifests({
      agentsRoot,
      orchestratorProvidersDir: join(import.meta.dirname, "../../providers"),
    });
    const names = manifests.map((m) => m.metadata.name);
    expect(names).toContain("testing");
    expect(names).toContain("frontend-pro");
  });

  it("finds manifest by capability id", () => {
    const manifest = discoverManifestForCapability("testing", {
      agentsRoot,
      orchestratorProvidersDir: join(import.meta.dirname, "../../providers"),
    });
    expect(manifest?.metadata.name).toBe("testing");
  });

  it("finds skill-sidecar provider.yaml", () => {
    const manifest = discoverManifestForCapability("testing", {
      agentsRoot: join(agentsRoot, ".cursor"),
      orchestratorProvidersDir: join(import.meta.dirname, "../../providers"),
    });
    expect(manifest).not.toBeNull();
  });
});

describe("RegistryClient.registerFromManifest", () => {
  const orchestratorRoot = join(import.meta.dirname, "../..");
  const agentsRoot = join(orchestratorRoot, "..");

  it("adds discovered provider to registry", async () => {
    const { RegistryClient, buildRegistryFromManifests } = await import("../../src/registry/registry-client.js");
    const { discoverManifestForCapability } = await import("../../src/discovery/provider-discovery.js");

    const registry = buildRegistryFromManifests([]);
    const client = new RegistryClient(registry);

    const manifest = discoverManifestForCapability("testing", {
      agentsRoot,
      orchestratorProvidersDir: join(orchestratorRoot, "providers"),
    });
    client.registerFromManifest(manifest!);

    expect(client.listProviders("testing").length).toBe(1);
    expect(client.select("testing", "stable").id).toBe("testing");
  });
});

describe("JobStore", () => {
  it("lists and completes pending jobs", async () => {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { JobStore } = await import("../../src/jobs/job-store.js");

    const dir = mkdtempSync(join(tmpdir(), "orch-jobs-"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "run-abc.json"),
      JSON.stringify({
        apiVersion: "capability-orchestrator.io/v2",
        kind: "SkillJob",
        run_id: "run-abc",
        provider_id: "testing",
        skill_path: ".cursor/skills/testing/SKILL.md",
        capability: "testing",
        node_id: "test-suite",
        briefing: "test",
        definition_of_done: [],
        inputs: [],
        status: "pending",
      }),
    );

    const store = new JobStore(dir);
    expect(store.listPending()).toHaveLength(1);
    store.completeJob("run-abc", { success: true, evidence_path: "telemetry/evidence/x.json" });
    expect(store.listPending()).toHaveLength(0);
    expect(store.readJob("run-abc")?.status).toBe("completed");
  });
});
