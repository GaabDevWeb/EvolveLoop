/**
 * V22-CAVEMAN-HG-1 — output measurement plan.
 *
 * Compares Caveman ON vs OFF on the six frozen P0 tasks.
 * cursor-agent does not publish token counts. Response size is tiktoken
 * cl100k_base over the result text. Latency is duration_ms. Quality is the
 * fraction of task anchors and restrictions present in the reply.
 * The command does not call the provider during --dry-run and never prints a key.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { LlmHttpProviderAdapter } from "../providers/llm/llm-http-provider-adapter.js";
import type { CursorAgentSpawn } from "../providers/llm/cursor-agent-provider.js";
import { requireTiktokenCounts } from "../context/tokenizer.js";
import { redactSecrets } from "../evidence/secret-redaction.js";
import {
  loadFrozenTasks,
  measureP0V22Text,
  P0_TASK_IDS,
  repoRootFromModule,
  type P0TaskId,
} from "./p0-baseline-harness.js";
import { renderCavemanHardGateSection } from "./caveman-hard-gate.js";

export const CAVEMAN_MEASURE_N = 5;
export type CavemanArm = "off" | "on";
export type NotMeasured = "NOT_MEASURED";
export type NumOrNot = number | NotMeasured;

const ARMS: CavemanArm[] = ["off", "on"];

export interface CavemanMeasurePack {
  taskId: P0TaskId;
  query: string;
  needles: string[];
  context: string;
}

export interface CavemanArmPlan {
  arm: CavemanArm;
  local_prompt_tokens: number;
  prompt_sha256: string;
  n: number;
  response_tokens: NumOrNot;
  provider_output_tokens: NotMeasured;
  latency_ms: NumOrNot;
  quality: NumOrNot;
  dispersion: Record<string, NumOrNot | { statistic: "sample_stddev"; value: number; n: number }>;
  runs: Array<Record<string, NumOrNot | number | string | string[]>>;
}

export interface CavemanMeasureReport {
  schema_id: "v22-caveman-output-measure-1";
  task_id: "V22-CAVEMAN-HG-1";
  status: "DRY_RUN" | "MEASURED" | "ABORTED_MISSING_KEY";
  provider: "cursor-agent";
  n: number;
  tokenizer: "tiktoken:cl100k_base";
  response_token_source: "tiktoken:cl100k_base of cursor-agent result text";
  tree_sha: string;
  calls: number;
  tasks: Array<{ id: string; arms: { off: CavemanArmPlan; on: CavemanArmPlan } }>;
  limitation: string;
  measured_at: string;
}

export function cavemanMeasurePublicError(error: unknown, secrets: string[]): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactSecrets(raw, { extraCanaries: secrets.filter((item) => item.length >= 6) });
}

export function buildCavemanArmPrompt(query: string, context: string, arm: CavemanArm): string {
  const base = [
    "Reply in at most 120 words. Use only the context below. Do not call tools.",
    "",
    `Question: ${query}`,
    "",
    "Context:",
    context,
  ].join("\n");
  if (arm === "off") return base;
  return `${base}\n\n${renderCavemanHardGateSection()}\nApply that Caveman output hard gate to the reply. The exception classes stay verbatim.`;
}

export async function loadCavemanMeasurePacks(repoRoot: string): Promise<CavemanMeasurePack[]> {
  const loaded = loadFrozenTasks(repoRoot);
  const packs: CavemanMeasurePack[] = [];
  for (const taskId of P0_TASK_IDS) {
    const task = loaded.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`missing frozen task ${taskId}`);
    const v22 = await measureP0V22Text(taskId, repoRoot);
    packs.push({
      taskId,
      query: task.query,
      needles: [...task.anchors.map((anchor) => anchor.substring), ...task.restrictions],
      context: v22.text,
    });
  }
  return packs;
}

function assertPacks(packs: CavemanMeasurePack[]): void {
  const ids = packs.map((pack) => pack.taskId);
  if (ids.length !== P0_TASK_IDS.length || P0_TASK_IDS.some((id, index) => ids[index] !== id)) {
    throw new Error(`caveman measure requires these tasks in order: ${P0_TASK_IDS.join(", ")}`);
  }
}

function treeSha(root: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" });
  const sha = result.stdout?.trim() ?? "";
  return result.status === 0 && /^[0-9a-f]{40}$/.test(sha) ? sha : "NOT_MEASURED";
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStddev(values: number[]): number {
  const center = mean(values);
  const square = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  return Math.sqrt(square / (values.length - 1));
}

function numericDispersion(
  values: Array<number | NotMeasured>,
): NumOrNot | { statistic: "sample_stddev"; value: number; n: number } {
  if (values.some((value) => value === "NOT_MEASURED") || values.length < 2) return "NOT_MEASURED";
  return { statistic: "sample_stddev", value: sampleStddev(values as number[]), n: values.length };
}

function qualityOf(text: string, needles: string[]): { quality: number; missing: string[] } {
  if (needles.length === 0) return { quality: 1, missing: [] };
  const missing = needles.filter((needle) => !text.includes(needle));
  return { quality: (needles.length - missing.length) / needles.length, missing };
}

function emptyArm(arm: CavemanArm, tokens: number, prompt: string, n: number): CavemanArmPlan {
  return {
    arm,
    local_prompt_tokens: tokens,
    prompt_sha256: sha256(prompt),
    n,
    response_tokens: "NOT_MEASURED",
    provider_output_tokens: "NOT_MEASURED",
    latency_ms: "NOT_MEASURED",
    quality: "NOT_MEASURED",
    dispersion: {
      response_tokens: "NOT_MEASURED",
      latency_ms: "NOT_MEASURED",
      quality: "NOT_MEASURED",
    },
    runs: [],
  };
}

function finishArm(plan: CavemanArmPlan, runs: CavemanArmPlan["runs"]): CavemanArmPlan {
  const field = (name: string) => runs.map((run) => run[name]) as Array<number | NotMeasured>;
  const meanOf = (name: string): NumOrNot => {
    const values = field(name);
    if (values.some((value) => value === "NOT_MEASURED") || values.length === 0) return "NOT_MEASURED";
    return mean(values as number[]);
  };
  return {
    ...plan,
    response_tokens: meanOf("response_tokens"),
    latency_ms: meanOf("latency_ms"),
    quality: meanOf("quality"),
    dispersion: {
      response_tokens: numericDispersion(field("response_tokens")),
      latency_ms: numericDispersion(field("latency_ms")),
      quality: numericDispersion(field("quality")),
    },
    runs,
  };
}

export async function runCavemanOutputMeasure(options: {
  dryRun: boolean;
  n?: number;
  repoRoot?: string;
  packs?: CavemanMeasurePack[];
  apiKey?: string;
  bin?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  spawnImpl?: CursorAgentSpawn;
}): Promise<CavemanMeasureReport> {
  const n = options.n ?? CAVEMAN_MEASURE_N;
  if (!Number.isInteger(n) || n < CAVEMAN_MEASURE_N) {
    throw new Error("caveman measure n must be an integer >= 5");
  }
  const repoRoot = options.repoRoot ?? repoRootFromModule();
  const packs = options.packs ?? (await loadCavemanMeasurePacks(repoRoot));
  assertPacks(packs);
  const prompts: string[] = [];
  const meta: Array<{ taskId: P0TaskId; arm: CavemanArm; prompt: string }> = [];
  for (const pack of packs) {
    for (const arm of ARMS) {
      const prompt = buildCavemanArmPrompt(pack.query, pack.context, arm);
      meta.push({ taskId: pack.taskId, arm, prompt });
      prompts.push(prompt);
    }
  }
  const counts = requireTiktokenCounts(prompts);
  const arms = new Map<string, CavemanArmPlan>();
  meta.forEach((item, index) => {
    arms.set(
      `${item.taskId}:${item.arm}`,
      emptyArm(item.arm, counts[index] ?? 0, item.prompt, n),
    );
  });
  const calls = packs.length * ARMS.length * n;
  const base: CavemanMeasureReport = {
    schema_id: "v22-caveman-output-measure-1",
    task_id: "V22-CAVEMAN-HG-1",
    status: "DRY_RUN",
    provider: "cursor-agent",
    n,
    tokenizer: "tiktoken:cl100k_base",
    response_token_source: "tiktoken:cl100k_base of cursor-agent result text",
    tree_sha: treeSha(repoRoot),
    calls,
    tasks: packs.map((pack) => ({
      id: pack.taskId,
      arms: {
        off: arms.get(`${pack.taskId}:off`)!,
        on: arms.get(`${pack.taskId}:on`)!,
      },
    })),
    limitation:
      "CI does not call cursor-agent. Live response size is local tiktoken over result text. Provider output tokens and cost stay NOT_MEASURED because the official cursor-agent schema has neither. Latency is duration_ms. Quality is the fraction of frozen anchors and restrictions present in the reply.",
    measured_at: new Date().toISOString(),
  };
  if (options.dryRun) return base;
  if (!options.apiKey?.trim()) return { ...base, status: "ABORTED_MISSING_KEY" };

  const secrets = [options.apiKey];
  const adapter = new LlmHttpProviderAdapter();
  const runs = new Map<string, CavemanArmPlan["runs"]>();
  const pendingTexts: string[] = [];
  const pendingRefs: Array<{ key: string; index: number }> = [];
  try {
    for (const item of meta) {
      const pack = packs.find((candidate) => candidate.taskId === item.taskId);
      if (!pack) continue;
      const key = `${item.taskId}:${item.arm}`;
      const bucket = runs.get(key) ?? [];
      for (let repetition = 1; repetition <= n; repetition += 1) {
        const result = await adapter.completeCursorAgent({
          prompt: item.prompt,
          bin: options.bin,
          cwd: options.cwd ?? repoRoot,
          env: options.env ?? process.env,
          spawnImpl: options.spawnImpl,
        });
        const scored = qualityOf(result.text, pack.needles);
        pendingRefs.push({ key, index: bucket.length });
        pendingTexts.push(result.text);
        bucket.push({
          repetition,
          response_tokens: "NOT_MEASURED",
          provider_output_tokens: "NOT_MEASURED",
          latency_ms: result.duration_ms,
          quality: scored.quality,
          missing: scored.missing,
          model_id: result.model_id,
        });
        runs.set(key, bucket);
      }
    }
  } catch (error) {
    throw new Error(cavemanMeasurePublicError(error, secrets));
  }

  const responseTokens = pendingTexts.length > 0 ? requireTiktokenCounts(pendingTexts) : [];
  pendingRefs.forEach((ref, index) => {
    const bucket = runs.get(ref.key);
    const run = bucket?.[ref.index];
    if (!run) return;
    run.response_tokens = responseTokens[index] ?? "NOT_MEASURED";
  });

  return {
    ...base,
    status: "MEASURED",
    tasks: packs.map((pack) => ({
      id: pack.taskId,
      arms: {
        off: finishArm(arms.get(`${pack.taskId}:off`)!, runs.get(`${pack.taskId}:off`) ?? []),
        on: finishArm(arms.get(`${pack.taskId}:on`)!, runs.get(`${pack.taskId}:on`) ?? []),
      },
    })),
  };
}
