/**
 * Slow corpus bench — run via `npm run test:bench` (excluded from default `npm test`).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { runB0Retrieval, type BenchTask } from "../../src/context/bench-retrieval.js";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const TASKS_REAL = join(
  REPO_ROOT,
  "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/tasks-real-frozen.json",
);
const TASKS_HELD = join(
  REPO_ROOT,
  "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/tasks-held-out-frozen.json",
);

const BUDGET_LIMITS = { max_paths: 15, max_pages: 5 };

type Row = {
  task_id: string;
  suite: string;
  B0: { paths: number; tokens: number; recall: number };
  budget: { paths: number; tokens: number; recall: number; notes: string[] };
  recall_ok: boolean;
  tokens_ok: boolean;
};

function loadTasks(path: string, filter: (id: string) => boolean): BenchTask[] {
  const spec = JSON.parse(readFileSync(path, "utf-8")) as { tasks: BenchTask[] };
  return spec.tasks.filter((t) => filter(t.id));
}

function runPair(task: BenchTask, suite: string): Row {
  const official = runB0Retrieval(REPO_ROOT, task);
  const budgeted = runB0Retrieval(REPO_ROOT, task, {
    budget: BUDGET_LIMITS,
    ownerId: `bench:${task.id}`,
  });
  const recall_ok = budgeted.recall >= official.recall;
  const tokenSlack = Math.max(64, Math.floor(official.input_tokens * 0.005));
  const tokens_ok = budgeted.input_tokens <= official.input_tokens + tokenSlack;
  return {
    task_id: task.id,
    suite,
    B0: {
      paths: official.paths_read.length,
      tokens: official.input_tokens,
      recall: official.recall,
    },
    budget: {
      paths: budgeted.paths_read.length,
      tokens: budgeted.input_tokens,
      recall: budgeted.recall,
      notes: budgeted.recall_notes,
    },
    recall_ok,
    tokens_ok,
  };
}

describe("V22-BENCH nocirc — B0 vs ranked budget (query-only score)", () => {
  const real = loadTasks(TASKS_REAL, (id) => /^R0[1-6]$/.test(id));
  const held = loadTasks(TASKS_HELD, (id) => /^H(0[7-9]|1[0-8])$/.test(id));

  const all = [
    ...real.map((t) => ({ task: t, suite: "real-R01-R06" })),
    ...held.map((t) => ({ task: t, suite: "held-out-H07-H18" })),
  ];

  for (const { task, suite } of all) {
    it(`${task.id} (${suite}): recall budget >= B0`, () => {
      const row = runPair(task, suite);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(row));
      expect(row.budget.paths).toBeLessThanOrEqual(BUDGET_LIMITS.max_paths!);
      expect(row.recall_ok, `recall: ${JSON.stringify(row)}`).toBe(true);
      expect(row.tokens_ok, `tokens: ${JSON.stringify(row)}`).toBe(true);
    });
  }
});
