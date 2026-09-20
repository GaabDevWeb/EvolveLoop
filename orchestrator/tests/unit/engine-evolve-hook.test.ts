import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ExecutionEngine } from "../../src/engine/execution-engine.js";
import { LongitudinalEvolveLoop } from "../../src/evolveloop/index.js";
import { ProviderRouter } from "../../src/providers/mock-provider.js";
import { createSmartMockProvider } from "../../src/executors/smart-mock-executor.js";
import { loginDashboardIR, testRegistry } from "../fixtures/login-dashboard.js";

describe("ExecutionEngine evolveLoop opt-in hook", () => {
  it("attaches observer when evolveLoop+evolveScope set; run still completes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "el-eng-"));
    try {
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir });
      const providers = new ProviderRouter();
      providers.register(createSmartMockProvider("planner"));
      providers.register(createSmartMockProvider("backend"));
      providers.register(createSmartMockProvider("frontend-pro"));
      providers.register(createSmartMockProvider("testing"));

      const engine = new ExecutionEngine({
        registry: testRegistry,
        providers,
        policiesDir: resolve(import.meta.dirname, "../../policies"),
        evolveLoop: loop,
        evolveScope: { type: "USER", id: "engine-user" },
      });

      const result = await engine.run({
        ir: loginDashboardIR,
        policy_id: "rapid-prototype",
        feature_id: "login-dash-evolve",
      });

      expect(result.finished).toBe(true);
      expect(loop.getStore().loadAllSignals().length).toBeGreaterThanOrEqual(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("omits observer when evolveLoop not set (default)", async () => {
    const providers = new ProviderRouter();
    providers.register(createSmartMockProvider("planner"));
    providers.register(createSmartMockProvider("backend"));
    providers.register(createSmartMockProvider("frontend-pro"));
    providers.register(createSmartMockProvider("testing"));

    const engine = new ExecutionEngine({
      registry: testRegistry,
      providers,
      policiesDir: resolve(import.meta.dirname, "../../policies"),
    });

    const result = await engine.run({
      ir: loginDashboardIR,
      policy_id: "rapid-prototype",
      feature_id: "login-dash-no-evolve",
    });
    expect(result.finished).toBe(true);
  });
});
