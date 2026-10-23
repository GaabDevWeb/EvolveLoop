import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadFrozenTasks,
  P0_TASK_IDS,
  repoRootFromModule,
  runP0Baseline,
  type P0BaselineReport,
  type TaskReport,
} from "../../src/v22/p0-baseline-harness.js";

function task(report: P0BaselineReport, id: string): TaskReport {
  const found = report.tasks.find((item) => item.id === id);
  if (!found) throw new Error(`missing task ${id}`);
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
  it("freezes six cards, the metric fields, and the official goals", () => {
    const loaded = loadFrozenTasks();
    expect(loaded.tasks.map((item) => item.id)).toEqual([...P0_TASK_IDS]);
    expect(loaded.document.n_min).toBeGreaterThanOrEqual(3);
    expect(loaded.tasks.find((item) => item.id === "projeto_grande")?.files.length).toBe(9);
    expect(loaded.document.fixed_values.output_tokens).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.cache_read_tokens).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.cache_write_tokens).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.cost).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.compaction).toBe("UNAVAILABLE");
    expect(loaded.document.fixed_values.generative_token_reduction).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.product_percent_gate).toBe("NOT_MEASURED");
    expect(loaded.document.fixed_values.model_id).toBe("deterministic-provider");

    const raw = JSON.parse(readFileSync(loaded.tasksPath, "utf-8")) as {
      tasks: Array<{ id: string; compaction_measurement?: { status: string; compaction_tokens: string } }>;
    };
    const compactCard = raw.tasks.find((item) => item.id === "restricoes_compactacao_handoff");
    expect(compactCard?.compaction_measurement?.status).toBe("UNAVAILABLE");
    expect(compactCard?.compaction_measurement?.compaction_tokens).toBe("UNAVAILABLE");

    const schema = JSON.parse(
      readFileSync(path.join(repoRootFromModule(), "docs/v22/baseline/metrics.schema.json"), "utf-8"),
    ) as { $id: string; properties: Record<string, { const?: string }> };
    expect(schema.$id).toBe("v22-p0-baseline-metrics-1");
    expect(schema.properties.generative_token_reduction?.const).toBe("NOT_MEASURED");
    expect(schema.properties.compaction?.const).toBe("UNAVAILABLE");

    const goals = readFileSync(path.join(repoRootFromModule(), "docs/v22/GOALS-OFFICIAL.md"), "utf-8");
    for (const heading of ["## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6.", "## 7.", "## 8.", "## 9.", "## 10."]) {
      expect(goals).toContain(heading);
    }
    expect(goals).toContain("V22-GOAL-001");
    expect(goals).toContain("V22-GOAL-010");
    expect(goals).toContain("curta");
    expect(goals).toContain("Restrições sob compactação/handoff");
  });

  it("runs B0 (V2) vs V2.2 with N>=3 on the deterministic provider", async () => {
    const graphify = process.env.EVOLVELOOP_GRAPHIFY;
    const report = await runP0Baseline({ n: 3 });
    expect(process.env.EVOLVELOOP_GRAPHIFY).toBe(graphify);
    expect(report.n).toBeGreaterThanOrEqual(3);
    expect(report.model_id).toBe("deterministic-provider");
    expect(report.generative_token_reduction).toBe("NOT_MEASURED");
    expect(report.product_percent_gate).toBe("NOT_MEASURED");
    expect(report.compaction).toBe("UNAVAILABLE");
    expect(["tiktoken:cl100k_base", "PROXY:whitespace_split"]).toContain(report.tokenizer);
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
      expect(item.deterministic_context_evidence_class).toBe("MEASURED_DETERMINISTIC_CONTEXT");
      for (const arm of [item.arms.B0, item.arms["V2.2"]]) {
        expect(arm.n).toBeGreaterThanOrEqual(3);
        expect(arm.output_tokens).toBe("NOT_MEASURED");
        expect(arm.cache_read_tokens).toBe("NOT_MEASURED");
        expect(arm.cache_write_tokens).toBe("NOT_MEASURED");
        expect(arm.cost).toBe("NOT_MEASURED");
        expect(arm.dispersion.output_tokens).toBe("NOT_MEASURED");
        expect(arm.dispersion.cache_read_tokens).toBe("NOT_MEASURED");
        expect(arm.dispersion.cache_write_tokens).toBe("NOT_MEASURED");
        expect(arm.dispersion.cost).toBe("NOT_MEASURED");
        expect(arm.dispersion.input_tokens).toEqual({ statistic: "sample_stddev", value: 0, n: arm.n });
        expect(arm.dispersion.reread_count).toEqual({ statistic: "sample_stddev", value: 0, n: arm.n });
        expect(arm.dispersion.latency_ms.statistic).toBe("sample_stddev");
        expect(arm.dispersion.latency_ms.n).toBe(arm.n);
        expect(arm.dispersion.latency_ms.value).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(arm.latency_ms)).toBe(true);
        expect(arm.latency_ms).toBeGreaterThanOrEqual(0);
        expect(arm.model_id).toBe("deterministic-provider");
        expect(arm.evidence_class).toBe("MEASURED_DETERMINISTIC_CONTEXT");
        expect(arm.runs).toHaveLength(arm.n);
        expect(arm.verifier_pass).toBe(true);
        expect(new Set(arm.runs.map((run) => run.input_tokens)).size).toBe(1);
      }
      expect(item.arms.B0.reread_count).toBeGreaterThanOrEqual(1);
      expect(item.arms["V2.2"].reread_count).toBe(0);
    }

    const curta = task(report, "curta");
    expect(curta.arms.B0.input_tokens).toBeGreaterThan(curta.arms["V2.2"].input_tokens);

    const grande = task(report, "projeto_grande");
    expect(grande.arms["V2.2"].input_tokens).toBeLessThan(grande.arms.B0.input_tokens);
    expect(grande.arms["V2.2"].paths_read).toEqual(["src/target.ts"]);
    expect(grande.arms.B0.paths_read).toContain("src/noise-01.ts");
    expect(grande.arms["V2.2"].runs[0]?.markers_present).not.toContain("NOISE_GRANDE_01");

    const retomada = task(report, "retomada");
    expect(retomada.arms["V2.2"].paths_read).toEqual([".ai/decisions/resume.md"]);
    expect(retomada.arms.B0.paths_read).toContain("src/noise-01.ts");
    expect(retomada.arms["V2.2"].paths_read).not.toContain("src/noise-08.ts");

    const delegada = task(report, "delegada");
    expect(delegada.arms["V2.2"].runs[0]?.markers_present).toContain("DOD_DELEGADA_VERBATIM");
    expect(delegada.arms.B0.runs[0]?.markers_present).toContain("DOD_DELEGADA_VERBATIM");
    expect(delegada.arms["V2.2"].paths_read.length).toBeLessThanOrEqual(2);
    expect(delegada.arms.B0.paths_read.length).toBeGreaterThan(2);
    expect(delegada.arms["V2.2"].paths_read).toContain("handoff/dod.md");

    const conflito = task(report, "fontes_conflitantes");
    const v22 = conflito.arms["V2.2"].runs[0];
    const b0 = conflito.arms.B0.runs[0];
    expect(v22?.markers_present).toContain("CODE_FACT_LIMIT_10");
    expect(v22?.markers_present).not.toContain("WIKI_STALE_LIMIT_99");
    expect(v22?.markers_present).not.toContain("OBSOLETO_NAO_INJETAR");
    expect(v22?.rejected_source_refs).toEqual(expect.arrayContaining([".ai/limit.md", ".ai/old-limit.md"]));
    expect(b0?.markers_present).toEqual(
      expect.arrayContaining(["CODE_FACT_LIMIT_10", "WIKI_STALE_LIMIT_99", "OBSOLETO_NAO_INJETAR"]),
    );

    const compact = task(report, "restricoes_compactacao_handoff");
    expect(compact.compaction_contract?.contract_status).toBe("NOT_IMPLEMENTED");
    expect(compact.compaction_contract?.reinject_allowed).toBe(false);
    expect(compact.compaction_contract?.reinject_probe_allowed).toBe(false);
    expect(compact.compaction_contract?.compaction_tokens).toBe("UNAVAILABLE");
    expect(compact.compaction_contract?.fidelity).toBe("UNAVAILABLE");
    expect(compact.arms["V2.2"].runs[0]?.markers_present).toEqual(
      expect.arrayContaining(["NAO_REMOVER_NEGACAO", "DOD_COMPACTACAO_VERBATIM"]),
    );

    if (process.env.V22_P0_WRITE_REPORT === "1") {
      const out = path.join(repoRootFromModule(), "docs/v22/baseline/raw/p0-baseline-report.json");
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    }
  }, 60_000);
});
