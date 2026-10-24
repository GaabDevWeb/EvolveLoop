import { describe, expect, it } from "vitest";
import { requireTiktokenCounts } from "../../src/context/tokenizer.js";
import { P0_TASK_IDS, type P0TaskId } from "../../src/v22/p0-baseline-harness.js";
import { CAVEMAN_EXCEPTION_LINE, CAVEMAN_UPSTREAM_COMMIT } from "../../src/v22/caveman-hard-gate.js";
import {
  buildCavemanArmPrompt,
  runCavemanOutputMeasure,
  type CavemanMeasurePack,
} from "../../src/v22/caveman-output-measure.js";

const SECRET = "sk-test-caveman-key-should-not-leak";
const SHA = CAVEMAN_UPSTREAM_COMMIT;

function packs(): CavemanMeasurePack[] {
  return P0_TASK_IDS.map((taskId) => ({
    taskId: taskId as P0TaskId,
    query: `Pergunta ${taskId}`,
    needles: ["cavemanMeasureAnchor", "do not leak"],
    context: [
      "function cavemanMeasureAnchor() { return 1; }",
      "npm test -- --run",
      "orchestrator/src/v22/caveman-hard-gate.ts",
      `sha ${SHA}`,
      "task_id: V22-CAVEMAN-HG-1",
      "status: pass",
      "No secret leakage in evidence payload. do not leak",
    ].join("\n"),
  }));
}

function ndjson(result: string): string {
  return [
    JSON.stringify({ type: "system", subtype: "init", model: "Composer", session_id: "s" }),
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 40,
      duration_api_ms: 40,
      result,
      session_id: "s",
      request_id: "r",
    }),
  ].join("\n");
}

describe("V22-CAVEMAN-HG-1 output measure", () => {
  it("dry-run plans six tasks, N=5, and isolates the gate to the ON arm", async () => {
    const report = await runCavemanOutputMeasure({ dryRun: true, n: 5, packs: packs(), repoRoot: "/tmp" });
    expect(report.status).toBe("DRY_RUN");
    expect(report.provider).toBe("cursor-agent");
    expect(report.tasks.map((task) => task.id)).toEqual([...P0_TASK_IDS]);
    expect(report.n).toBe(5);
    expect(report.calls).toBe(60);
    expect(report.tokenizer).toBe("tiktoken:cl100k_base");
    for (const task of report.tasks) {
      expect(task.arms.on.local_prompt_tokens).toBeGreaterThan(task.arms.off.local_prompt_tokens);
      expect(task.arms.on.response_tokens).toBe("NOT_MEASURED");
      expect(task.arms.off.latency_ms).toBe("NOT_MEASURED");
      expect(task.arms.off.quality).toBe("NOT_MEASURED");
    }
    const sample = packs()[0]!;
    const off = buildCavemanArmPrompt(sample.query, sample.context, "off");
    const on = buildCavemanArmPrompt(sample.query, sample.context, "on");
    expect(on.startsWith(off)).toBe(true);
    expect(on).toContain(CAVEMAN_EXCEPTION_LINE);
    expect(on).toContain("Only fluff die.");
    expect(off).not.toContain("Only fluff die.");
    expect(off).toContain(SHA);
    expect(on).toContain(SHA);
  });

  it("measures tiktoken of the reply, latency, and quality without leaking the key", async () => {
    const reply = "cavemanMeasureAnchor\ndo not leak";
    const [expectedTokens] = requireTiktokenCounts([reply]);
    const seen: string[] = [];
    const report = await runCavemanOutputMeasure({
      dryRun: false,
      n: 5,
      packs: packs(),
      repoRoot: "/tmp",
      apiKey: SECRET,
      spawnImpl: async (_bin, args, spawnOptions) => {
        seen.push(spawnOptions.input);
        expect(args.join(" ")).not.toContain(SECRET);
        expect(spawnOptions.input).not.toContain(SECRET);
        return { status: 0, stdout: ndjson(reply), stderr: "" };
      },
    });
    expect(report.status).toBe("MEASURED");
    expect(seen).toHaveLength(60);
    expect(seen.filter((prompt) => prompt.includes("Only fluff die."))).toHaveLength(30);
    const arm = report.tasks[0]?.arms.on;
    expect(arm?.response_tokens).toBe(expectedTokens);
    expect(arm?.latency_ms).toBe(40);
    expect(arm?.quality).toBe(1);
    expect(arm?.provider_output_tokens).toBe("NOT_MEASURED");
    expect(JSON.stringify(report)).not.toContain(SECRET);
  });

  it("refuses a live run without a key", async () => {
    let called = 0;
    const report = await runCavemanOutputMeasure({
      dryRun: false,
      n: 5,
      packs: packs(),
      repoRoot: "/tmp",
      spawnImpl: async () => {
        called += 1;
        return { status: 0, stdout: ndjson("x"), stderr: "" };
      },
    });
    expect(report.status).toBe("ABORTED_MISSING_KEY");
    expect(called).toBe(0);
  });
});
