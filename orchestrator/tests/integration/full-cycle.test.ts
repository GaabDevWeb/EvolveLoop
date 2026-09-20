import { describe, it, expect, beforeEach } from "vitest";
import {
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
} from "../../src/index.js";
import { loginDashboardIR, testRegistry } from "../fixtures/login-dashboard.js";

function setupEngine(overrides?: Map<string, ReturnType<typeof createMockProvider>>) {
  const router = new ProviderRouter();
  const ids = new Set<string>();
  for (const cap of Object.values(testRegistry.capabilities)) {
    for (const p of cap.providers) ids.add(p.id);
  }
  for (const id of ids) {
    router.register(overrides?.get(id) ?? createMockProvider(id));
  }
  return new ExecutionEngine({ registry: testRegistry, providers: router });
}

describe("Integration — full cycle", () => {
  let engine: ExecutionEngine;

  beforeEach(() => {
    engine = setupEngine();
  });

  it("completes login dashboard feature end-to-end", async () => {
    const result = await engine.run({
      ir: loginDashboardIR,
      policy_id: "rapid-prototype",
      feature_id: "2026-06-30-login-dashboard",
    });

    expect(result.success).toBe(true);
    expect(result.graph.nodes.every((n) => n.status === "satisfied")).toBe(true);
    expect(result.events.some((e) => e.type === "FeatureStarted")).toBe(true);
    expect(result.events.some((e) => e.type === "FeatureCompleted")).toBe(true);
    expect(result.metrics.total_nodes).toBe(4);
  });

  it("executes nodes in dependency order", async () => {
    const result = await engine.run({
      ir: loginDashboardIR,
      policy_id: "rapid-prototype",
      feature_id: "order-test",
    });

    const completed = result.events
      .filter((e) => e.type === "NodeCompleted")
      .map((e) => e.payload.node_id as string);

    expect(completed.indexOf("contract-1")).toBeLessThan(completed.indexOf("be-auth"));
    expect(completed.indexOf("contract-1")).toBeLessThan(completed.indexOf("fe-login"));
  });

  it("emits ProviderSelected events", async () => {
    const result = await engine.run({
      ir: loginDashboardIR,
      policy_id: "rapid-prototype",
      feature_id: "provider-test",
    });

    const selected = result.events.filter((e) => e.type === "ProviderSelected");
    expect(selected.length).toBeGreaterThan(0);
  });
});

describe("Integration — failure scenarios", () => {
  it("retries failed node and completes", async () => {
    const testing = createMockProvider("testing");
    testing.setBehavior("test-suite", { type: "fail", attemptsBeforeSuccess: 2 });
    const overrides = new Map([["testing", testing]]);
    const engine = setupEngine(overrides);

    const result = await engine.run({
      ir: loginDashboardIR,
      policy_id: "rapid-prototype",
      feature_id: "retry-test",
    });

    expect(result.events.some((e) => e.type === "RetryScheduled")).toBe(true);
    expect(result.success).toBe(true);
  });

  it("handles gate rejection with orchestrator corrigir flow", async () => {
    const testing = createMockProvider("testing");
    let calls = 0;
    testing.setDefaultBehavior({ type: "success" });
    testing.setBehavior("test-suite", {
      type: "fail",
      attemptsBeforeSuccess: 2,
    });

    const ir = { ...loginDashboardIR, metadata: { ...loginDashboardIR.metadata, policy_ref: "high-reliability" } };
    const engine = setupEngine(new Map([["testing", testing]]));

    const result = await engine.run({
      ir,
      policy_id: "high-reliability",
      feature_id: "gate-reject-test",
    });

    expect(result.events.some((e) => e.type === "RetryScheduled")).toBe(true);
    expect(result.graph.nodes.find((n) => n.id === "test-suite")?.status).toBe("satisfied");
    void calls;
  });
});
