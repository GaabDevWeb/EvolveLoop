import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
  FilesystemMemoryStore,
  resolveDataPaths,
} from "../../src/index.js";
import { loginDashboardIR, testRegistry } from "../fixtures/login-dashboard.js";

describe("Integration — persistence", () => {
  it("writes events jsonl during engine run", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "orch-data-"));
    const paths = resolveDataPaths(dataRoot);

    const router = new ProviderRouter();
    for (const id of ["planner", "backend", "frontend-pro", "testing"]) {
      router.register(createMockProvider(id));
    }

    const engine = new ExecutionEngine({
      registry: testRegistry,
      providers: router,
      dataPaths: paths,
      memory: new FilesystemMemoryStore(paths.memoryDir),
    });

    const result = await engine.run({
      ir: loginDashboardIR,
      policy_id: "rapid-prototype",
      feature_id: "2026-06-30-login-dashboard",
    });

    expect(result.success).toBe(true);

    const eventsPath = join(paths.eventsDir, "2026-06-30-login-dashboard.jsonl");
    expect(existsSync(eventsPath)).toBe(true);
    const lines = readFileSync(eventsPath, "utf-8").trim().split("\n");
    expect(lines.length).toBeGreaterThan(5);
    expect(lines.some((l) => JSON.parse(l).type === "FeatureCompleted")).toBe(true);

    const contextPath = join(paths.memoryDir, "2026-06-30-login-dashboard", "context.yaml");
    expect(existsSync(contextPath)).toBe(true);
  });
});
