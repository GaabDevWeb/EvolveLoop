import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LlmHttpProviderAdapter } from "./llm-http-provider-adapter.js";
import type { VendorCacheUsage } from "./vendor-cache-usage.js";

export type VendorLiveProbeStatus = "MEASURED" | "NOT_MEASURED";

export interface VendorLiveProbeReport {
  status: VendorLiveProbeStatus;
  reason?: string;
  vendor?: "anthropic" | "openai";
  call_1?: VendorCacheUsage;
  call_2?: VendorCacheUsage;
  second_call_vendor_cache_hit?: boolean;
}

const STABLE_PREFIX = [
  {
    role: "system" as const,
    content: "EvolveLoop V22 vendor cache probe — stable prefix block v1.",
    cacheable: true,
  },
];

function hasKey(name: string): boolean {
  const v = process.env[name]?.trim();
  return Boolean(v && v.length > 8);
}

export async function probeVendorCacheLive(
  adapter = new LlmHttpProviderAdapter(),
): Promise<VendorLiveProbeReport> {
  if (hasKey("ANTHROPIC_API_KEY")) {
    const apiKey = process.env.ANTHROPIC_API_KEY!.trim();
    const model = process.env.EVOLVELOOP_ANTHROPIC_MODEL?.trim() ?? "claude-3-5-haiku-20241022";
    const memoryRoot = mkdtempSync(join(tmpdir(), "v22-vendor-cache-"));
    const featureId = "vendor-cache-probe";
    const call1 = await adapter.completeAnthropic({
      apiKey,
      model,
      stablePrefixParts: STABLE_PREFIX,
      userMessage: "Reply with exactly: probe-1",
      maxTokens: 16,
      memoryRoot,
      featureId,
      callIndex: 1,
      liveProbe: true,
    });
    const call2 = await adapter.completeAnthropic({
      apiKey,
      model,
      stablePrefixParts: STABLE_PREFIX,
      userMessage: "Reply with exactly: probe-2",
      maxTokens: 16,
      memoryRoot,
      featureId,
      callIndex: 2,
      liveProbe: true,
    });
    return {
      status: "MEASURED",
      vendor: "anthropic",
      call_1: call1.usage,
      call_2: call2.usage,
      second_call_vendor_cache_hit: call2.usage.vendor_cache_hit,
    };
  }

  if (hasKey("OPENAI_API_KEY")) {
    const apiKey = process.env.OPENAI_API_KEY!.trim();
    const model = process.env.EVOLVELOOP_OPENAI_MODEL?.trim() ?? "gpt-4o-mini";
    const memoryRoot = mkdtempSync(join(tmpdir(), "v22-vendor-cache-"));
    const featureId = "vendor-cache-probe";
    const call1 = await adapter.completeOpenAi({
      apiKey,
      model,
      stablePrefixParts: STABLE_PREFIX,
      userMessage: "Reply with exactly: probe-1",
      maxTokens: 16,
      memoryRoot,
      featureId,
      callIndex: 1,
      liveProbe: true,
    });
    const call2 = await adapter.completeOpenAi({
      apiKey,
      model,
      stablePrefixParts: STABLE_PREFIX,
      userMessage: "Reply with exactly: probe-2",
      maxTokens: 16,
      memoryRoot,
      featureId,
      callIndex: 2,
      liveProbe: true,
    });
    return {
      status: "MEASURED",
      vendor: "openai",
      call_1: call1.usage,
      call_2: call2.usage,
      second_call_vendor_cache_hit: call2.usage.vendor_cache_hit,
    };
  }

  return {
    status: "NOT_MEASURED",
    reason: "no_vendor_api_key_in_environment",
  };
}
