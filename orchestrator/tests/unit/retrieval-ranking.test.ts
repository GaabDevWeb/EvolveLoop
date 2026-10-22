import { describe, it, expect } from "vitest";
import {
  scoreRetrievalPath,
  rankRetrievalPaths,
  extractCitationHints,
} from "../../src/context/retrieval-ranking.js";

describe("retrieval-ranking — deterministic, no anchor leakage", () => {
  it("boosts ADR id from query without using verifier substring", () => {
    const ctx = {
      query: "Qual ADR adia compaction/reinject até ownership? ADR-DR-0005",
      rg_patterns: ["DEFER", "compaction/reinject"],
    };
    const adrScore = scoreRetrievalPath(
      "docs/architecture/finalization/adrs/ADR-DR-0005-context-ownership-before-compaction.md",
      "DEFER compaction/reinject implementation",
      ctx,
    );
    const noiseScore = scoreRetrievalPath("src/noise/filler.ts", "unrelated", ctx);
    expect(adrScore).toBeGreaterThan(noiseScore);
    expect(extractCitationHints(ctx.query).adr_ids).toContain("ADR-DR-0005");
  });

  it("rankRetrievalPaths orders by score not lexicographic", () => {
    const ranked = rankRetrievalPaths(
      ["z-last.ts", "orchestrator/src/jobs/checkpoint.ts"],
      (p) => (p.includes("checkpoint") ? "HMAC-SHA256 checkpoint ALG" : "zzz"),
      {
        query: "Qual algoritmo de integridade o checkpoint usa?",
        rg_patterns: ["HMAC-SHA256", "checkpoint"],
      },
    );
    expect(ranked[0].path).toContain("checkpoint");
  });
});
