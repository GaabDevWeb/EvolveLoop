import { describe, expect, it } from "vitest";
import { runDeterministicBenchmarkSuite, BENCHMARK_CASES } from "../../src/engineering/benchmark/suite.js";

describe("SE benchmark suite A–J (deterministic)", () => {
  it("defines 10 benchmarks", () => {
    expect(BENCHMARK_CASES).toHaveLength(10);
  });

  it("all deterministic cases PASS", async () => {
    const records = await runDeterministicBenchmarkSuite();
    const failed = records.filter((r) => !r.success);
    expect(failed, JSON.stringify(failed)).toEqual([]);
    expect(records.every((r) => r.mode === "deterministic")).toBe(true);
  });
});
