import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyContextBudget, sliceFromFile } from "../../src/context/index.js";
import { condenseExtractive } from "../../src/context/extractive-condenser.js";
import { getCompactionReinjectContract } from "../../src/context/compaction-contract.js";
import { runP0Compaction } from "../../src/v22/p0-compaction-measure.js";
import { repoRootFromModule } from "../../src/v22/p0-baseline-harness.js";

const FLAG = "EVOLVELOOP_COMPACTION";

afterEach(() => {
  delete process.env[FLAG];
});

describe("V22-GAP-P0-6 extractive condenser", () => {
  it("keeps the input when the flag is off", () => {
    delete process.env[FLAG];
    const text = "requirement: stay\nfiller about the weather yesterday\n";
    const result = condenseExtractive({ text, mustKeep: ["requirement: stay"] });
    expect(result.applied).toBe(false);
    expect(result.flag).toBe("OFF");
    expect(result.after_text).toBe(text);
    expect(result.lines_dropped).toBe(0);
  });

  it("keeps requirements, decisions, restrictions, evidence, and next steps, and drops other prose", () => {
    const text = [
      "requirement: keep the gate",
      "decision: P0_HANDOFF_RECEIVER_DECISION",
      "restriction: reinject_allowed: false",
      "evidence: anchored file:line",
      "next_action: p0-handoff-wait knowledge-retrieval",
      "This paragraph is filler about the weather yesterday.",
      "--- path:docs/adr/0013-context-ownership-working-context.md ---",
      "No secret leakage in evidence payload",
    ].join("\n");
    const result = condenseExtractive(
      { text, mustKeep: ["No secret leakage in evidence payload", "reinject_allowed: false"] },
      true,
    );
    expect(result.applied).toBe(true);
    expect(result.after_text).toContain("requirement: keep the gate");
    expect(result.after_text).toContain("decision: P0_HANDOFF_RECEIVER_DECISION");
    expect(result.after_text).toContain("restriction: reinject_allowed: false");
    expect(result.after_text).toContain("evidence: anchored file:line");
    expect(result.after_text).toContain("next_action: p0-handoff-wait");
    expect(result.after_text).toContain("--- path:docs/adr/0013-context-ownership-working-context.md ---");
    expect(result.after_text).toContain("No secret leakage in evidence payload");
    expect(result.after_text).not.toContain("weather");
    expect(result.missing_must_keep).toEqual([]);
    expect(result.lines_dropped).toBeGreaterThan(0);
  });

  it("reports a missing anchor instead of inventing the line", () => {
    const result = condenseExtractive({ text: "filler about the weather yesterday", mustKeep: ["ABSENT_NEEDLE"] }, true);
    expect(result.missing_must_keep).toEqual(["ABSENT_NEEDLE"]);
    expect(result.after_text).not.toContain("ABSENT_NEEDLE");
  });

  it("does not open reinject when the flag is on, and condenses only unprotected slices", () => {
    process.env[FLAG] = "on";
    const contract = getCompactionReinjectContract();
    expect(contract.status).toBe("NOT_IMPLEMENTED");
    expect(contract.reinject_allowed).toBe(false);
    const budget = applyContextBudget(
      [
        sliceFromFile("policy.md", "never strip this protected body", "security_restriction", 50),
        sliceFromFile("notes.md", "requirement: stay\nfiller about the weather yesterday\n", "generic", 1),
      ],
      { ownerId: "p0-6", limits: { max_paths: 10, max_tokens: 100_000 } },
    );
    expect(budget.context_text).toContain("never strip this protected body");
    expect(budget.context_text).toContain("requirement: stay");
    expect(budget.context_text).not.toContain("weather");
  });

  it("measures restricoes_compactacao_handoff before and after, n>=3", async () => {
    const report = await runP0Compaction({ n: 3 });
    expect(report.source_task).toBe("restricoes_compactacao_handoff");
    expect(report.flag_default).toBe("OFF");
    expect(report.measurement_flag).toBe("ON");
    expect(report.tokenizer).toBe("tiktoken:cl100k_base");
    expect(report.path_normalization).toBe("stable_relative");
    expect(report.n).toBeGreaterThanOrEqual(3);
    expect(report.tokens_before).toBeGreaterThan(200);
    expect(report.tokens_after).toBeGreaterThan(0);
    expect(report.reinject_allowed).toBe(false);
    expect(report.contract_status).toBe("NOT_IMPLEMENTED");
    expect(report.output_tokens).toBe("NOT_MEASURED");
    expect(report.cost).toBe("NOT_MEASURED");
    expect(report.model_latency_ms).toBe("NOT_MEASURED");
    expect(report.dispersion.tokens_after.value).toBe(0);
    expect(report.dispersion.model).toBe("NOT_MEASURED");
    expect(report.fidelity_before).toBe(1);
    expect(new Set(report.runs.map((run) => run.tokens_after)).size).toBe(1);
    if (report.fidelity < 1) {
      expect(report.savings_status).toBe("NOT_MEASURED");
      expect(report.tradeoff?.status).toBe("TRADEOFF");
      expect(report.tradeoff?.missing.length).toBeGreaterThan(0);
    } else {
      expect(report.tradeoff).toBeNull();
      expect(report.fidelity_status).toBe("PASS");
      expect(report.tokens_after).toBeLessThan(report.tokens_before);
      expect(report.savings_status).toBe("PASS");
    }
    expect(process.env[FLAG]).toBeUndefined();

    const out = path.join(repoRootFromModule(), "docs/v22/baseline/raw/p0-compaction-report.json");
    if (process.env.V22_P0_WRITE_REPORT === "1") {
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    } else {
      let committed: { path_normalization?: string; tokens_before?: number; tokens_after?: number; fidelity?: number } | null =
        null;
      try {
        committed = JSON.parse(readFileSync(out, "utf-8")) as typeof committed;
      } catch {
        committed = null;
      }
      if (committed?.path_normalization === "stable_relative") {
        expect(committed.tokens_before).toBe(report.tokens_before);
        expect(committed.tokens_after).toBe(report.tokens_after);
        expect(committed.fidelity).toBe(report.fidelity);
      }
    }
  }, 180_000);
});
