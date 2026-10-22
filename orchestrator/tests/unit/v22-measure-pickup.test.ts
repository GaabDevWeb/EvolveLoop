import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { measurePickupPromptsForBench } from "../../src/v22/measure-pickup-prompts.js";

describe("GOAL-009 pickup measure", () => {
  it("measures full invoke prompts for R01-R06 and H07-H12 with byte-stable protected tail", () => {
    const jobsDir = mkdtempSync(join(tmpdir(), "measure-jobs-"));
    const report = measurePickupPromptsForBench({
      jobsDir,
      orchestratorRoot: join(import.meta.dirname, "../.."),
    });
    expect(report.pairs).toHaveLength(12);
    expect(report.pairs.every((p) => p.protected_suffix_byte_equal)).toBe(true);
    expect(report.pairs.every((p) => p.tokens_b4 <= p.tokens_b0)).toBe(true);
    expect(report.totals.tokens_b4).toBeLessThan(report.totals.tokens_b0);
    expect(["tiktoken:cl100k_base", "PROXY:whitespace_split"]).toContain(report.tokenizer);
  });
});
