import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { runB0Retrieval, type BenchTask } from "../../src/context/bench-retrieval.js";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const TASKS_PATH = join(
  REPO_ROOT,
  "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/tasks-real-frozen.json",
);

const BUDGET_LIMITS = { max_paths: 15, max_pages: 5 };

describe("V22-BENCH real corpus R01–R06 — B0 OFFICIAL vs runtime budget", () => {
  const spec = JSON.parse(readFileSync(TASKS_PATH, "utf-8")) as {
    corpus_root: string;
    tasks: BenchTask[];
  };
  const repoRoot = REPO_ROOT;
  const tasks = spec.tasks.filter((t) => /^R0[1-6]$/.test(t.id));

  for (const task of tasks) {
    it(`${task.id}: report paths/tokens/recall with and without budget`, () => {
      const official = runB0Retrieval(repoRoot, task);
      const budgeted = runB0Retrieval(repoRoot, task, {
        budget: BUDGET_LIMITS,
        ownerId: `bench:${task.id}`,
      });

      expect(official.arm).toBe("B0_OFFICIAL");
      expect(budgeted.arm).toBe("B0_BUDGET");
      expect(budgeted.paths_read.length).toBeLessThanOrEqual(BUDGET_LIMITS.max_paths!);

      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          task_id: task.id,
          B0_OFFICIAL: {
            paths: official.paths_read.length,
            tokens: official.input_tokens,
            recall: official.recall,
          },
          B0_BUDGET: {
            paths: budgeted.paths_read.length,
            tokens: budgeted.input_tokens,
            recall: budgeted.recall,
            recall_notes: budgeted.recall_notes,
          },
        }),
      );
    });
  }
});
