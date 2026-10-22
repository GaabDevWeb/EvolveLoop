import { describe, it, expect } from "vitest";
import {
  scoreRetrievalPath,
  rankRetrievalPaths,
  extractCitationHints,
  extractQueryTerms,
} from "../../src/context/retrieval-ranking.js";

describe("retrieval-ranking — no rg_patterns / no anchor leakage", () => {
  it("does not use rg_patterns in extractQueryTerms", () => {
    const terms = extractQueryTerms({
      query: "Qual ADR adia compaction? ADR-DR-0005",
    });
    expect(terms.some((t) => t.includes("defer"))).toBe(false);
    expect(terms.some((t) => t.includes("compaction"))).toBe(true);
  });

  it("boosts ADR id from query text only", () => {
    const ctx = { query: "Qual ADR adia compaction/reinject? ADR-DR-0005" };
    const adrScore = scoreRetrievalPath(
      "docs/architecture/finalization/adrs/ADR-DR-0005-context-ownership-before-compaction.md",
      "DEFER compaction/reinject implementation",
      ctx,
    );
    const noiseScore = scoreRetrievalPath("src/noise/filler.ts", "unrelated", ctx);
    expect(adrScore).toBeGreaterThan(noiseScore);
    expect(extractCitationHints(ctx.query).adr_ids).toContain("ADR-DR-0005");
  });

  it("rankRetrievalPaths orders by query relevance not lexicographic", () => {
    const ranked = rankRetrievalPaths(
      ["z-last.ts", "orchestrator/src/jobs/checkpoint.ts"],
      (p) => (p.includes("checkpoint") ? "integridade checkpoint HMAC" : "zzz"),
      { query: "Qual algoritmo de integridade o checkpoint do engine usa?" },
    );
    expect(ranked[0].path).toContain("checkpoint");
  });
});
