import { describe, it, expect } from "vitest";
import { RegistryClient } from "../../src/registry/registry-client.js";
import { testRegistry } from "../fixtures/login-dashboard.js";

describe("RegistryClient", () => {
  const registry = new RegistryClient(testRegistry);

  it("selects provider by highest_quality", () => {
    const p = registry.select("frontend-ui", "highest_quality");
    expect(p.id).toBe("frontend-pro");
  });

  it("selects provider by priority", () => {
    const p = registry.select("frontend-ui", "priority");
    expect(p.id).toBe("frontend-pro");
  });

  it("throws when no provider", () => {
    expect(() => registry.select("unknown-cap", "stable")).toThrow();
  });

  it("updates stats on success", () => {
    registry.recordSuccess("backend", {
      run_id: "r1",
      success: true,
      duration_ms: 200,
      provider_id: "backend",
    });
    const p = registry.select("backend-implementation", "stable");
    expect(p.telemetry?.total_runs).toBeGreaterThan(0);
  });
});
