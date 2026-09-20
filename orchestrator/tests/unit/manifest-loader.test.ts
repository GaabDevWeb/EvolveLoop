import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPolicy, loadPoliciesFromDir, loadYamlFile, manifestToRegistryEntries } from "../../src/registry/manifest-loader.js";
import type { ProviderManifest } from "../../src/types/index.js";

const root = join(import.meta.dirname, "../..");

describe("Manifest loader", () => {
  it("loads provider manifest", () => {
    const manifest = loadYamlFile<ProviderManifest>(
      join(root, "providers/backend/provider.yaml"),
    );
    expect(manifest.metadata.name).toBe("backend");
    const entries = manifestToRegistryEntries(manifest);
    expect(entries[0].capability).toBe("backend-implementation");
  });

  it("loads execution policy", () => {
    const policy = loadPolicy(join(root, "policies/high-reliability.yaml"));
    expect(policy.metadata.id).toBe("high-reliability");
    expect(policy.spec.provider_strategy).toBe("highest_quality");
  });

  it("loads all policies from directory", () => {
    const policies = loadPoliciesFromDir(join(root, "policies"));
    expect(policies.length).toBeGreaterThanOrEqual(1);
    expect(policies.some((p) => p.metadata.id === "high-reliability")).toBe(true);
  });
});
