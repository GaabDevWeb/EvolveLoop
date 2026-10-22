import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPickupPrompt } from "../../src/jobs/job-pickup.js";
import { estimateWhitespaceTokens } from "../../src/v22/token-estimate.js";
import type { SkillJob } from "../../src/jobs/job-store.js";

const orchestratorRoot = join(import.meta.dirname, "../..");

function runCli(
  script: "run-engine" | "run-jobs",
  argv: string[],
  env: Record<string, string> = {},
): string {
  const result = spawnSync("node", [join(orchestratorRoot, `dist/cli/${script}.js`), ...argv], {
    cwd: orchestratorRoot,
    encoding: "utf-8",
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  return result.stdout ?? "";
}

function parseRunEngineSummary(stdout: string): Record<string, unknown> {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("run-engine did not emit JSON summary");
  return JSON.parse(stdout.slice(start, end + 1)) as Record<string, unknown>;
}

describe("V22 P2 goals integration (run-engine / run-jobs)", () => {
  const envKeys = [
    "EVOLVELOOP_GRAPHIFY",
    "EVOLVELOOP_BREVITY_CAVEMAN",
    "EVOLVELOOP_PROMPT_CACHE",
  ];
  const saved: Record<string, string | undefined> = {};

  beforeAll(() => {
    execFileSync("npm", ["run", "build"], { cwd: orchestratorRoot, stdio: "inherit" });
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  function clearP2Env() {
    for (const k of envKeys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("run-engine output unchanged when all P2 flags off (regression)", () => {
    clearP2Env();
    const ir = join(orchestratorRoot, "tests/fixtures/v22-p2-mini.ir.yaml");
    const out = runCli("run-engine", ["--ir", ir, "--feature-id", "v22-p2-regression"]);
    const summary = parseRunEngineSummary(out);
    expect(summary.v22_p2).toBeUndefined();
    expect(typeof summary.success).toBe("boolean");
  });

  it("run-engine attaches v22_p2 bench when brevity+cache flags on", () => {
    clearP2Env();
    process.env.EVOLVELOOP_BREVITY_CAVEMAN = "on";
    process.env.EVOLVELOOP_PROMPT_CACHE = "on";
    process.env.EVOLVELOOP_GRAPHIFY = "on";
    const ir = join(orchestratorRoot, "tests/fixtures/v22-p2-mini.ir.yaml");
    const out = runCli(
      "run-engine",
      ["--ir", ir, "--feature-id", "v22-p2-on"],
      {
        EVOLVELOOP_BREVITY_CAVEMAN: "on",
        EVOLVELOOP_PROMPT_CACHE: "on",
        EVOLVELOOP_GRAPHIFY: "on",
      },
    );
    const summary = parseRunEngineSummary(out);
    expect((summary.v22_p2 as { graphify?: { enabled?: boolean } })?.graphify?.enabled).toBe(true);
    const bench = (
      summary.v22_p2 as {
        bench?: { goal_009_pickup?: { pairs?: unknown[] }; goal_010_prefix?: { vendor_http_cache_hit?: string } };
      }
    )?.bench;
    expect(bench?.goal_009_pickup?.pairs).toHaveLength(12);
    expect(bench?.goal_010_prefix?.vendor_http_cache_hit).toBe("NOT_MEASURED");
  });

  it("run-jobs invoke path compresses briefing only when caveman flag on", () => {
    const jobsDir = mkdtempSync(join(tmpdir(), "v22-p2-jobs-"));
    const job: SkillJob = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "SkillJob",
      run_id: "00000000-0000-4000-8000-000000000001",
      provider_id: "testing",
      skill_path: ".cursor/skills/testing/SKILL.md",
      capability: "testing",
      node_id: "n1",
      briefing:
        "Please carefully implement the testing gate and do not skip the security checklist for this node.",
      definition_of_done: [{ id: "d1", check: "pass", verification: "automated" }],
      inputs: [],
      status: "pending",
    };
    writeFileSync(join(jobsDir, `${job.run_id}.json`), JSON.stringify(job));

    clearP2Env();
    const offPrompt = buildPickupPrompt(job, jobsDir, orchestratorRoot);
    process.env.EVOLVELOOP_BREVITY_CAVEMAN = "on";
    const onPrompt = buildPickupPrompt(job, jobsDir, orchestratorRoot);

    expect(estimateWhitespaceTokens(onPrompt)).toBeLessThan(estimateWhitespaceTokens(offPrompt));
    expect(onPrompt).toContain("do not skip");
    expect(onPrompt).toContain('"id": "d1"');

    const promptDir = mkdtempSync(join(tmpdir(), "v22-p2-pickup-"));
    const invokeOut = runCli(
      "run-jobs",
      ["invoke", "--jobs-dir", jobsDir, "--prompt-dir", promptDir],
      { EVOLVELOOP_BREVITY_CAVEMAN: "on" },
    );
    const plan = JSON.parse(invokeOut);
    expect(plan.status).toBe("ready");
    const written = readFileSync(join(promptDir, "current-job.md"), "utf-8");
    expect(written).toContain("do not skip");
    rmSync(jobsDir, { recursive: true, force: true });
    rmSync(promptDir, { recursive: true, force: true });
  });
});
