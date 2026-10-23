import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeMeasurementPaths } from "../../src/v22/measurement-paths.js";
import { runP0Handoff } from "../../src/v22/p0-handoff-measure.js";
import { repoRootFromModule } from "../../src/v22/p0-baseline-harness.js";

describe("V22-GAP-P0-5 handoff", () => {
  it("normalizes two machine paths to the same measured prompt", () => {
    const body = "cd /var/folders/ab/jobs && --jobs-dir /private/tmp/v22/jobs evidence /private/tmp/v22/jobs/evidence.json";
    const a = normalizeMeasurementPaths(body, {
      jobsDir: "/private/tmp/v22/jobs",
      jobsLabel: "jobs/v22-p0-baseline/handoff/receiver",
      orchestratorRoot: "/var/folders/ab/jobs",
    });
    const b = normalizeMeasurementPaths(
      "cd /home/runner/work/EvolveLoop/orchestrator && --jobs-dir /tmp/v22-p0/jobs evidence /tmp/v22-p0/jobs/evidence.json",
      {
        jobsDir: "/tmp/v22-p0/jobs",
        jobsLabel: "jobs/v22-p0-baseline/handoff/receiver",
        orchestratorRoot: "/home/runner/work/EvolveLoop/orchestrator",
      },
    );
    expect(a).toBe(b);
    expect(a).not.toContain("/tmp");
    expect(a).not.toContain("/var/folders");
    expect(a).toContain("jobs/v22-p0-baseline/handoff/receiver");
    expect(a).toContain("cd orchestrator");
  });

  it("measures transferred volume against the reference and the receiver resume", async () => {
    const report = await runP0Handoff({ n: 3 });
    expect(report.n).toBeGreaterThanOrEqual(3);
    expect(report.tokenizer).toBe("tiktoken:cl100k_base");
    expect(report.path_normalization).toBe("stable_relative");
    expect(report.reference_kind).toBe("sender_complete_context");
    expect(report.fidelity_checklist_kind).toBe("required_resume_payload");
    expect(report.fidelity_checklist_tokens).toBe(81);
    expect(report.reference_tokens).toBeGreaterThan(report.fidelity_checklist_tokens);
    expect(report.transferred_tokens).toBeGreaterThan(0);
    expect(report.receiver_resume_ok).toBe(true);
    expect(report.receiver_resume_status).toBe("PASS");
    expect(report.volume_ratio_status).toBe("LIMITED");
    expect(report.output_tokens).toBe("NOT_MEASURED");
    expect(report.cache_read_tokens).toBe("NOT_MEASURED");
    expect(report.cost).toBe("NOT_MEASURED");
    expect(report.model_latency_ms).toBe("NOT_MEASURED");
    expect(report.compaction).toBe("UNAVAILABLE");
    expect(report.compaction_tokens).toBe("UNAVAILABLE");
    expect(report.dispersion.transferred_tokens.value).toBe(0);
    expect(report.dispersion.transferred_tokens.expectation).toBe("zero_expected_deterministic");
    expect(report.dispersion.model).toBe("NOT_MEASURED");
    expect(report.latency_ms_status).toBe("LIMITED");
    expect(report.latency_ms).toBeGreaterThan(0);
    expect(new Set(report.runs.map((run) => run.transferred_tokens)).size).toBe(1);
    expect(report.runs.every((run) => run.payload_present && run.receiver_resume_ok)).toBe(true);

    if (process.env.V22_P0_WRITE_REPORT === "1") {
      const out = path.join(repoRootFromModule(), "docs/v22/baseline/raw/p0-handoff-report.json");
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    } else {
      const committedPath = path.join(repoRootFromModule(), "docs/v22/baseline/raw/p0-handoff-report.json");
      let committed: {
        schema_id?: string;
        path_normalization?: string;
        transferred_tokens?: number;
        reference_tokens?: number;
      } | null = null;
      try {
        committed = JSON.parse(readFileSync(committedPath, "utf-8")) as typeof committed;
      } catch {
        committed = null;
      }
      if (committed?.schema_id === "v22-p0-handoff-report-2" && committed.path_normalization === "stable_relative") {
        expect(committed.transferred_tokens).toBe(report.transferred_tokens);
        expect(committed.reference_tokens).toBe(report.reference_tokens);
      }
    }
  }, 60_000);
});
