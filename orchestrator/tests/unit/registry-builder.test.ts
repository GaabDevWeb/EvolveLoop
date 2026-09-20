import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { loadYamlFile } from "../../src/registry/manifest-loader.js";
import { buildRegistry } from "../../src/registry/registry-builder.js";
import type { ProviderManifest } from "../../src/types/index.js";

describe("RegistryBuilder", () => {
  const providersDir = join(import.meta.dirname, "../../providers");

  it("builds registry from manifests", () => {
    const manifests = ["backend", "testing", "frontend-pro"].map((name) =>
      loadYamlFile<ProviderManifest>(join(providersDir, name, "provider.yaml")),
    );

    const registry = buildRegistry({ manifests });
    expect(registry.kind).toBe("CapabilityRegistry");
    expect(registry.capabilities["testing"]?.providers.length).toBeGreaterThan(0);
    expect(registry.capabilities["testing"]?.schema_version).toBe("contracts/testing@1.0.0");
    expect(registry.capabilities["frontend-ui"]?.schema_version).toContain("frontend-ui@2.0.0");
  });

  it("merges telemetry into provider stats", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-tel-"));
    writeFileSync(
      join(dir, "feat.jsonl"),
      [
        JSON.stringify({
          type: "NodeCompleted",
          payload: { provider_id: "backend", duration_ms: 100 },
          timestamp: "2026-06-30T10:00:00Z",
        }),
        JSON.stringify({
          type: "NodeCompleted",
          payload: { provider_id: "backend", duration_ms: 200 },
          timestamp: "2026-06-30T10:05:00Z",
        }),
        JSON.stringify({
          type: "NodeFailed",
          payload: { provider_id: "backend" },
          timestamp: "2026-06-30T10:10:00Z",
        }),
      ].join("\n") + "\n",
    );

    const manifests = [loadYamlFile<ProviderManifest>(join(providersDir, "backend", "provider.yaml"))];
    const registry = buildRegistry({ manifests, telemetryEventsDir: dir });
    const backend = registry.capabilities["backend-implementation"]?.providers.find((p) => p.id === "backend");
    expect(backend?.telemetry?.total_runs).toBe(3);
    expect(backend?.telemetry?.success_rate).toBeCloseTo(2 / 3, 2);
    expect(backend?.telemetry?.average_duration_ms).toBe(150);
  });
});
