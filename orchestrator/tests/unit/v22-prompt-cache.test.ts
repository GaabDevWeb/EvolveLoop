import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  PromptCacheHttpAdapter,
  buildStablePromptPrefix,
  computePromptCacheKey,
} from "../../src/v22/prompt-cache-http.js";

describe("prompt cache HTTP adapter (GOAL-010)", () => {
  const prev = process.env.EVOLVELOOP_PROMPT_CACHE;

  beforeEach(() => {
    process.env.EVOLVELOOP_PROMPT_CACHE = "on";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.EVOLVELOOP_PROMPT_CACHE;
    else process.env.EVOLVELOOP_PROMPT_CACHE = prev;
  });

  it("builds deterministic prefix and key", () => {
    const parts = [
      { role: "system" as const, content: "sys A" },
      { role: "user" as const, content: "task" },
    ];
    const p1 = buildStablePromptPrefix(parts);
    const p2 = buildStablePromptPrefix(parts);
    expect(computePromptCacheKey(p1)).toBe(computePromptCacheKey(p2));
    expect(p1).toBe(p2);
  });

  it("records hit on second call with same prefix", () => {
    const adapter = new PromptCacheHttpAdapter();
    const parts = [
      { role: "system" as const, content: "frozen prefix" },
      { role: "user" as const, content: "R01 query" },
    ];
    const first = adapter.complete({ model: "m", parts, dynamic_tail: "tail-1" });
    const second = adapter.complete({ model: "m", parts, dynamic_tail: "tail-2" });
    expect(first.cache_hit).toBe(false);
    expect(second.cache_hit).toBe(true);
    expect(adapter.metrics().hits).toBe(1);
  });

  it("does not cache when flag off", () => {
    delete process.env.EVOLVELOOP_PROMPT_CACHE;
    const adapter = new PromptCacheHttpAdapter();
    const parts = [{ role: "system" as const, content: "x" }];
    adapter.complete({ model: "m", parts });
    const second = adapter.complete({ model: "m", parts });
    expect(second.cache_hit).toBe(false);
  });
});
