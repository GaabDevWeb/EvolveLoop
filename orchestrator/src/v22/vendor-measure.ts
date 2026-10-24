/**
 * V22-GAP-VENDOR-1a — vendor measurement plan.
 *
 * cursor-agent is the primary provider. Official JSON exposes result text and
 * duration only, so provider tokens and cost stay NOT_MEASURED.
 * OpenRouter is secondary. Its preflight uses the listed price of the default
 * cheap model and aborts above US$2.50. Live calls abort when summed
 * usage.cost crosses the same ceiling. Keys are never written to the report.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { redactSecrets } from "../evidence/secret-redaction.js";
import { LlmHttpProviderAdapter } from "../providers/llm/llm-http-provider-adapter.js";
import type { CursorAgentSpawn } from "../providers/llm/cursor-agent-provider.js";
import { requireTiktokenCounts } from "../context/tokenizer.js";
import {
  loadFrozenTasks,
  measureP0B0Text,
  measureP0V22Text,
  P0_TASK_IDS,
  repoRootFromModule,
  type P0TaskId,
} from "./p0-baseline-harness.js";

export const VENDOR_BUDGET_USD = 2.5;
export const VENDOR_MAX_OUTPUT_TOKENS = 300;
export const VENDOR_N = 5;
export const OPENROUTER_DEFAULT_MODEL = "google/gemini-2.5-flash-lite";
export const OPENROUTER_DEFAULT_PRICE = {
  input_usd_per_mtok: 0.1,
  output_usd_per_mtok: 0.4,
  source: "https://openrouter.ai/google/gemini-2.5-flash-lite",
  noted_on: "2026-10-23",
} as const;

export type VendorProvider = "cursor-agent" | "openrouter";
export type NotMeasured = "NOT_MEASURED";
export type NumOrNot = number | NotMeasured;

const TASK_INSTRUCTION =
  "Reply in at most 120 words. Use only the context below. Do not call tools.";

const PROBE_SENTENCE =
  "EvolveLoop vendor cache probe. Stable prefix repeated so the block exceeds one thousand and twenty four tokens. ";

export interface VendorPack {
  taskId: P0TaskId;
  query: string;
  needles: string[];
  arms: { B0: string; "V2.2": string };
}

export interface VendorArmPlan {
  arm: "B0" | "V2.2";
  local_prompt_tokens: number;
  prompt_sha256: string;
  n: number;
  input_tokens: NumOrNot;
  output_tokens: NumOrNot;
  cached_tokens: NumOrNot;
  cost_usd: NumOrNot;
  latency_ms: NumOrNot;
  quality: NumOrNot;
  dispersion: Record<string, NumOrNot | { statistic: "sample_stddev"; value: number; n: number }>;
  runs: Array<Record<string, NumOrNot | number | string | string[]>>;
}

export interface VendorReport {
  schema_id: "v22-vendor-report-1";
  task_id: "V22-GAP-VENDOR-1a";
  status: "DRY_RUN" | "MEASURED" | "ABORTED_ESTIMATE" | "ABORTED_BUDGET" | "ABORTED_MISSING_PRICE" | "ABORTED_MISSING_COST" | "ABORTED_MISSING_KEY";
  provider: VendorProvider;
  model_id: string;
  n: number;
  max_output_tokens: number;
  budget_usd: number;
  tokenizer: "tiktoken:cl100k_base";
  tree_sha: string;
  estimate_usd: NumOrNot;
  estimate_note: string;
  price_source: string | NotMeasured;
  local_input_tokens: number;
  output_tokens_upper: number;
  calls: number;
  spent_usd: NumOrNot;
  pickup_variant: "default" | "context-sufficient";
  stream_dir: string;
  cache_probe: {
    prefix_tokens: number;
    prefix_over_1024: boolean;
    calls: Array<Record<string, NumOrNot | number | string>>;
  };
  tasks: Array<{ id: string; arms: { B0: VendorArmPlan; "V2.2": VendorArmPlan } }>;
  limitation: string;
  measured_at: string;
}

export function publicError(error: unknown, secrets: string[]): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactSecrets(raw, { extraCanaries: secrets.filter((item) => item.length >= 6) });
}

export function buildCacheProbePrefix(): string {
  const text = PROBE_SENTENCE.repeat(80);
  const [tokens] = requireTiktokenCounts([text]);
  if (tokens === undefined || tokens <= 1024) {
    throw new Error("cache probe prefix was not longer than 1024 tokens");
  }
  return text;
}

export function taskPrompt(query: string, context: string): { system: string; user: string } {
  return {
    system: TASK_INSTRUCTION,
    user: `${TASK_INSTRUCTION}\n\nQuestion: ${query}\n\nContext:\n${context}`,
  };
}

export function estimateOpenRouterUsd(input: {
  inputTokens: number;
  outputTokensUpper: number;
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
}): number {
  return (
    (input.inputTokens / 1_000_000) * input.inputUsdPerMtok +
    (input.outputTokensUpper / 1_000_000) * input.outputUsdPerMtok
  );
}

export function resolveOpenRouterPrice(model: string, override?: { inputUsdPerMtok?: number; outputUsdPerMtok?: number }): {
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
  source: string;
} | null {
  if (override?.inputUsdPerMtok !== undefined && override.outputUsdPerMtok !== undefined) {
    return {
      inputUsdPerMtok: override.inputUsdPerMtok,
      outputUsdPerMtok: override.outputUsdPerMtok,
      source: "cli_override",
    };
  }
  if (model === OPENROUTER_DEFAULT_MODEL) {
    return {
      inputUsdPerMtok: OPENROUTER_DEFAULT_PRICE.input_usd_per_mtok,
      outputUsdPerMtok: OPENROUTER_DEFAULT_PRICE.output_usd_per_mtok,
      source: OPENROUTER_DEFAULT_PRICE.source,
    };
  }
  return null;
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

function numericDispersion(values: Array<number | NotMeasured>): NumOrNot | { statistic: "sample_stddev"; value: number; n: number } {
  if (values.some((value) => value === "NOT_MEASURED") || values.length < 2) return "NOT_MEASURED";
  return { statistic: "sample_stddev", value: sampleStddev(values as number[]), n: values.length };
}

function qualityOf(text: string, needles: string[]): { quality: number; missing: string[] } {
  if (needles.length === 0) return { quality: 1, missing: [] };
  const missing = needles.filter((needle) => !text.includes(needle));
  return { quality: (needles.length - missing.length) / needles.length, missing };
}

export async function loadVendorPacks(repoRoot: string, options?: { contextSufficient?: boolean }): Promise<VendorPack[]> {
  const loaded = loadFrozenTasks(repoRoot);
  const packs: VendorPack[] = [];
  for (const taskId of P0_TASK_IDS) {
    const task = loaded.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`missing frozen task ${taskId}`);
    const b0 = await measureP0B0Text(taskId, repoRoot);
    const v22 = await measureP0V22Text(taskId, repoRoot, { contextSufficient: options?.contextSufficient === true });
    packs.push({
      taskId,
      query: task.query,
      needles: [...task.anchors.map((anchor) => anchor.substring), ...task.restrictions],
      arms: { B0: b0.text, "V2.2": v22.text },
    });
  }
  return packs;
}

function emptyArm(arm: "B0" | "V2.2", tokens: number, prompt: string, n: number): VendorArmPlan {
  return {
    arm,
    local_prompt_tokens: tokens,
    prompt_sha256: sha256(prompt),
    n,
    input_tokens: "NOT_MEASURED",
    output_tokens: "NOT_MEASURED",
    cached_tokens: "NOT_MEASURED",
    cost_usd: "NOT_MEASURED",
    latency_ms: "NOT_MEASURED",
    quality: "NOT_MEASURED",
    dispersion: {
      input_tokens: "NOT_MEASURED",
      output_tokens: "NOT_MEASURED",
      cached_tokens: "NOT_MEASURED",
      cost_usd: "NOT_MEASURED",
      latency_ms: "NOT_MEASURED",
      quality: "NOT_MEASURED",
    },
    runs: [],
  };
}

function finishArm(plan: VendorArmPlan, runs: VendorArmPlan["runs"]): VendorArmPlan {
  const field = (name: string) => runs.map((run) => run[name]) as Array<number | NotMeasured>;
  const meanOf = (name: string): NumOrNot => {
    const values = field(name);
    if (values.some((value) => value === "NOT_MEASURED") || values.length === 0) return "NOT_MEASURED";
    return mean(values as number[]);
  };
  return {
    ...plan,
    input_tokens: meanOf("input_tokens"),
    output_tokens: meanOf("output_tokens"),
    cached_tokens: meanOf("cached_tokens"),
    cost_usd: meanOf("cost_usd"),
    latency_ms: meanOf("latency_ms"),
    quality: meanOf("quality"),
    dispersion: {
      input_tokens: numericDispersion(field("input_tokens")),
      output_tokens: numericDispersion(field("output_tokens")),
      cached_tokens: numericDispersion(field("cached_tokens")),
      cost_usd: numericDispersion(field("cost_usd")),
      latency_ms: numericDispersion(field("latency_ms")),
      quality: numericDispersion(field("quality")),
    },
    runs,
  };
}

export async function runVendorMeasure(options: {
  provider: VendorProvider;
  dryRun: boolean;
  n?: number;
  model?: string;
  maxOutputTokens?: number;
  repoRoot?: string;
  packs?: VendorPack[];
  inputUsdPerMtok?: number;
  outputUsdPerMtok?: number;
  apiKey?: string;
  contextSufficient?: boolean;
  adapter?: LlmHttpProviderAdapter;
  spawnImpl?: CursorAgentSpawn;
  saveStreams?: boolean;
  bin?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<VendorReport> {
  const provider = options.provider;
  const n = options.n ?? VENDOR_N;
  if (!Number.isInteger(n) || n < 5) throw new Error("vendor n must be an integer >= 5");
  const maxOutputTokens = options.maxOutputTokens ?? VENDOR_MAX_OUTPUT_TOKENS;
  const repoRoot = options.repoRoot ?? repoRootFromModule();
  const contextSufficient = options.contextSufficient === true;
  const packs = options.packs ?? (await loadVendorPacks(repoRoot, { contextSufficient }));
  const streamDirRel = `docs/v22/baseline/raw/cursor-agent-streams/${contextSufficient ? "context-sufficient" : "default"}`;
  const streamDir = path.join(repoRoot, streamDirRel);
  const model =
    options.model?.trim() ||
    (provider === "openrouter" ? OPENROUTER_DEFAULT_MODEL : "cursor-cli-default");
  const probePrefix = buildCacheProbePrefix();
  const [probeTokens] = requireTiktokenCounts([probePrefix]);
  const prompts: string[] = [];
  const promptMeta: Array<{ taskId: string; arm: "B0" | "V2.2"; system: string; user: string }> = [];
  for (const pack of packs) {
    for (const arm of ["B0", "V2.2"] as const) {
      const built = taskPrompt(pack.query, pack.arms[arm]);
      promptMeta.push({ taskId: pack.taskId, arm, system: built.system, user: built.user });
      prompts.push(`${built.system}\n${built.user}`);
    }
  }
  const counts = requireTiktokenCounts(prompts);
  let localInput = 0;
  const arms = new Map<string, VendorArmPlan>();
  promptMeta.forEach((meta, index) => {
    const tokens = counts[index] ?? 0;
    localInput += tokens * n;
    arms.set(`${meta.taskId}:${meta.arm}`, emptyArm(meta.arm, tokens, prompts[index] ?? "", n));
  });
  const probeUser = "Reply with exactly probe-1";
  const probeUser2 = "Reply with exactly probe-2";
  const probeCounts = requireTiktokenCounts([`${probePrefix}\n${probeUser}`, `${probePrefix}\n${probeUser2}`]);
  const probeInput = (probeCounts[0] ?? 0) + (probeCounts[1] ?? 0);
  localInput += probeInput;
  const taskCalls = packs.length * 2 * n;
  const calls = taskCalls + 2;
  const outputUpper = maxOutputTokens * calls;
  const price = provider === "openrouter" ? resolveOpenRouterPrice(model, {
    inputUsdPerMtok: options.inputUsdPerMtok,
    outputUsdPerMtok: options.outputUsdPerMtok,
  }) : null;
  const estimate =
    provider === "openrouter" && price
      ? estimateOpenRouterUsd({
          inputTokens: localInput,
          outputTokensUpper: outputUpper,
          inputUsdPerMtok: price.inputUsdPerMtok,
          outputUsdPerMtok: price.outputUsdPerMtok,
        })
      : "NOT_MEASURED";
  const base: VendorReport = {
    schema_id: "v22-vendor-report-1",
    task_id: "V22-GAP-VENDOR-1a",
    status: "DRY_RUN",
    provider,
    model_id: model,
    n,
    max_output_tokens: maxOutputTokens,
    budget_usd: VENDOR_BUDGET_USD,
    tokenizer: "tiktoken:cl100k_base",
    tree_sha: treeSha(repoRoot),
    estimate_usd: estimate,
    estimate_note:
      provider === "cursor-agent"
        ? "O JSON oficial do cursor-agent não tem custo. A estimativa em dólares fica NOT_MEASURED. O teto de US$2.50 aplica-se ao OpenRouter."
        : "Estimativa = tokens locais tiktoken vezes o preço listado, com saída no teto de max_output_tokens. Não é usage.cost.",
    price_source: price?.source ?? "NOT_MEASURED",
    local_input_tokens: localInput,
    output_tokens_upper: outputUpper,
    calls,
    spent_usd: provider === "openrouter" ? 0 : "NOT_MEASURED",
    pickup_variant: contextSufficient ? "context-sufficient" : "default",
    stream_dir: streamDirRel,
    cache_probe: {
      prefix_tokens: probeTokens ?? 0,
      prefix_over_1024: (probeTokens ?? 0) > 1024,
      calls: [],
    },
    tasks: packs.map((pack) => ({
      id: pack.taskId,
      arms: {
        B0: arms.get(`${pack.taskId}:B0`)!,
        "V2.2": arms.get(`${pack.taskId}:V2.2`)!,
      },
    })),
    limitation:
      "CI não chama o provider. cursor-agent: duração vem de duration_ms; tokens e custo do provider são NOT_MEASURED porque não estão no schema oficial. OpenRouter: prompt_tokens, completion_tokens, prompt_tokens_details.cached_tokens e usage.cost. Qualidade é a fração de âncoras e restrições do cartão presentes na resposta. Dispersão de modelo só existe quando o provider devolve o número.",
    measured_at: new Date().toISOString(),
  };
  if (provider === "openrouter" && !price) {
    return { ...base, status: "ABORTED_MISSING_PRICE" };
  }
  if (typeof estimate === "number" && estimate > VENDOR_BUDGET_USD) {
    return { ...base, status: "ABORTED_ESTIMATE" };
  }
  if (options.dryRun) return base;
  if (!options.apiKey?.trim()) return { ...base, status: "ABORTED_MISSING_KEY" };

  const secrets = [options.apiKey];
  const saveStreams = provider === "cursor-agent" && options.saveStreams !== false;
  const adapter = options.adapter ?? new LlmHttpProviderAdapter();
  let spent = 0;
  const runs = new Map<string, VendorArmPlan["runs"]>();
  const snapshotTasks = () =>
    packs.map((pack) => ({
      id: pack.taskId,
      arms: {
        B0: finishArm(arms.get(`${pack.taskId}:B0`)!, runs.get(`${pack.taskId}:B0`) ?? []),
        "V2.2": finishArm(arms.get(`${pack.taskId}:V2.2`)!, runs.get(`${pack.taskId}:V2.2`) ?? []),
      },
    }));
  const noteSpend = (cost: number | NotMeasured): VendorReport | null => {
    if (cost === "NOT_MEASURED") {
      return { ...base, status: "ABORTED_MISSING_COST", spent_usd: spent, tasks: snapshotTasks() };
    }
    spent += cost;
    if (spent > VENDOR_BUDGET_USD) {
      return { ...base, status: "ABORTED_BUDGET", spent_usd: spent, tasks: snapshotTasks() };
    }
    return null;
  };

  try {
    for (const user of [probeUser, probeUser2]) {
      const started = performance.now();
      if (provider === "openrouter") {
        const result = await adapter.completeOpenRouter({
          apiKey: options.apiKey,
          model,
          stablePrefixParts: [{ role: "system", content: probePrefix, cacheable: true }],
          userMessage: user,
          maxTokens: maxOutputTokens,
        });
        const latency = performance.now() - started;
        base.cache_probe.calls.push({
          input_tokens: result.openrouter.input_tokens ?? "NOT_MEASURED",
          output_tokens: result.openrouter.output_tokens ?? "NOT_MEASURED",
          cached_tokens: result.openrouter.openai_cached_prompt_tokens,
          cost_usd: result.openrouter.cost_usd,
          latency_ms: latency,
        });
        const aborted = noteSpend(result.openrouter.cost_usd);
        if (aborted) return aborted;
      } else {
        const probeName = user.endsWith("probe-1") ? "probe-1.ndjson" : "probe-2.ndjson";
        const result = await adapter.completeCursorAgent({
          prompt: `${probePrefix}\n${user}`,
          model: options.model?.trim() || undefined,
          bin: options.bin,
          cwd: options.cwd ?? repoRoot,
          env: options.env ?? process.env,
          spawnImpl: options.spawnImpl,
          ...(saveStreams ? { streamDir, streamName: probeName, secrets } : {}),
        });
        base.cache_probe.calls.push({
          input_tokens: "NOT_MEASURED",
          output_tokens: "NOT_MEASURED",
          cached_tokens: "NOT_MEASURED",
          cost_usd: "NOT_MEASURED",
          latency_ms: result.duration_ms,
          duration_api_ms: result.duration_api_ms,
          model_id: result.model_id,
          tool_calls_started: result.tool_calls.started,
          tool_calls_read_started: result.tool_calls.read_started,
          tool_calls_write_started: result.tool_calls.write_started,
          tool_calls_other_started: result.tool_calls.other_started,
          stream_path: result.stream_path ? path.relative(repoRoot, result.stream_path) : "NOT_MEASURED",
        });
        if (result.model_id !== "cursor-cli-default") base.model_id = result.model_id;
      }
    }

    for (const meta of promptMeta) {
      const pack = packs.find((item) => item.taskId === meta.taskId);
      if (!pack) continue;
      const key = `${meta.taskId}:${meta.arm}`;
      const bucket = runs.get(key) ?? [];
      for (let repetition = 1; repetition <= n; repetition += 1) {
        const started = performance.now();
        if (provider === "openrouter") {
          const result = await adapter.completeOpenRouter({
            apiKey: options.apiKey,
            model,
            stablePrefixParts: [{ role: "system", content: meta.system, cacheable: true }],
            userMessage: meta.user,
            maxTokens: maxOutputTokens,
          });
          const scored = qualityOf(result.text, pack.needles);
          bucket.push({
            repetition,
            input_tokens: result.openrouter.input_tokens ?? "NOT_MEASURED",
            output_tokens: result.openrouter.output_tokens ?? "NOT_MEASURED",
            cached_tokens: result.openrouter.openai_cached_prompt_tokens,
            cost_usd: result.openrouter.cost_usd,
            latency_ms: performance.now() - started,
            quality: scored.quality,
            missing: scored.missing,
          });
          runs.set(key, bucket);
          const aborted = noteSpend(result.openrouter.cost_usd);
          if (aborted) return aborted;
        } else {
          const streamName = `${meta.taskId}-${meta.arm}-r${repetition}.ndjson`.replace("V2.2", "v22");
          const result = await adapter.completeCursorAgent({
            prompt: `${meta.system}\n${meta.user}`,
            model: options.model?.trim() || undefined,
            bin: options.bin,
            cwd: options.cwd ?? repoRoot,
            env: options.env ?? process.env,
            spawnImpl: options.spawnImpl,
            ...(saveStreams ? { streamDir, streamName, secrets } : {}),
          });
          const scored = qualityOf(result.text, pack.needles);
          bucket.push({
            repetition,
            input_tokens: "NOT_MEASURED",
            output_tokens: "NOT_MEASURED",
            cached_tokens: "NOT_MEASURED",
            cost_usd: "NOT_MEASURED",
            latency_ms: result.duration_ms,
            duration_api_ms: result.duration_api_ms,
            quality: scored.quality,
            missing: scored.missing,
            model_id: result.model_id,
            tool_calls_started: result.tool_calls.started,
            tool_calls_read_started: result.tool_calls.read_started,
            tool_calls_write_started: result.tool_calls.write_started,
            tool_calls_other_started: result.tool_calls.other_started,
            stream_path: result.stream_path ? path.relative(repoRoot, result.stream_path) : "NOT_MEASURED",
          });
          runs.set(key, bucket);
          if (result.model_id !== "cursor-cli-default") base.model_id = result.model_id;
        }
      }
    }
  } catch (error) {
    throw new Error(publicError(error, secrets));
  }

  return {
    ...base,
    status: "MEASURED",
    spent_usd: provider === "openrouter" ? spent : "NOT_MEASURED",
    tasks: snapshotTasks(),
  };
}
