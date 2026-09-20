import { describe, it, expect } from "vitest";
import { summarizeExecutionTrace } from "../../src/telemetry/execution-trace.js";
import { buildAuthorityEvidence, buildWorkerEvidence } from "../../src/evidence/builders.js";
import type { EventEnvelope, GraphNode } from "../../src/types/index.js";

const node: GraphNode = {
  id: "n1",
  capability: "filesystem.read",
  type: "worker",
  status: "satisfied",
  dependencies: [],
  definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
  constraints: {},
  metadata: {},
  retry_count: 0,
};

describe("summarizeExecutionTrace", () => {
  it("summarizes events + authority/worker evidence", () => {
    const events: EventEnvelope[] = [
      {
        event_id: "e1",
        type: "FeatureStarted",
        timestamp: "2026-09-17T00:00:00Z",
        feature_id: "feat-obs",
        source: "engine",
        payload: {},
      },
      {
        event_id: "e2",
        type: "ProviderSelected",
        timestamp: "2026-09-17T00:00:01Z",
        feature_id: "feat-obs",
        source: "scheduler",
        payload: {
          capability: "filesystem.read",
          node_id: "n1",
          provider_id: "filesystem",
        },
      },
      {
        event_id: "e3",
        type: "NodeFailed",
        timestamp: "2026-09-17T00:00:02Z",
        feature_id: "feat-obs",
        source: "scheduler",
        payload: {
          node_id: "n2",
          capability: "shell.execute",
          error_code: "AUTHORITY_DENIED",
          message: "shell not allowed",
        },
      },
    ];

    const deny = buildAuthorityEvidence("n2", "run-1", "shell.execute", {
      decision: "deny",
      reason: "shell not allowed",
      handler_error: "AUTHORITY_DENIED",
    });

    const worker = buildWorkerEvidence(node, "run-1", "filesystem", 12, {
      commands_run: [],
      files_created: [],
    });
    if (worker.spec.payload && typeof worker.spec.payload === "object") {
      (worker.spec.payload as { authority?: unknown }).authority = {
        decision: "allow",
        reason: "ok",
        capability: "filesystem.read",
      };
    }

    const summary = summarizeExecutionTrace({
      events,
      evidence: [deny, worker],
      metrics: { feature_id: "feat-obs", success: false, duration_ms: 42 },
    });

    expect(summary.execution_id).toBe("feat-obs");
    expect(summary.latency_ms).toBe(42);
    expect(summary.success).toBe(false);
    expect(summary.event_counts.ProviderSelected).toBe(1);
    expect(summary.event_counts.NodeFailed).toBe(1);
    expect(summary.capability_calls.some((c) => c.capability === "filesystem.read")).toBe(true);
    expect(
      summary.policy_authority_decisions.some(
        (d) => d.decision === "deny" && d.capability === "shell.execute",
      ),
    ).toBe(true);
    expect(summary.errors.some((e) => e.code === "AUTHORITY_DENIED")).toBe(true);
  });
});
