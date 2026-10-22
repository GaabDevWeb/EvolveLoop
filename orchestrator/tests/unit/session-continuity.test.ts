import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildSessionContinuitySnapshot,
  persistSessionContinuity,
  loadSessionContinuity,
  clearSessionContinuity,
  continuityEvidencePath,
  collectSatisfiedJobRunIds,
} from "../../src/session/session-continuity.js";
import { FilesystemMemoryStore } from "../../src/memory/filesystem-memory-store.js";

describe("session-continuity", () => {
  it("persists snapshot and evidence under memory feature dir", () => {
    const root = mkdtempSync(join(tmpdir(), "sc-"));
    const memory = new FilesystemMemoryStore(root);
    const featureId = "feat-1";
    memory.initFeature(featureId, { ir_id: "ir-1", policy: "rapid-prototype" });
    memory.append(featureId, {
      timestamp: "2026-01-01T00:00:00Z",
      source: "gate-a",
      type: "decision",
      content: "DECIDE_X",
    });

    const graph = {
      nodes: [
        { id: "gate-a", status: "satisfied" as const, run_id: "run-a" },
        { id: "gate-b", status: "waiting" as const, run_id: "run-b" },
      ],
      edges: [],
    };

    const snapshot = buildSessionContinuitySnapshot({
      featureId,
      irId: "ir-1",
      policyId: "rapid-prototype",
      graph,
      memory,
      waitingNode: { id: "gate-b", capability: "testing", run_id: "run-b" },
    });

    expect(collectSatisfiedJobRunIds(graph)).toEqual(["run-a"]);

    persistSessionContinuity(root, snapshot);
    expect(loadSessionContinuity(root, featureId)?.next_action?.node_id).toBe("gate-b");
    expect(existsSync(continuityEvidencePath(root, featureId))).toBe(true);

    clearSessionContinuity(root, featureId);
    expect(loadSessionContinuity(root, featureId)).toBeNull();
  });
});
