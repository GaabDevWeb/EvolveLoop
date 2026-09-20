import { describe, it, expect } from "vitest";
import { RegistryClient, buildRegistryFromManifests } from "../../src/registry/registry-client.js";
import { loadContractsFromDir } from "../../src/contracts/contract-registry.js";
import { join } from "node:path";
import type { ProviderEntry } from "../../src/types/index.js";

describe("RegistryClient contract filter", () => {
  const contracts = loadContractsFromDir(join(import.meta.dirname, "../../contracts"));

  const registry = buildRegistryFromManifests([
    {
      capability: "frontend-ui",
      provider: {
        id: "frontend-pro",
        priority: 100,
        cost: "medium",
        quality_score: 0.9,
        availability: "active",
        version: "1.1.0",
        contract: "contracts/frontend-ui@2.0.0",
      } as ProviderEntry,
    },
    {
      capability: "frontend-ui",
      provider: {
        id: "legacy-fe",
        priority: 50,
        cost: "medium",
        quality_score: 0.7,
        availability: "active",
        version: "1.0.0",
        contract: "contracts/frontend-ui@1.0.0",
      } as ProviderEntry,
    },
  ]);

  it("filters providers by capability_version", () => {
    const client = new RegistryClient(registry, contracts);
    const selected = client.select("frontend-ui", "stable", undefined, {
      capability_version: ">=2.0.0 <3.0.0",
    });
    expect(selected.id).toBe("frontend-pro");
  });

  it("throws when no compatible provider", () => {
    const client = new RegistryClient(registry, contracts);
    expect(() =>
      client.select("frontend-ui", "stable", undefined, { capability_version: ">=3.0.0" }),
    ).toThrow("No provider");
  });
});
