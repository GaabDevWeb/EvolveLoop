import { describe, it, expect } from "vitest";
import { readFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  LlmHttpProviderAdapter,
  buildAnthropicMessagesBody,
} from "../../src/providers/llm/llm-http-provider-adapter.js";
import { probeVendorCacheLive } from "../../src/providers/llm/vendor-cache-live-probe.js";

const fixtureDir = join(import.meta.dirname, "../fixtures/vendor-cache");

describe("vendor cache HTTP adapter (fixtures)", () => {
  it("records telemetry with cache hit on second Anthropic response", async () => {
    const doc = JSON.parse(
      readFileSync(join(fixtureDir, "anthropic-miss-then-hit.json"), "utf-8"),
    ) as { responses: unknown[] };
    let call = 0;
    const fetchMock: typeof fetch = async () => {
      const body = doc.responses[call];
      call += 1;
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const adapter = new LlmHttpProviderAdapter(fetchMock);
    const memoryRoot = mkdtempSync(join(tmpdir(), "vc-"));
    const parts = [{ role: "system" as const, content: "stable probe prefix v1" }];
    const r1 = await adapter.completeAnthropic({
      apiKey: "fixture-key",
      model: "claude-3-5-haiku-20241022",
      stablePrefixParts: parts,
      userMessage: "probe-1",
      memoryRoot,
      featureId: "vendor-fixture",
      callIndex: 1,
    });
    const r2 = await adapter.completeAnthropic({
      apiKey: "fixture-key",
      model: "claude-3-5-haiku-20241022",
      stablePrefixParts: parts,
      userMessage: "probe-2",
      memoryRoot,
      featureId: "vendor-fixture",
      callIndex: 2,
    });
    expect(r1.usage.vendor_cache_hit).toBe(false);
    expect(r2.usage.vendor_cache_hit).toBe(true);
    expect(r2.telemetry.prefix_cache_key_sha256).toBe(r1.telemetry.prefix_cache_key_sha256);
    const body = buildAnthropicMessagesBody({
      model: "claude-3-5-haiku-20241022",
      stablePrefixParts: parts,
      userMessage: "x",
    });
    const system = body.system as Array<Record<string, unknown>>;
    expect(system[0]?.cache_control).toEqual({ type: "ephemeral" });
  });
});

describe("vendor cache live probe", () => {
  it("reports NOT_MEASURED when no API keys in environment", async () => {
    const prevA = process.env.ANTHROPIC_API_KEY;
    const prevO = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const report = await probeVendorCacheLive();
    if (prevA !== undefined) process.env.ANTHROPIC_API_KEY = prevA;
    if (prevO !== undefined) process.env.OPENAI_API_KEY = prevO;
    expect(report.status).toBe("NOT_MEASURED");
    expect(report.reason).toBe("no_vendor_api_key_in_environment");
  });
});
