/**
 * V22-GOAL-010-vendor — parse provider-reported prompt cache usage (no simulated hits).
 */

export type LlmVendorId = "anthropic" | "openai" | "openrouter";

export interface VendorCacheUsage {
  vendor: LlmVendorId;
  input_tokens: number | null;
  output_tokens: number | null;
  /** Anthropic: tokens read from cache on this request. */
  cache_read_input_tokens: number;
  /** Anthropic: tokens written to cache on this request. */
  cache_creation_input_tokens: number;
  /** OpenAI: usage.prompt_tokens_details.cached_tokens */
  openai_cached_prompt_tokens: number;
  /** True when provider reports a cache read on this response. */
  vendor_cache_hit: boolean;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function parseAnthropicCacheUsage(body: unknown): VendorCacheUsage {
  const usage =
    body && typeof body === "object" && "usage" in body
      ? (body as { usage?: Record<string, unknown> }).usage
      : undefined;
  const cache_read = num(usage?.cache_read_input_tokens);
  const cache_create = num(usage?.cache_creation_input_tokens);
  return {
    vendor: "anthropic",
    input_tokens: usage ? num(usage.input_tokens) : null,
    output_tokens: usage ? num(usage.output_tokens) : null,
    cache_read_input_tokens: cache_read,
    cache_creation_input_tokens: cache_create,
    openai_cached_prompt_tokens: 0,
    vendor_cache_hit: cache_read > 0,
  };
}

export function parseOpenAiCacheUsage(body: unknown): VendorCacheUsage {
  const usage =
    body && typeof body === "object" && "usage" in body
      ? (body as { usage?: Record<string, unknown> }).usage
      : undefined;
  const details =
    usage && typeof usage.prompt_tokens_details === "object"
      ? (usage.prompt_tokens_details as Record<string, unknown>)
      : undefined;
  const cached = num(details?.cached_tokens);
  return {
    vendor: "openai",
    input_tokens: usage ? num(usage.prompt_tokens) : null,
    output_tokens: usage ? num(usage.completion_tokens) : null,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    openai_cached_prompt_tokens: cached,
    vendor_cache_hit: cached > 0,
  };
}

export interface OpenRouterUsage extends VendorCacheUsage {
  cost_usd: number | "NOT_MEASURED";
}

/** OpenAI-compatible usage plus OpenRouter `usage.cost`. Missing cost stays NOT_MEASURED. */
export function parseOpenRouterUsage(body: unknown): OpenRouterUsage {
  const base = parseOpenAiCacheUsage(body);
  const usage =
    body && typeof body === "object" && "usage" in body
      ? (body as { usage?: Record<string, unknown> }).usage
      : undefined;
  const cost = usage?.cost;
  return {
    ...base,
    vendor: "openrouter",
    cost_usd: typeof cost === "number" && Number.isFinite(cost) ? cost : "NOT_MEASURED",
  };
}
