import { join } from "node:path";
import { writeSanitizedJsonFile } from "../../evidence/evidence-bus.js";
import { assertFeatureIdConfined } from "../../memory/filesystem-memory-store.js";
import type { VendorCacheUsage } from "./vendor-cache-usage.js";
import { computePromptCacheKey, buildStablePromptPrefix } from "../../v22/prompt-cache-http.js";
import type { PromptCachePart } from "../../v22/prompt-cache-http.js";

export const VENDOR_CACHE_TELEMETRY_VERSION =
  "capability-orchestrator.io/v2.2/vendor-cache-telemetry@1";

export interface VendorCacheTelemetryRecord {
  apiVersion: typeof VENDOR_CACHE_TELEMETRY_VERSION;
  recorded_at: string;
  vendor: VendorCacheUsage["vendor"];
  prefix_cache_key_sha256: string;
  usage: VendorCacheUsage;
  call_index?: number;
  live_probe: boolean;
}

export function buildVendorCacheTelemetry(input: {
  vendor: VendorCacheUsage["vendor"];
  usage: VendorCacheUsage;
  stablePrefixParts: PromptCachePart[];
  callIndex?: number;
  liveProbe?: boolean;
}): VendorCacheTelemetryRecord {
  const prefix = buildStablePromptPrefix(input.stablePrefixParts);
  return {
    apiVersion: VENDOR_CACHE_TELEMETRY_VERSION,
    recorded_at: new Date().toISOString(),
    vendor: input.vendor,
    prefix_cache_key_sha256: computePromptCacheKey(prefix),
    usage: input.usage,
    call_index: input.callIndex,
    live_probe: input.liveProbe ?? false,
  };
}

export function persistVendorCacheTelemetry(
  memoryRoot: string,
  featureId: string,
  record: VendorCacheTelemetryRecord,
): string {
  assertFeatureIdConfined(memoryRoot, featureId);
  const path = join(memoryRoot, featureId, "evidence", "vendor-cache-telemetry.json");
  writeSanitizedJsonFile(path, record);
  return path;
}
