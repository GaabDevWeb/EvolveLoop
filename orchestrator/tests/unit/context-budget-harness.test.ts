/**
 * Compare budget arm vs unconstrained path list (B0-style cap) using frozen real-corpus task shape.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { applyContextBudget, sliceFromFile } from "../../src/context/index.js";

const TASKS = join(
  process.cwd(),
  "..",
  "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/tasks-real-frozen.json",
);

describe("V22-BENCH — budget vs B0 path cap (measurement)", () => {
  it("budget arm reduces paths vs B0 cap 45 on synthetic wide list", () => {
    const spec = JSON.parse(readFileSync(TASKS, "utf-8"));
    const task = spec.tasks.find((t: { id: string }) => t.id === "R01");
    expect(task).toBeTruthy();

    const b0Cap = 45;
    const simulatedPaths = Array.from({ length: 60 }, (_, i) => `docs/file-${i}.md`);
    const b0Paths = simulatedPaths.slice(0, b0Cap);

    const slices = simulatedPaths.map((p, i) =>
      sliceFromFile(p, `content-${i}`, "generic", i),
    );
    const budgeted = applyContextBudget(slices, {
      ownerId: "bench:R01",
      limits: { max_paths: 15, max_pages: 5 },
    });

    const b0Measured = applyContextBudget(
      b0Paths.map((p, i) => sliceFromFile(p, `content-${i}`, "generic", i)),
      { ownerId: "bench:R01-b0", limits: { max_paths: b0Cap } },
    );

    expect(budgeted.paths_read.length).toBeLessThan(b0Measured.paths_read.length);
    expect(budgeted.telemetry.tokens_measured).toBeLessThanOrEqual(b0Measured.telemetry.tokens_measured);
  });
});
