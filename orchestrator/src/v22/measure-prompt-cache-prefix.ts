import { createHash } from "node:crypto";
import { buildPickupPrompt } from "../jobs/job-pickup.js";
import { BENCH_R_TASKS } from "./bench-r-tasks.js";
import { BENCH_H_TASKS } from "./bench-h-tasks.js";
import { buildBenchSkillJob, type BenchPickupTask } from "./bench-pickup-fixture.js";
import { benchTokenizerLabel, countBenchTokens } from "./bench-tokenizer.js";
import { redactSecrets } from "../evidence/secret-redaction.js";

export const VENDOR_HTTP_CACHE_LABEL = "NOT_MEASURED";

export interface PromptCachePrefixRow {
  task_id: string;
  feature_id: string;
  run_id: string;
  cacheable_prefix_tokens: number;
  dynamic_suffix_tokens: number;
  full_prompt_tokens: number;
  cacheable_pct: number;
  prefix_key_sha256: string;
}

export interface PromptCacheStabilityReport {
  evidence_class: "FIXTURE_PREFIX_STABILITY";
  tokenizer: string;
  vendor_http_cache_hit: typeof VENDOR_HTTP_CACHE_LABEL;
  rows: PromptCachePrefixRow[];
  same_feature_two_jobs: {
    feature_id: string;
    job_a_run_id: string;
    job_b_run_id: string;
    prefix_key_equal: boolean;
    normalized_prefix_key_equal: boolean;
  };
  different_features: {
    feature_a: string;
    feature_b: string;
    prefix_key_equal: boolean;
  };
  cross_task_prefix_key_unique_count: number;
  median_cacheable_pct: number;
}

const BRIEFING_MARKER = "## Briefing\n\n";

/** Cacheable = pickup template + DoD/inputs; dynamic = header ids + briefing body. */
export function splitPickupPromptCacheRegions(prompt: string): {
  cacheable_prefix: string;
  dynamic_suffix: string;
} {
  const briefingStart = prompt.indexOf(BRIEFING_MARKER);
  if (briefingStart === -1) {
    return { cacheable_prefix: prompt, dynamic_suffix: "" };
  }
  const cacheable_prefix = prompt.slice(0, briefingStart + BRIEFING_MARKER.length);
  const dynamic_suffix = prompt.slice(briefingStart + BRIEFING_MARKER.length);
  return { cacheable_prefix, dynamic_suffix };
}

export function normalizePickupPrefixForStability(prefix: string): string {
  return redactSecrets(prefix)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<run-id>")
    .replace(/bench-[A-Z0-9]+/g, "<node-id>")
    .replace(/Feature: [^\n]+/g, "Feature: <feature-id>");
}

function prefixKey(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function rowFor(
  task: BenchPickupTask,
  featureId: string,
  runId: string,
  jobsDir: string,
  orchestratorRoot: string,
): PromptCachePrefixRow {
  const job = buildBenchSkillJob({ task, featureId, runId, nodeId: `bench-${task.id}` });
  const prompt = buildPickupPrompt(job, jobsDir, orchestratorRoot, { caveman: false });
  const { cacheable_prefix, dynamic_suffix } = splitPickupPromptCacheRegions(prompt);
  const cacheable_prefix_tokens = countBenchTokens(cacheable_prefix);
  const dynamic_suffix_tokens = countBenchTokens(dynamic_suffix);
  const full_prompt_tokens = countBenchTokens(prompt);
  return {
    task_id: task.id,
    feature_id: featureId,
    run_id: runId,
    cacheable_prefix_tokens,
    dynamic_suffix_tokens,
    full_prompt_tokens,
    cacheable_pct: full_prompt_tokens === 0 ? 0 : (cacheable_prefix_tokens / full_prompt_tokens) * 100,
    prefix_key_sha256: prefixKey(cacheable_prefix),
  };
}

export function measurePromptCachePrefixStability(input: {
  jobsDir: string;
  orchestratorRoot: string;
}): PromptCacheStabilityReport {
  const tasks: BenchPickupTask[] = [
    ...BENCH_R_TASKS.map((t) => ({ id: t.id, query: t.query })),
    ...BENCH_H_TASKS,
  ];
  const featureId = "v22-cache-feature";
  const rows = tasks.map((task) =>
    rowFor(
      task,
      featureId,
      `00000000-0000-4000-8000-${task.id.padStart(12, "0")}`,
      input.jobsDir,
      input.orchestratorRoot,
    ),
  );

  const jobA = rowFor(
    tasks[0],
    featureId,
    "11111111-1111-4111-8111-111111111111",
    input.jobsDir,
    input.orchestratorRoot,
  );
  const sameTask = tasks[0];
  const jobB = rowFor(
    sameTask,
    featureId,
    "22222222-2222-4222-8222-222222222222",
    input.jobsDir,
    input.orchestratorRoot,
  );
  const promptA = buildPickupPrompt(
    buildBenchSkillJob({
      task: sameTask,
      featureId,
      runId: jobA.run_id,
      nodeId: "bench-same-feature",
    }),
    input.jobsDir,
    input.orchestratorRoot,
    { caveman: false },
  );
  const promptB = buildPickupPrompt(
    buildBenchSkillJob({
      task: sameTask,
      featureId,
      runId: jobB.run_id,
      nodeId: "bench-same-feature",
    }),
    input.jobsDir,
    input.orchestratorRoot,
    { caveman: false },
  );
  const prefixA = splitPickupPromptCacheRegions(promptA).cacheable_prefix;
  const prefixB = splitPickupPromptCacheRegions(promptB).cacheable_prefix;

  const featOther = rowFor(tasks[0], "other-feature-id", jobA.run_id, input.jobsDir, input.orchestratorRoot);

  const pcts = rows.map((r) => r.cacheable_pct).sort((a, b) => a - b);
  const mid = Math.floor(pcts.length / 2);

  return {
    evidence_class: "FIXTURE_PREFIX_STABILITY",
    tokenizer: benchTokenizerLabel(),
    vendor_http_cache_hit: VENDOR_HTTP_CACHE_LABEL,
    rows,
    same_feature_two_jobs: {
      feature_id: featureId,
      job_a_run_id: jobA.run_id,
      job_b_run_id: jobB.run_id,
      prefix_key_equal: prefixKey(prefixA) === prefixKey(prefixB),
      normalized_prefix_key_equal:
        prefixKey(normalizePickupPrefixForStability(prefixA)) ===
        prefixKey(normalizePickupPrefixForStability(prefixB)),
    },
    different_features: {
      feature_a: featureId,
      feature_b: "other-feature-id",
      prefix_key_equal: jobA.prefix_key_sha256 === featOther.prefix_key_sha256,
    },
    cross_task_prefix_key_unique_count: new Set(rows.map((r) => r.prefix_key_sha256)).size,
    median_cacheable_pct: pcts.length % 2 === 0 ? (pcts[mid - 1] + pcts[mid]) / 2 : pcts[mid],
  };
}
