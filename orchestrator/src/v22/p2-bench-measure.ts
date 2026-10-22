import { BENCH_R_TASKS } from "./bench-r-tasks.js";
import { applyCavemanBrevity, brevityPreservesNegation } from "./brevity-caveman.js";
import { PromptCacheHttpAdapter } from "./prompt-cache-http.js";
import { estimateWhitespaceTokens } from "./token-estimate.js";

export interface TaskBrevityRow {
  task_id: string;
  tokens_baseline: number;
  tokens_caveman: number;
  delta_tokens: number;
  negation_ok: boolean;
}

export interface PromptCacheBenchRow {
  task_id: string;
  cache_hit_second_call: boolean;
  hit_rate_after_pair: number;
}

export interface P2BenchMeasureReport {
  brevity: TaskBrevityRow[];
  prompt_cache: PromptCacheBenchRow[];
  brevity_total_baseline: number;
  brevity_total_caveman: number;
  prompt_cache_hit_rate: number;
}

function sampleReportForTask(query: string): string {
  return `# Analyst note\n\nPlease carefully review the following question and provide a detailed answer.\n\n${query}\n\nDo not skip security checks.\n`;
}

export function measureP2OnBenchTasks(): P2BenchMeasureReport {
  const brevity: TaskBrevityRow[] = [];
  let brevity_total_baseline = 0;
  let brevity_total_caveman = 0;

  for (const task of BENCH_R_TASKS) {
    const sample = sampleReportForTask(task.query);
    const baseTokens = estimateWhitespaceTokens(sample);
    const compressed = applyCavemanBrevity(sample, { force: true });
    brevity.push({
      task_id: task.id,
      tokens_baseline: baseTokens,
      tokens_caveman: compressed.output_tokens,
      delta_tokens: compressed.output_tokens - baseTokens,
      negation_ok: brevityPreservesNegation(sample, compressed.text, task.negation_needles),
    });
    brevity_total_baseline += baseTokens;
    brevity_total_caveman += compressed.output_tokens;
  }

  const adapter = new PromptCacheHttpAdapter();
  const prompt_cache: PromptCacheBenchRow[] = [];
  let hits = 0;

  for (const task of BENCH_R_TASKS) {
    adapter.reset();
    adapter.complete({
      model: "bench-stub",
      parts: [
        { role: "system", content: "EvolveLoop V22 frozen system prefix v1" },
        { role: "user", content: task.query, cacheable: true },
      ],
      dynamic_tail: "retrieval:fixture",
    });
    const second = adapter.complete({
      model: "bench-stub",
      parts: [
        { role: "system", content: "EvolveLoop V22 frozen system prefix v1" },
        { role: "user", content: task.query, cacheable: true },
      ],
      dynamic_tail: "retrieval:fixture-2",
    });
    if (second.cache_hit) hits += 1;
    prompt_cache.push({
      task_id: task.id,
      cache_hit_second_call: second.cache_hit,
      hit_rate_after_pair: adapter.metrics().hit_rate,
    });
  }

  return {
    brevity,
    prompt_cache,
    brevity_total_baseline,
    brevity_total_caveman,
    prompt_cache_hit_rate: hits / BENCH_R_TASKS.length,
  };
}
