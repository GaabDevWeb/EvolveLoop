import { measurePickupPromptsForBench } from "./measure-pickup-prompts.js";
import { measurePromptCachePrefixStability } from "./measure-prompt-cache-prefix.js";

export interface V22MeasureReport {
  goal_009_pickup: ReturnType<typeof measurePickupPromptsForBench>;
  goal_010_prefix: ReturnType<typeof measurePromptCachePrefixStability>;
}

export function measureV22Goals009010(input: {
  jobsDir: string;
  orchestratorRoot: string;
}): V22MeasureReport {
  return {
    goal_009_pickup: measurePickupPromptsForBench(input),
    goal_010_prefix: measurePromptCachePrefixStability(input),
  };
}

/** @deprecated Use measureV22Goals009010 — honest pickup + prefix stability (no tautological cache hits). */
export function measureP2OnBenchTasks(): {
  brevity: never[];
  prompt_cache: never[];
  brevity_total_baseline: number;
  brevity_total_caveman: number;
  prompt_cache_hit_rate: number;
  replaced_by: string;
} {
  const m = measureV22Goals009010({
    jobsDir: "/tmp/jobs",
    orchestratorRoot: process.cwd(),
  });
  return {
    brevity: [],
    prompt_cache: [],
    brevity_total_baseline: m.goal_009_pickup.totals.tokens_b0,
    brevity_total_caveman: m.goal_009_pickup.totals.tokens_b4,
    prompt_cache_hit_rate: Number.NaN,
    replaced_by: "measureV22Goals009010",
  };
}
