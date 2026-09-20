import { describe, it, expect } from "vitest";
import { Orchestrator } from "../../src/orchestrator/orchestrator.js";

describe("Orchestrator", () => {
  const orq = new Orchestrator();

  it("decides replan on unrecoverable failure", () => {
    expect(orq.decide({ blocked_reason: "unrecoverable_failure", feature_id: "f1" })).toBe("replan");
  });

  it("decides corrigir on gate rejection", () => {
    expect(orq.decide({ blocked_reason: "gate_rejected", feature_id: "f1" })).toBe("corrigir");
  });
});
