import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JobStore } from "../../src/jobs/job-store.js";

describe("JobStore.reopenJob", () => {
  it("resets completed job to pending and removes result file", () => {
    const base = mkdtempSync(join(tmpdir(), "job-reopen-"));
    const jobsDir = join(base, "jobs");
    mkdirSync(jobsDir, { recursive: true });
    const store = new JobStore(jobsDir);
    const runId = "run-reopen-1";

    writeFileSync(
      join(jobsDir, `${runId}.json`),
      JSON.stringify({
        apiVersion: "capability-orchestrator.io/v2",
        kind: "SkillJob",
        run_id: runId,
        provider_id: "testing",
        skill_path: ".cursor/skills/testing/SKILL.md",
        capability: "testing",
        node_id: "n1",
        briefing: "x",
        definition_of_done: [],
        inputs: [],
        status: "completed",
      }),
    );
    store.completeJob(runId, { success: true, evidence_path: "/tmp/ev.json" });
    expect(existsSync(join(jobsDir, `${runId}.result.json`))).toBe(true);

    const job = store.reopenJob(runId);
    expect(job.status).toBe("pending");
    expect(existsSync(join(jobsDir, `${runId}.result.json`))).toBe(false);
    expect(store.listPending()).toHaveLength(1);
  });
});
