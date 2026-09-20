import { describe, it, expect } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bootstrapProviders,
  loadProviderManifests,
  buildRegistryFromManifestFiles,
  MockProvider,
} from "../../src/index.js";
import type { CapabilityIR } from "../../src/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const providersDir = resolve(__dirname, "../../providers");
const workspaceRoot = resolve(__dirname, "../..");

const fsListIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: "ir-fs", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
  spec: {
    nodes: [
      {
        id: "n1",
        capability: "filesystem.list",
        type: "worker",
        dependencies: [],
        definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
      },
    ],
  },
};

describe("Provider bootstrap", () => {
  it("registers real deterministic providers", () => {
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "real",
      manifests,
      registry,
      workspaceRoot,
    });

    expect(boot.mode).toBe("real");
    expect(boot.registered.some((r) => r.id === "filesystem")).toBe(true);
    expect(boot.registered.find((r) => r.id === "filesystem")?.plugin_type).toBe("deterministic");
    const runtime = boot.router.get("filesystem");
    expect(runtime.id).toBe("filesystem");
    expect(runtime).not.toBeInstanceOf(MockProvider);
  });

  it("marks cursor-skill PROVIDER_UNAVAILABLE without jobs-dir (no mock)", () => {
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "real",
      manifests,
      registry,
      workspaceRoot,
    });

    const backend = boot.unavailable.find((u) => u.id === "backend");
    expect(backend?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(() => boot.router.get("backend")).toThrow(/Provider not found/);
  });

  it("explicit mock mode registers synthetic mocks", () => {
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "mock",
      manifests,
      registry,
      workspaceRoot,
      ir: fsListIR,
    });

    expect(boot.mode).toBe("mock");
    expect(boot.registered.every((r) => r.provider_mode === "mock")).toBe(true);
    expect(boot.router.get("filesystem")).toBeDefined();
  });

  it("real mode does not silently use MockProvider for filesystem", async () => {
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "real",
      manifests,
      registry,
      workspaceRoot,
    });

    const fs = boot.router.get("filesystem");
    // MockProvider returns MOCK_FAILURE when configured; Deterministic returns real list
    const node = {
      id: "n1",
      capability: "filesystem.list",
      type: "worker" as const,
      status: "running" as const,
      dependencies: [],
      definition_of_done: [{ id: "d1", check: "ok", verification: "automated" as const }],
      constraints: { path: "." },
      retry_count: 0,
    };
    const result = await fs.execute({
      run_id: "run-real-1",
      node_id: "n1",
      capability: "filesystem.list",
      inputs: [],
      definition_of_done: node.definition_of_done,
      policy: { retries_remaining: 0 },
      memory_scope: "test",
      knowledge_hits: [],
      briefing: "list",
      node,
    });

    expect(result.success).toBe(true);
    expect(result.provider_id).toBe("filesystem");
    expect(result.error?.code).not.toBe("MOCK_FAILURE");
    const payload = result.evidence?.spec.payload as { result?: { kind?: string } } | undefined;
    const normalized = (result.evidence?.spec as { normalized?: { kind?: string } }).normalized;
    const kind = normalized?.kind ?? payload?.result?.kind;
    expect(kind).toBe("FileListResult");
  });
});
