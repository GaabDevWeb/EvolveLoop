import { buildPickupPrompt } from "../jobs/job-pickup.js";
import { BENCH_R_TASKS } from "./bench-r-tasks.js";
import { BENCH_H_TASKS } from "./bench-h-tasks.js";
import { buildBenchSkillJob, type BenchPickupTask } from "./bench-pickup-fixture.js";
import {
  protectedPickupSectionsByteEqual,
  protectedSecurityMarkersPresent,
} from "./brevity-caveman.js";
import { benchTokenizerLabel, countBenchTokens } from "./bench-tokenizer.js";

export interface PickupPromptMeasureRow {
  task_id: string;
  arm: "B0" | "B4";
  tokens_full_prompt: number;
  protected_suffix_byte_equal_b0_b4: boolean;
  security_markers_present: boolean;
}

export interface PickupPromptMeasureReport {
  evidence_class: "FIXTURE_PICKUP_INVOKE";
  tokenizer: string;
  tokenizer_note: string;
  path: "run-jobs invoke → buildPickupPrompt (full markdown)";
  rows: PickupPromptMeasureRow[];
  pairs: Array<{
    task_id: string;
    tokens_b0: number;
    tokens_b4: number;
    delta_tokens: number;
    pct_delta: number;
    protected_suffix_byte_equal: boolean;
  }>;
  totals: { tokens_b0: number; tokens_b4: number };
}

function measureTask(
  task: BenchPickupTask,
  jobsDir: string,
  orchestratorRoot: string,
  featureId: string,
  runId: string,
): PickupPromptMeasureReport["pairs"][0] & { rows: PickupPromptMeasureRow[] } {
  const job = buildBenchSkillJob({ task, featureId, runId });
  const b0 = buildPickupPrompt(job, jobsDir, orchestratorRoot, { caveman: false });
  const b4 = buildPickupPrompt(job, jobsDir, orchestratorRoot, { caveman: true });
  const protectedOk = protectedPickupSectionsByteEqual(b0, b4);
  const tokens_b0 = countBenchTokens(b0);
  const tokens_b4 = countBenchTokens(b4);
  const rows: PickupPromptMeasureRow[] = [
    {
      task_id: task.id,
      arm: "B0",
      tokens_full_prompt: tokens_b0,
      protected_suffix_byte_equal_b0_b4: protectedOk,
      security_markers_present: protectedSecurityMarkersPresent(b0),
    },
    {
      task_id: task.id,
      arm: "B4",
      tokens_full_prompt: tokens_b4,
      protected_suffix_byte_equal_b0_b4: protectedOk,
      security_markers_present: protectedSecurityMarkersPresent(b4),
    },
  ];
  return {
    task_id: task.id,
    tokens_b0,
    tokens_b4,
    delta_tokens: tokens_b4 - tokens_b0,
    pct_delta: tokens_b0 === 0 ? 0 : ((tokens_b4 - tokens_b0) / tokens_b0) * 100,
    protected_suffix_byte_equal: protectedOk,
    rows,
  };
}

export function measurePickupPromptsForBench(input: {
  jobsDir: string;
  orchestratorRoot: string;
  featureId?: string;
}): PickupPromptMeasureReport {
  const featureId = input.featureId ?? "v22-bench-feature";
  const tasks: BenchPickupTask[] = [
    ...BENCH_R_TASKS.map((t) => ({ id: t.id, query: t.query })),
    ...BENCH_H_TASKS,
  ];
  const pairs: PickupPromptMeasureReport["pairs"] = [];
  const rows: PickupPromptMeasureRow[] = [];
  let tokens_b0 = 0;
  let tokens_b4 = 0;

  for (const task of tasks) {
    const runId = `00000000-0000-4000-8000-${task.id.padStart(12, "0")}`;
    const result = measureTask(task, input.jobsDir, input.orchestratorRoot, featureId, runId);
    pairs.push({
      task_id: result.task_id,
      tokens_b0: result.tokens_b0,
      tokens_b4: result.tokens_b4,
      delta_tokens: result.delta_tokens,
      pct_delta: result.pct_delta,
      protected_suffix_byte_equal: result.protected_suffix_byte_equal,
    });
    rows.push(...result.rows);
    tokens_b0 += result.tokens_b0;
    tokens_b4 += result.tokens_b4;
  }

  return {
    evidence_class: "FIXTURE_PICKUP_INVOKE",
    tokenizer: benchTokenizerLabel(),
    tokenizer_note:
      "Matches V22-BENCH Python harness fallback; cl100k_base when tiktoken present in harness only",
    path: "run-jobs invoke → buildPickupPrompt (full markdown)",
    rows,
    pairs,
    totals: { tokens_b0, tokens_b4 },
  };
}
