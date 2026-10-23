/**
 * V22-GAP-P0-6 — extractive compaction on restricoes_compactacao_handoff.
 *
 * Before is the uncompacted V2.2 pickup (flag off). After is the same text
 * through the extractive condenser. Fidelity is the fraction of declared
 * anchors and restrictions still present. If that fraction drops, savings
 * are NOT_MEASURED and the missing lines are a trade-off. Reinject stays
 * closed. Output, cache, cost, and model latency stay NOT_MEASURED.
 */

import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { getCompactionReinjectContract } from "../context/compaction-contract.js";
import { condenseExtractive } from "../context/extractive-condenser.js";
import { requireTiktokenCounts } from "../context/tokenizer.js";
import { loadFrozenTasks, measureP0V22Text, repoRootFromModule } from "./p0-baseline-harness.js";

export const COMPACTION_TASK_ID = "restricoes_compactacao_handoff" as const;

export interface CompactionRun {
  repetition: number;
  tokens_before: number;
  tokens_after: number;
  fidelity: number;
  lines_dropped: number;
  latency_ms: number;
  missing: string[];
}

export interface CompactionReport {
  schema_id: "v22-p0-compaction-report-1";
  task_id: "V22-GAP-P0-6";
  source_task: typeof COMPACTION_TASK_ID;
  evidence_class: "MEASURED_DETERMINISTIC_COMPACTION";
  condenser: "extractive-deterministic-1";
  flag: "EVOLVELOOP_COMPACTION";
  flag_default: "OFF";
  measurement_flag: "ON";
  tokenizer: "tiktoken:cl100k_base";
  path_normalization: "stable_relative";
  model_id: "deterministic-provider";
  tree_sha: string;
  n: number;
  n_status: "PASS";
  tokens_before: number;
  tokens_after: number;
  token_delta: number;
  fidelity_before: 1;
  fidelity: number;
  fidelity_status: "PASS" | "LIMITED";
  lines_dropped: number;
  savings_status: "PASS" | "LIMITED" | "NOT_MEASURED";
  savings_rule: "docs/v22/GOALS-OFFICIAL.md#5.3";
  tradeoff: { status: "TRADEOFF"; missing: string[]; note: string } | null;
  unscored_loss: "prose_lines_outside_requirement_decision_restriction_evidence_next_step_path_negation_or_command";
  contract_status: "NOT_IMPLEMENTED";
  reinject_allowed: false;
  output_tokens: "NOT_MEASURED";
  cache_read_tokens: "NOT_MEASURED";
  cache_write_tokens: "NOT_MEASURED";
  cost: "NOT_MEASURED";
  model_latency_ms: "NOT_MEASURED";
  latency_ms: number;
  latency_ms_status: "LIMITED";
  dispersion: {
    tokens_after: {
      statistic: "sample_stddev";
      value: 0;
      n: number;
      expectation: "zero_expected_deterministic";
      status: "PASS";
    };
    model: "NOT_MEASURED";
  };
  product_percent_gate: "NOT_MEASURED";
  limitation: string;
  measured_at: string;
  runs: CompactionRun[];
}

function treeSha(root: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" });
  const sha = result.stdout?.trim() ?? "";
  if (result.status !== 0 || !/^[0-9a-f]{40}$/.test(sha)) return "NOT_MEASURED";
  return sha;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStddev(values: number[]): number {
  const center = mean(values);
  const square = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  return Math.sqrt(square / (values.length - 1));
}

function mustKeepForTask(root: string): string[] {
  const task = loadFrozenTasks(root).tasks.find((item) => item.id === COMPACTION_TASK_ID);
  if (!task) throw new Error(`missing frozen task ${COMPACTION_TASK_ID}`);
  return [...task.anchors.map((anchor) => anchor.substring), ...task.restrictions];
}

function fidelity(text: string, needles: string[]): { score: number; missing: string[] } {
  const missing = needles.filter((needle) => !text.includes(needle));
  return { score: needles.length === 0 ? 0 : (needles.length - missing.length) / needles.length, missing };
}

export async function runP0Compaction(options?: { n?: number; repoRoot?: string }): Promise<CompactionReport> {
  const root = options?.repoRoot ?? repoRootFromModule();
  const n = options?.n ?? 3;
  if (!Number.isInteger(n) || n < 3) throw new Error("compaction n must be an integer >= 3");
  const contract = getCompactionReinjectContract();
  if (contract.status !== "NOT_IMPLEMENTED" || contract.reinject_allowed !== false) {
    throw new Error("compaction measurement refuses to open reinject");
  }
  requireTiktokenCounts(["p0-compaction-tiktoken-probe"]);
  const needles = mustKeepForTask(root);
  const previousFlag = process.env.EVOLVELOOP_COMPACTION;
  delete process.env.EVOLVELOOP_COMPACTION;
  const runs: CompactionRun[] = [];
  try {
    for (let repetition = 1; repetition <= n; repetition += 1) {
      const started = performance.now();
      const before = await measureP0V22Text(COMPACTION_TASK_ID, root);
      const beforeFidelity = fidelity(before.text, needles);
      if (beforeFidelity.score !== 1) {
        throw new Error(
          `uncompacted ${COMPACTION_TASK_ID} is missing anchors or restrictions: ${beforeFidelity.missing.join(" | ")}`,
        );
      }
      const condensed = condenseExtractive({ text: before.text, mustKeep: needles }, true);
      const [tokensBefore, tokensAfter] = requireTiktokenCounts([before.text, condensed.after_text]);
      if (tokensBefore == null || tokensAfter == null) throw new Error("tiktoken did not count compaction text");
      const afterFidelity = fidelity(condensed.after_text, needles);
      runs.push({
        repetition,
        tokens_before: tokensBefore,
        tokens_after: tokensAfter,
        fidelity: afterFidelity.score,
        lines_dropped: condensed.lines_dropped,
        latency_ms: performance.now() - started,
        missing: afterFidelity.missing,
      });
    }
  } finally {
    if (previousFlag === undefined) delete process.env.EVOLVELOOP_COMPACTION;
    else process.env.EVOLVELOOP_COMPACTION = previousFlag;
  }
  const after = runs.map((run) => run.tokens_after);
  const before = runs.map((run) => run.tokens_before);
  if (sampleStddev(after) !== 0 || sampleStddev(before) !== 0) {
    throw new Error("compaction token dispersion was not 0 on a deterministic condenser");
  }
  const tokensBefore = mean(before);
  const tokensAfter = mean(after);
  const fidelityMean = mean(runs.map((run) => run.fidelity));
  const missing = [...new Set(runs.flatMap((run) => run.missing))];
  const fidelityDropped = fidelityMean < 1;
  const tokenDelta = tokensAfter - tokensBefore;
  const savingsStatus = fidelityDropped ? "NOT_MEASURED" : tokenDelta < 0 ? "PASS" : "LIMITED";
  return {
    schema_id: "v22-p0-compaction-report-1",
    task_id: "V22-GAP-P0-6",
    source_task: COMPACTION_TASK_ID,
    evidence_class: "MEASURED_DETERMINISTIC_COMPACTION",
    condenser: "extractive-deterministic-1",
    flag: "EVOLVELOOP_COMPACTION",
    flag_default: "OFF",
    measurement_flag: "ON",
    tokenizer: "tiktoken:cl100k_base",
    path_normalization: "stable_relative",
    model_id: "deterministic-provider",
    tree_sha: treeSha(root),
    n,
    n_status: "PASS",
    tokens_before: tokensBefore,
    tokens_after: tokensAfter,
    token_delta: tokenDelta,
    fidelity_before: 1,
    fidelity: fidelityMean,
    fidelity_status: fidelityMean === 1 ? "PASS" : "LIMITED",
    lines_dropped: mean(runs.map((run) => run.lines_dropped)),
    savings_status: savingsStatus,
    savings_rule: "docs/v22/GOALS-OFFICIAL.md#5.3",
    tradeoff: fidelityDropped
      ? {
          status: "TRADEOFF",
          missing,
          note: "A fidelidade do cartão caiu. O delta de tokens fica NOT_MEASURED.",
        }
      : null,
    unscored_loss: "prose_lines_outside_requirement_decision_restriction_evidence_next_step_path_negation_or_command",
    contract_status: "NOT_IMPLEMENTED",
    reinject_allowed: false,
    output_tokens: "NOT_MEASURED",
    cache_read_tokens: "NOT_MEASURED",
    cache_write_tokens: "NOT_MEASURED",
    cost: "NOT_MEASURED",
    model_latency_ms: "NOT_MEASURED",
    latency_ms: mean(runs.map((run) => run.latency_ms)),
    latency_ms_status: "LIMITED",
    dispersion: {
      tokens_after: {
        statistic: "sample_stddev",
        value: 0,
        n,
        expectation: "zero_expected_deterministic",
        status: "PASS",
      },
      model: "NOT_MEASURED",
    },
    product_percent_gate: "NOT_MEASURED",
    limitation:
      "Uma tarefa, n=3, condenser extrativo com a flag ligada só nesta corrida. O default do produto continua OFF e o contrato de reinject continua NOT_IMPLEMENTED. Fidelidade é a fração de âncoras e restrições do cartão presentes depois. Prosa fora dessas classes, de paths, de negações e de comandos é perda não pontuada. Saída, cache, custo e latência de modelo são NOT_MEASURED. Dispersão 0 é a esperada no determinístico. tree_sha é o HEAD no momento da corrida.",
    measured_at: new Date().toISOString(),
    runs,
  };
}
