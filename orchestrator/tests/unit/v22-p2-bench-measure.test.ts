import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { measureP2OnBenchTasks } from "../../src/v22/p2-bench-measure.js";
import { BENCH_R_TASKS } from "../../src/v22/bench-r-tasks.js";

describe("P2 bench measure R01-R06", () => {
  const prevCache = process.env.EVOLVELOOP_PROMPT_CACHE;

  beforeEach(() => {
    process.env.EVOLVELOOP_PROMPT_CACHE = "on";
  });

  afterEach(() => {
    if (prevCache === undefined) delete process.env.EVOLVELOOP_PROMPT_CACHE;
    else process.env.EVOLVELOOP_PROMPT_CACHE = prevCache;
  });

  it("covers six frozen tasks with brevity + cache metrics", () => {
    const report = measureP2OnBenchTasks();
    expect(report.brevity).toHaveLength(BENCH_R_TASKS.length);
    expect(report.prompt_cache).toHaveLength(BENCH_R_TASKS.length);
    expect(report.brevity_total_caveman).toBeLessThanOrEqual(report.brevity_total_baseline);
    expect(report.brevity.every((r) => r.negation_ok)).toBe(true);
    expect(report.prompt_cache_hit_rate).toBe(1);
  });
});
