import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { PolicyEngine } from "../../src/policies/policy-engine.js";
import type { GraphNode } from "../../src/types/index.js";

describe("PolicyEngine", () => {
  const engine = new PolicyEngine();

  it("resolves high-reliability policy", () => {
    const p = engine.resolve("high-reliability");
    expect(p.metadata.id).toBe("high-reliability");
    expect(p.spec.retries.default).toBe(3);
  });

  it("resolves rapid-prototype with skipped gates", () => {
    const p = engine.resolve("rapid-prototype");
    expect(p.spec.gates.skipped).toContain("security-review");
    expect(p.spec.provider_strategy).toBe("fastest");
  });

  it("returns retries by capability", () => {
    const p = engine.resolve("high-reliability");
    const node = { capability: "testing", type: "gate" } as GraphNode;
    expect(engine.retriesFor(p, node)).toBe(2);
  });

  it("skips gates per policy", () => {
    const p = engine.resolve("rapid-prototype");
    expect(engine.gateEnabled(p, "security-review")).toBe(false);
    expect(engine.gateEnabled(p, "testing")).toBe(true);
  });

  it("loads policy overrides from YAML directory", () => {
    const root = join(import.meta.dirname, "../..");
    const yamlEngine = new PolicyEngine({ policiesDir: join(root, "policies") });
    const p = yamlEngine.resolve("high-reliability");
    expect(p.spec.retries.by_capability?.["frontend-ui"]).toBe(2);
  });

  it("resolves cost-optimized policy", () => {
    const p = engine.resolve("cost-optimized");
    expect(p.spec.provider_strategy).toBe("cheapest");
    expect(p.spec.gate_depth).toBe("fast");
    expect(p.spec.min_confidence).toBe(0.6);
  });
});
