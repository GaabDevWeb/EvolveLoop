import { describe, it, expect } from "vitest";
import {
  buildPlanningEvidence,
  buildSchedulingEvidence,
  buildSelectionEvidence,
  buildWorkerEvidence,
  validateEvidenceV21,
} from "../../src/evidence/builders.js";
import { buildSelectionPayload } from "../../src/evidence/builders.js";
import { canTransition, deriveRunState } from "../../src/state/run-state.js";
import { SmartMockExecutor } from "../../src/executors/smart-mock-executor.js";
import type { GraphNode, ProviderEntry } from "../../src/types/index.js";

describe("contracts v2.1 prototype", () => {
  it("state machine allows valid node transitions", () => {
    expect(canTransition("pending", "running")).toBe(true);
    expect(canTransition("running", "waiting")).toBe(true);
    expect(canTransition("waiting", "satisfied")).toBe(true);
    expect(canTransition("satisfied", "running")).toBe(false);
  });

  it("derives run state from nodes", () => {
    const nodes = [
      { status: "satisfied" as const },
      { status: "satisfied" as const },
    ] as GraphNode[];
    expect(deriveRunState(nodes)).toBe("completed");
  });

  it("planner emits planning evidence", () => {
    const ev = buildPlanningEvidence("run-1", {
      type: "planning",
      decomposition_confidence: 0.9,
      unresolved_dependencies: [],
      critical_path: ["a", "b"],
    });
    expect(ev.metadata.emitter).toBe("planner");
    expect(ev.spec.payload?.type).toBe("planning");
    expect(ev.spec.confidence).toBe(0.9);
  });

  it("scheduler emits scheduling evidence", () => {
    const ev = buildSchedulingEvidence("node-1", "run-2", {
      type: "scheduling",
      selected_provider: "backend",
      rejected_providers: [],
      strategy: "stable",
      ready_batch: ["node-1"],
      parallelism: 2,
    });
    expect(ev.metadata.emitter).toBe("scheduler");
    expect(ev.spec.payload?.type).toBe("scheduling");
  });

  it("registry emits selection evidence", () => {
    const ranked: ProviderEntry[] = [
      { id: "a", priority: 100, cost: "low", quality_score: 0.9, availability: "active", version: "1" },
      { id: "b", priority: 50, cost: "medium", quality_score: 0.7, availability: "active", version: "1" },
    ];
    const payload = buildSelectionPayload("backend-implementation", ranked, ranked[0], "stable", true);
    const ev = buildSelectionEvidence("backend-implementation", "run-3", payload);
    expect(ev.metadata.emitter).toBe("registry");
    expect(ev.spec.payload?.type).toBe("selection");
  });

  it("worker evidence validates with confidence", () => {
    const node: GraphNode = {
      id: "w1",
      capability: "backend-implementation",
      type: "worker",
      dependencies: [],
      definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
      status: "running",
      retry_count: 0,
    };
    const ev = buildWorkerEvidence(node, "run-4", "backend", 100, {
      checkResults: [{ dod_id: "d1", result: "pass", details: "ok" }],
      status: "complete",
    });
    expect(validateEvidenceV21(ev, node.definition_of_done, node, 0.5).valid).toBe(true);
  });

  it("smart mock executor supports cancel", async () => {
    const ex = new SmartMockExecutor("mock", { delayMs: 200 });
    const node: GraphNode = {
      id: "n1",
      capability: "testing",
      type: "worker",
      dependencies: [],
      definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
      status: "running",
      retry_count: 0,
    };
    const promise = ex.execute({
      run_id: "r1",
      node_id: "n1",
      capability: "testing",
      inputs: [],
      definition_of_done: node.definition_of_done,
      policy: { retries_remaining: 1 },
      memory_scope: "f1",
      knowledge_hits: [],
      briefing: "test",
      node,
    });
    await new Promise((r) => setTimeout(r, 10));
    await ex.cancel("r1");
    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("CANCELLED");
  });
});
