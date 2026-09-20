import { describe, it, expect } from "vitest";
import { validateEvidence, buildSuccessEvidence } from "../../src/evidence/validator.js";
import type { GraphNode } from "../../src/types/index.js";

describe("Evidence validator", () => {
  const workerNode: GraphNode = {
    id: "be-auth",
    capability: "backend-implementation",
    type: "worker",
    dependencies: [],
    definition_of_done: [{ id: "dod-1", check: "Endpoints", verification: "automated" }],
    status: "running",
    retry_count: 0,
  };

  it("validates complete worker evidence", () => {
    const evidence = buildSuccessEvidence(workerNode, "run-1", "backend", 100);
    expect(validateEvidence(evidence, workerNode.definition_of_done, workerNode).valid).toBe(true);
  });

  it("rejects missing evidence", () => {
    expect(validateEvidence(undefined, workerNode.definition_of_done, workerNode).valid).toBe(false);
  });

  it("requires gate verdict", () => {
    const gateNode: GraphNode = { ...workerNode, type: "gate", capability: "testing" };
    const evidence = buildSuccessEvidence(gateNode, "run-1", "testing", 100);
    evidence.spec.verdict = null;
    expect(validateEvidence(evidence, gateNode.definition_of_done, gateNode).valid).toBe(false);
  });
});
