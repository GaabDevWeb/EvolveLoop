import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { jobResultToExecuteResult } from "../../src/jobs/job-resume.js";
import type { GraphNode } from "../../src/types/index.js";

describe("jobResultToExecuteResult lineage", () => {
  const node: GraphNode = {
    id: "be-auth",
    capability: "backend-implementation",
    type: "worker",
    dependencies: [],
    definition_of_done: [{ id: "dod-be-1", check: "x", verification: "automated" }],
    status: "waiting",
    retry_count: 0,
    run_id: "run-correct",
  };

  const job = {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "SkillJob" as const,
    run_id: "run-correct",
    provider_id: "backend",
    skill_path: ".cursor/skills/backend/SKILL.md",
    capability: "backend-implementation",
    node_id: "be-auth",
    briefing: "",
    definition_of_done: [],
    inputs: [],
    status: "completed" as const,
  };

  it("returns LINEAGE_MISMATCH when evidence run_id or node_id mismatch", () => {
    const base = mkdtempSync(join(tmpdir(), "lineage-ev-"));
    const evidencePath = join(base, "bad.json");
    writeFileSync(
      evidencePath,
      JSON.stringify({
        apiVersion: "capability-orchestrator.io/v2",
        kind: "Evidence",
        metadata: {
          node_id: "wrong-node",
          run_id: "wrong-run",
          emitter: "worker",
          provider_id: "backend",
          capability: "backend-implementation",
        },
        spec: {
          status: "complete",
          confidence: 1,
          coverage: 1,
          assumptions: [],
          checks: [],
          verdict: "passed",
        },
      }),
    );

    const result = jobResultToExecuteResult(
      job,
      {
        run_id: "run-correct",
        success: true,
        evidence_path: evidencePath,
        completed_at: new Date().toISOString(),
      },
      node,
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("LINEAGE_MISMATCH");
  });
});
