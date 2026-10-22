import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseAnthropicCacheUsage,
  parseOpenAiCacheUsage,
} from "../../src/providers/llm/vendor-cache-usage.js";

const fixtureDir = join(import.meta.dirname, "../fixtures/vendor-cache");

describe("vendor cache usage parse (GOAL-010-vendor)", () => {
  it("parses Anthropic cache_creation then cache_read fixtures", () => {
    const doc = JSON.parse(
      readFileSync(join(fixtureDir, "anthropic-miss-then-hit.json"), "utf-8"),
    ) as { responses: unknown[] };
    const miss = parseAnthropicCacheUsage(doc.responses[0]);
    const hit = parseAnthropicCacheUsage(doc.responses[1]);
    expect(miss.vendor_cache_hit).toBe(false);
    expect(miss.cache_creation_input_tokens).toBe(100);
    expect(hit.vendor_cache_hit).toBe(true);
    expect(hit.cache_read_input_tokens).toBe(100);
    expect(hit.cache_creation_input_tokens).toBe(0);
  });

  it("parses OpenAI cached_tokens fixtures", () => {
    const doc = JSON.parse(
      readFileSync(join(fixtureDir, "openai-miss-then-hit.json"), "utf-8"),
    ) as { responses: unknown[] };
    const miss = parseOpenAiCacheUsage(doc.responses[0]);
    const hit = parseOpenAiCacheUsage(doc.responses[1]);
    expect(miss.vendor_cache_hit).toBe(false);
    expect(hit.vendor_cache_hit).toBe(true);
    expect(hit.openai_cached_prompt_tokens).toBe(40);
  });
});
