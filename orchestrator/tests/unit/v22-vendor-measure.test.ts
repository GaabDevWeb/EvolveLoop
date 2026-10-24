import { describe, expect, it } from "vitest";
import { LlmHttpProviderAdapter, buildOpenRouterChatBody } from "../../src/providers/llm/llm-http-provider-adapter.js";
import { parseOpenRouterUsage } from "../../src/providers/llm/vendor-cache-usage.js";
import {
  cursorAgentArgs,
  parseCursorAgentNdjson,
} from "../../src/providers/llm/cursor-agent-provider.js";
import {
  OPENROUTER_DEFAULT_MODEL,
  VENDOR_BUDGET_USD,
  buildCacheProbePrefix,
  estimateOpenRouterUsd,
  publicError,
  resolveOpenRouterPrice,
  runVendorMeasure,
  type VendorPack,
} from "../../src/v22/vendor-measure.js";

const SECRET = "sk-test-vendor-key-should-not-leak";

function pack(): VendorPack {
  return {
    taskId: "curta",
    query: "Qual função?",
    needles: ["export function cleanOutput"],
    arms: {
      B0: "export function cleanOutput() { return 1; }",
      "V2.2": "export function cleanOutput() { return 1; }",
    },
  };
}

function ndjson(extra = ""): string {
  return [
    JSON.stringify({
      type: "system",
      subtype: "init",
      model: "Composer",
      apiKeySource: "env",
      session_id: "s",
    }),
    extra,
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 40,
      duration_api_ms: 40,
      result: "export function cleanOutput",
      session_id: "s",
      request_id: "r",
      usage: { inputTokens: 9, cacheReadTokens: 4, cost: 3 },
    }),
  ]
    .filter(Boolean)
    .join("\n");
}

describe("V22-GAP-VENDOR-1a", () => {
  it("builds an OpenRouter body and adds cache_control only for anthropic models", () => {
    const cheap = buildOpenRouterChatBody({
      model: OPENROUTER_DEFAULT_MODEL,
      stablePrefix: "prefix",
      userMessage: "question",
      maxTokens: 300,
    });
    const system = (cheap.messages as Array<{ content: unknown }>)[0];
    expect(system?.content).toBe("prefix");
    expect(JSON.stringify(cheap)).not.toContain("cache_control");
    const anthropic = buildOpenRouterChatBody({
      model: "anthropic/claude-3.5-haiku",
      stablePrefix: "prefix",
      userMessage: "question",
      maxTokens: 300,
    });
    expect(JSON.stringify(anthropic)).toContain('"cache_control":{"type":"ephemeral"}');
  });

  it("parses OpenRouter prompt, completion, cached tokens, and cost", () => {
    const usage = parseOpenRouterUsage({
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 30,
        prompt_tokens_details: { cached_tokens: 1100 },
        cost: 0.001,
      },
    });
    expect(usage.vendor).toBe("openrouter");
    expect(usage.input_tokens).toBe(1200);
    expect(usage.output_tokens).toBe(30);
    expect(usage.openai_cached_prompt_tokens).toBe(1100);
    expect(usage.cost_usd).toBe(0.001);
    expect(parseOpenRouterUsage({ usage: { prompt_tokens: 1, completion_tokens: 1 } }).cost_usd).toBe(
      "NOT_MEASURED",
    );
  });

  it("keeps the Cursor key off argv and ignores undocumented usage", () => {
    const args = cursorAgentArgs();
    expect(args).toEqual(["-p", "--output-format", "stream-json", "--mode", "ask", "--trust"]);
    expect(cursorAgentArgs({ model: "composer" })).toContain("--model");
    expect(args.join(" ")).not.toContain(SECRET);
    const parsed = parseCursorAgentNdjson(ndjson());
    expect(parsed.text).toBe("export function cleanOutput");
    expect(parsed.duration_ms).toBe(40);
    expect(parsed.duration_api_ms).toBe(40);
    expect(parsed.model_id).toBe("Composer");
    expect(parsed.input_tokens).toBe("NOT_MEASURED");
    expect(parsed.output_tokens).toBe("NOT_MEASURED");
    expect(parsed.cached_tokens).toBe("NOT_MEASURED");
    expect(parsed.cost_usd).toBe("NOT_MEASURED");
    expect(JSON.stringify(parsed)).not.toContain(SECRET);
  });

  it("redacts a key that leaks into an error", () => {
    expect(publicError(new Error(`failure ${SECRET} tail`), [SECRET])).not.toContain(SECRET);
  });

  it("aborts the OpenRouter estimate above US$2.50 and does not call fetch", async () => {
    let called = 0;
    const adapter = new LlmHttpProviderAdapter(async () => {
      called += 1;
      return new Response("{}", { status: 200 });
    });
    const report = await runVendorMeasure({
      provider: "openrouter",
      dryRun: false,
      n: 5,
      packs: [pack()],
      apiKey: SECRET,
      inputUsdPerMtok: 1_000_000,
      outputUsdPerMtok: 1_000_000,
      adapter,
    });
    expect(report.status).toBe("ABORTED_ESTIMATE");
    expect(report.estimate_usd).toBeGreaterThan(VENDOR_BUDGET_USD);
    expect(called).toBe(0);
    expect(JSON.stringify(report)).not.toContain(SECRET);
  });

  it("dry-run estimates the cheap model without a key", async () => {
    const report = await runVendorMeasure({
      provider: "openrouter",
      dryRun: true,
      n: 5,
      packs: [pack()],
    });
    expect(report.status).toBe("DRY_RUN");
    expect(report.model_id).toBe(OPENROUTER_DEFAULT_MODEL);
    expect(report.cache_probe.prefix_over_1024).toBe(true);
    expect(typeof report.estimate_usd).toBe("number");
    expect(report.estimate_usd).toBeLessThan(VENDOR_BUDGET_USD);
    expect(report.calls).toBe(12);
    expect(resolveOpenRouterPrice("other/model")).toBeNull();
  });

  it("stops OpenRouter when summed usage.cost crosses US$2.50", async () => {
    let called = 0;
    const adapter = new LlmHttpProviderAdapter(async () => {
      called += 1;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "export function cleanOutput" } }],
          usage: { prompt_tokens: 10, completion_tokens: 4, prompt_tokens_details: { cached_tokens: 0 }, cost: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const report = await runVendorMeasure({
      provider: "openrouter",
      dryRun: false,
      n: 5,
      packs: [pack()],
      apiKey: SECRET,
      inputUsdPerMtok: 0,
      outputUsdPerMtok: 0,
      adapter,
    });
    expect(report.status).toBe("ABORTED_BUDGET");
    expect(report.spent_usd).toBeGreaterThan(VENDOR_BUDGET_USD);
    expect(called).toBe(3);
    expect(JSON.stringify(report)).not.toContain(SECRET);
  });

  it("measures cursor-agent from the documented fields only", async () => {
    const seen: string[][] = [];
    const report = await runVendorMeasure({
      provider: "cursor-agent",
      dryRun: false,
      n: 5,
      packs: [pack()],
      apiKey: SECRET,
      spawnImpl: async (_bin, args) => {
        seen.push(args);
        expect(args.join(" ")).not.toContain(SECRET);
        return { status: 0, stdout: ndjson(), stderr: "" };
      },
    });
    expect(report.status).toBe("MEASURED");
    expect(report.estimate_usd).toBe("NOT_MEASURED");
    expect(report.spent_usd).toBe("NOT_MEASURED");
    expect(report.model_id).toBe("Composer");
    expect(report.tasks[0]?.arms.B0.latency_ms).toBe(40);
    expect(report.tasks[0]?.arms.B0.input_tokens).toBe("NOT_MEASURED");
    expect(report.tasks[0]?.arms.B0.cost_usd).toBe("NOT_MEASURED");
    expect(report.tasks[0]?.arms.B0.quality).toBe(1);
    expect(report.cache_probe.calls).toHaveLength(2);
    expect(seen.length).toBe(12);
    expect(estimateOpenRouterUsd({ inputTokens: 1_000_000, outputTokensUpper: 0, inputUsdPerMtok: 0.1, outputUsdPerMtok: 0.4 })).toBeCloseTo(0.1);
    expect(buildCacheProbePrefix().length).toBeGreaterThan(1000);
  });
});
