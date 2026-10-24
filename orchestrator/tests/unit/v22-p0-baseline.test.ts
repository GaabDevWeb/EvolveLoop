import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { requireTiktokenCounts } from "../../src/context/tokenizer.js";
import {
  CANONICAL_MAX_INPUT_TOKENS,
  CANONICAL_MAX_PATHS,
  loadFrozenTasks,
  P0_TASK_IDS,
  repoRootFromModule,
  runP0Baseline,
  savingsStatus,
  type P0BaselineReport,
  type QualityCheck,
  type TaskReport,
} from "../../src/v22/p0-baseline-harness.js";

function task(report: P0BaselineReport, id: string): TaskReport {
  const found = report.tasks.find((item) => item.id === id);
  if (!found) throw new Error(`missing task ${id}`);
  return found;
}

function check(checks: QualityCheck[], id: string): QualityCheck {
  const found = checks.find((item) => item.id === id);
  if (!found) throw new Error(`missing quality check ${id}`);
  return found;
}

function numericCompactionTokens(value: unknown, trail: string, hits: string[]): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${trail}.${key}`;
    if (/compact/i.test(key) && /token/i.test(key) && typeof child === "number") hits.push(next);
    numericCompactionTokens(child, next, hits);
  }
}

describe("V22-GAP-P0-1 baseline", () => {
  it("refuses the whitespace proxy and applies the section 5.3 savings rule", () => {
    const counts = requireTiktokenCounts(["p0 tiktoken probe", "p0 tiktoken probe"]);
    expect(counts).toEqual([5, 5]);
    expect(savingsStatus(1, 1, -10)).toBe("PASS");
    expect(savingsStatus(1, 0.5, 10)).toBe("LIMITED");
    expect(savingsStatus(0.5, 1, -10)).toBe("NOT_MEASURED");
  });

  it("freezes six official-corpus cards, the metric fields, and the goals", () => {
    const loaded = loadFrozenTasks();
    expect(loaded.tasks.map((item) => item.id)).toEqual([...P0_TASK_IDS]);
    expect(loaded.document.n_min).toBeGreaterThanOrEqual(3);
    expect(loaded.document.fixed_values.output_tokens).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.cache_read_tokens).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.cache_write_tokens).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.cost).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.compaction).toBe("UNAVAILABLE");
    expect(loaded.document.fixed_values.generative_token_reduction).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.product_percent_gate).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.ollama_hybrid).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.model_id).toBe("deterministic-provider");

    const raw = JSON.parse(readFileSync(loaded.tasksPath, "utf-8")) as {
      corpus: string;
      canonical_budget: { max_paths: number; max_input_tokens: number; scorer: string };
      tasks: Array<{ id: string; anchors: unknown[]; compaction_measurement?: { status: string; compaction_tokens: string } }>;
    };
    expect(raw.corpus).toBe("evolveloop-monorepo");
    expect(raw.canonical_budget.max_paths).toBe(CANONICAL_MAX_PATHS);
    expect(raw.canonical_budget.max_input_tokens).toBe(CANONICAL_MAX_INPUT_TOKENS);
    expect(raw.canonical_budget.scorer).toBe("v22-anchor-scorer-1.0.0");
    for (const card of raw.tasks) expect(card.anchors.length).toBeGreaterThan(0);
    const compactCard = raw.tasks.find((item) => item.id === "restricoes_compactacao_handoff");
    expect(compactCard?.compaction_measurement?.status).toBe("UNAVAILABLE");
    expect(compactCard?.compaction_measurement?.compaction_tokens).toBe("UNAVAILABLE");

    const schema = JSON.parse(
      readFileSync(path.join(repoRootFromModule(), "docs/v22/baseline/metrics.schema.json"), "utf-8"),
    ) as { $id: string; properties: Record<string, { const?: string }> };
    expect(schema.$id).toBe("v22-p0-baseline-metrics-1");
    expect(schema.properties.generative_token_reduction?.const).toBe("NOT_MEASURED");
    expect(schema.properties.compaction?.const).toBe("UNAVAILABLE");
    expect(schema.properties.tokenizer?.const).toBe("tiktoken:cl100k_base");
    expect(schema.properties.path_normalization?.const).toBe("stable_relative");
    expect(schema.properties.ollama_hybrid?.const).toBe("NOT_MEASURED");

    const goals = readFileSync(path.join(repoRootFromModule(), "docs/v22/GOALS-OFFICIAL.md"), "utf-8");
    for (const heading of ["## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6.", "## 7.", "## 8.", "## 9.", "## 10."]) {
      expect(goals).toContain(heading);
    }
    expect(goals).toContain("### 5.3");
    expect(goals).toContain("V22-GOAL-001");
    expect(goals).toContain("V22-GOAL-010");
    expect(goals).toContain("curta");
    expect(goals).toContain("Restrições sob compactação/handoff");
    expect(goals).toContain("zero_expected_deterministic");
  });

  it("runs B0 (V2) vs V2.2 with N>=3 on the official corpus", async () => {
    const graphify = process.env.EVOLVELOOP_GRAPHIFY;
    const report = await runP0Baseline({ n: 3 });
    expect(process.env.EVOLVELOOP_GRAPHIFY).toBe(graphify);
    expect(report.n).toBeGreaterThanOrEqual(3);
    expect(report.model_id).toBe("deterministic-provider");
    expect(report.tokenizer).toBe("tiktoken:cl100k_base");
    expect(report.generative_token_reduction).toBe("NOT_MEASURED");
    expect(report.product_percent_gate).toBe("NOT_MEASURED");
    expect(report.ollama_hybrid).toBe("NOT_MEASURED");
    expect(report.compaction).toBe("UNAVAILABLE");
    expect(report.canonical_max_paths).toBe(45);
    expect(report.canonical_max_input_tokens).toBe(22_000);
    expect(report.dispersion_declaration).toBe("zero_expected_deterministic_for_input_tokens");
    expect(report.path_normalization).toBe("stable_relative");
    expect(report.tasks.map((item) => item.id)).toEqual([...P0_TASK_IDS]);

    const compactionNumbers: string[] = [];
    numericCompactionTokens(report, "report", compactionNumbers);
    expect(compactionNumbers).toEqual([]);

    for (const item of report.tasks) {
      expect(item.compaction).toBe("UNAVAILABLE");
      expect(item.compaction_tokens).toBe("UNAVAILABLE");
      expect(item.compaction_fidelity).toBe("UNAVAILABLE");
      expect(item.generative_token_reduction).toBe("NOT_MEASURED");
      expect(item.product_percent_gate).toBe("NOT_MEASURED");
      expect(item.ollama_hybrid).toBe("NOT_MEASURED");
      expect(item.deterministic_context_evidence_class).toBe("MEASURED_DETERMINISTIC_CONTEXT");
      expect(item.savings_counted).toBe(item.quality_v22 >= item.quality_b0);
      expect(item.deterministic_context_savings_status).toBe(
        savingsStatus(item.quality_v22, item.quality_b0, item.raw_input_delta),
      );
      if (item.quality_v22 < item.quality_b0) {
        expect(item.deterministic_context_savings_status).toBe("NOT_MEASURED");
      }
      for (const arm of [item.arms.B0, item.arms["V2.2"]]) {
        expect(arm.n).toBeGreaterThanOrEqual(3);
        expect(arm.tokenizer).toBe("tiktoken:cl100k_base");
        expect(arm.output_tokens).toBe("NOT_MEASURED");
        expect(arm.output_tokens_status).toBe("NOT_MEASURED");
        expect(arm.cache_read_tokens).toBe("NOT_MEASURED");
        expect(arm.cache_write_tokens).toBe("NOT_MEASURED");
        expect(arm.cost).toBe("NOT_MEASURED");
        expect(arm.model_latency_ms).toBe("NOT_MEASURED");
        expect(arm.dispersion.output_tokens).toBe("NOT_MEASURED");
        expect(arm.dispersion.model).toBe("NOT_MEASURED");
        expect(arm.dispersion.input_tokens).toMatchObject({
          statistic: "sample_stddev",
          value: 0,
          n: arm.n,
          expectation: "zero_expected_deterministic",
          status: "PASS",
        });
        expect(arm.dispersion.reread_count).toMatchObject({
          statistic: "sample_stddev",
          value: 0,
          expectation: "zero_expected_deterministic",
          status: "PASS",
        });
        expect(arm.dispersion.latency_ms.expectation).toBe("retrieval_io_jitter");
        expect(arm.dispersion.latency_ms.status).toBe("PASS");
        expect(arm.dispersion.latency_ms.value).toBeGreaterThanOrEqual(0);
        expect(arm.latency_ms_status).toBe("LIMITED");
        expect(arm.latency_kind).toBe("retrieval");
        expect(Number.isFinite(arm.latency_ms)).toBe(true);
        expect(arm.latency_ms).toBeGreaterThan(0);
        expect(arm.input_tokens, `${item.id} ${arm.arm} paths=${arm.paths_read.length}`).toBeGreaterThan(200);
        expect(arm.input_tokens_status).toBe("PASS");
        expect(arm.runs).toHaveLength(arm.n);
        expect(new Set(arm.runs.map((run) => run.input_tokens)).size).toBe(1);
        expect(arm.runs.every((run) => run.quality_checks.length > 0)).toBe(true);
      }
      expect(item.arms["V2.2"].retrieval_input_tokens).toBeLessThanOrEqual(22_000);
      expect(item.arms["V2.2"].reread_count).toBe(0);
      expect(item.arms.B0.evidence_class).toBe("OFFICIAL_BASELINE");
      expect(item.arms["V2.2"].evidence_class).toBe("PROJECT_WIKI_PICKUP_BUDGET");
    }

    const grande = task(report, "projeto_grande");
    expect(grande.arms.B0.paths_read.length).toBe(45);
    expect(grande.arms.B0.input_tokens).toBeGreaterThan(2_000);

    const retomada = task(report, "retomada");
    const retomadaRun = retomada.arms["V2.2"].runs[0];
    expect(check(retomadaRun?.quality_checks ?? [], "resume").pass).toBe(true);
    expect(retomada.arms["V2.2"].paths_read).toContain("docs/adr/0013-context-ownership-working-context.md");

    const delegada = task(report, "delegada");
    const delegadaChecks = delegada.arms["V2.2"].runs[0]?.quality_checks ?? [];
    expect(delegadaChecks.some((item) => item.id.startsWith("restriction:") && item.pass)).toBe(true);

    const conflito = task(report, "fontes_conflitantes");
    const conflitoRun = conflito.arms["V2.2"].runs[0];
    expect(check(conflitoRun?.quality_checks ?? [], "conflict_signaled").pass).toBe(true);
    expect(check(conflitoRun?.quality_checks ?? [], "stale_absent").pass).toBe(true);
    expect(conflitoRun?.rejected_source_refs).toEqual(
      expect.arrayContaining([
        "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/fixtures/evolveloop-project-knowledge/.ai/pages/adr-compaction-defer.md",
      ]),
    );
    expect(conflito.arms["V2.2"].paths_read).not.toContain(
      "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/fixtures/evolveloop-project-knowledge/.ai/pages/adr-compaction-defer.md",
    );

    const compact = task(report, "restricoes_compactacao_handoff");
    expect(compact.compaction_contract?.contract_status).toBe("NOT_IMPLEMENTED");
    expect(compact.compaction_contract?.reinject_allowed).toBe(false);
    expect(compact.compaction_contract?.reinject_probe_allowed).toBe(false);
    expect(compact.compaction_contract?.compaction_tokens).toBe("UNAVAILABLE");
    expect(compact.compaction_contract?.fidelity).toBe("UNAVAILABLE");
    const compactChecks = compact.arms["V2.2"].runs[0]?.quality_checks ?? [];
    expect(compactChecks.filter((item) => item.id.startsWith("restriction:")).every((item) => item.pass)).toBe(true);

    const out = path.join(repoRootFromModule(), "docs/v22/baseline/raw/p0-baseline-report.json");
    if (process.env.V22_P0_WRITE_REPORT === "1") {
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    } else {
      const committed = JSON.parse(readFileSync(out, "utf-8")) as {
        path_normalization?: string;
        tree_sha?: string;
        tasks?: Array<{ id: string; arms: { B0: { input_tokens: number }; "V2.2": { input_tokens: number; retrieval_input_tokens: number } } }>;
      };
      if (committed.path_normalization === "stable_relative" && committed.tree_sha && committed.tree_sha !== "NOT_MEASURED") {
        for (const item of report.tasks) {
          const saved = committed.tasks?.find((row) => row.id === item.id);
          expect(saved?.arms.B0.input_tokens, item.id).toBe(item.arms.B0.input_tokens);
          expect(saved?.arms["V2.2"].input_tokens, item.id).toBe(item.arms["V2.2"].input_tokens);
          expect(saved?.arms["V2.2"].retrieval_input_tokens, item.id).toBe(item.arms["V2.2"].retrieval_input_tokens);
        }
        const diff = spawnSync("git", ["diff", "--name-only", committed.tree_sha, "HEAD"], {
          cwd: repoRootFromModule(),
          encoding: "utf-8",
        });
        const names = (diff.stdout ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const allowedRaw = new Set([
          "docs/v22/baseline/raw/p0-baseline-report.json",
          "docs/v22/baseline/raw/p0-handoff-report.json",
          "docs/v22/baseline/raw/p0-compaction-report.json",
          "docs/v22/baseline/raw/p0-vendor-report.json",
          "docs/v22/baseline/raw/p0-vendor-cursor-agent-report.json",
        ]);
        expect(names.filter((name) => name.startsWith("docs/v22/baseline/raw/") && !allowedRaw.has(name))).toEqual([]);
      }
    }
  }, 300_000);
});
