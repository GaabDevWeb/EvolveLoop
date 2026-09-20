import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPickupPrompt, invokePickup } from "../../src/jobs/job-pickup.js";

describe("Job pickup", () => {
  it("buildPickupPrompt includes skill path and complete command", () => {
    const prompt = buildPickupPrompt(
      {
        apiVersion: "capability-orchestrator.io/v2",
        kind: "SkillJob",
        run_id: "abc-123",
        provider_id: "testing",
        skill_path: ".cursor/skills/testing/SKILL.md",
        capability: "testing",
        node_id: "gate-test",
        briefing: "Run test suite",
        definition_of_done: [{ id: "d1", check: "green", verification: "automated" }],
        inputs: [],
        status: "pending",
      },
      "/tmp/jobs",
    );
    expect(prompt).toContain("testing/SKILL.md");
    expect(prompt).toContain("abc-123");
    expect(prompt).toContain("run-jobs -- complete");
  });

  it("invokePickup writes prompt artifacts", () => {
    const base = mkdtempSync(join(tmpdir(), "pickup-"));
    const jobsDir = join(base, "jobs");
    const promptDir = join(base, "pickup");

    const job = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "SkillJob",
      run_id: "run-1",
      provider_id: "testing",
      skill_path: ".cursor/skills/testing/SKILL.md",
      capability: "testing",
      node_id: "n1",
      briefing: "Execute tests",
      definition_of_done: [],
      inputs: [],
      status: "pending" as const,
    };
    mkdirSync(jobsDir, { recursive: true });
    writeFileSync(join(jobsDir, "run-1.json"), JSON.stringify(job));

    const plan = invokePickup({ jobsDir, promptDir });
    expect(plan.status).toBe("ready");
    expect(plan.run_id).toBe("run-1");
    expect(existsSync(join(promptDir, "current-job.md"))).toBe(true);
    const md = readFileSync(join(promptDir, "current-job.md"), "utf-8");
    expect(md).toContain("Execute tests");
  });

  it("invokePickup returns idle when no pending jobs", () => {
    const base = mkdtempSync(join(tmpdir(), "pickup-idle-"));
    const plan = invokePickup({
      jobsDir: join(base, "jobs"),
      promptDir: join(base, "pickup"),
    });
    expect(plan.status).toBe("idle");
  });
});
