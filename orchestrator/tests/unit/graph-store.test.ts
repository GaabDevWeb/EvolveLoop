import { describe, it, expect } from "vitest";
import { GraphStore } from "../../src/graph/graph-store.js";
import { buildMinimalIR } from "../fixtures/login-dashboard.js";

describe("GraphStore", () => {
  it("initializes all nodes as pending", () => {
    const graph = new GraphStore(buildMinimalIR());
    expect(graph.getAllNodes().every((n) => n.status === "pending")).toBe(true);
  });

  it("checks dependencies satisfied", () => {
    const graph = new GraphStore(buildMinimalIR());
    const b = graph.getNode("b")!;
    expect(graph.dependenciesSatisfied(b)).toBe(false);
    graph.setNodeStatus("a", "satisfied");
    expect(graph.dependenciesSatisfied(b)).toBe(true);
  });

  it("invalidates downstream only", () => {
    const graph = new GraphStore(buildMinimalIR());
    graph.setNodeStatus("a", "satisfied");
    graph.setNodeStatus("b", "satisfied");
    const affected = graph.invalidateDownstream("a");
    expect(affected).toContain("b");
    expect(graph.getNode("a")!.status).toBe("satisfied");
    expect(graph.getNode("b")!.status).toBe("pending");
  });

  it("isFinished when all satisfied or skipped", () => {
    const graph = new GraphStore(buildMinimalIR());
    expect(graph.isFinished()).toBe(false);
    graph.setNodeStatus("a", "satisfied");
    graph.setNodeStatus("b", "skipped");
    expect(graph.isFinished()).toBe(true);
  });
});
