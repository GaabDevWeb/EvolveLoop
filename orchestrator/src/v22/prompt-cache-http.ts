/**
 * V22-GOAL-010 — deterministic cacheable prefix + in-process cache metrics (HTTP adapter).
 */

import { createHash } from "node:crypto";
import { isPromptCacheEnabled } from "./feature-flags.js";
import { redactSecrets } from "../evidence/secret-redaction.js";

export interface PromptCachePart {
  role: "system" | "user" | "tool";
  content: string;
  cacheable?: boolean;
}

export interface HttpPromptRequest {
  model: string;
  parts: PromptCachePart[];
  /** Dynamic tail (retrieval, user turn) — never included in stable prefix. */
  dynamic_tail?: string;
  secrets?: string[];
}

export interface HttpPromptResponse {
  text: string;
  cache_key: string;
  cache_hit: boolean;
  cached_prefix_tokens: number;
  uncached_tokens: number;
}

export interface PromptCacheMetrics {
  calls: number;
  hits: number;
  misses: number;
  hit_rate: number;
}

export function buildStablePromptPrefix(parts: PromptCachePart[]): string {
  const cacheable = parts
    .filter((p) => p.cacheable !== false && p.role !== "tool")
    .map((p) => `${p.role}:${redactSecrets(p.content).trim()}`)
    .join("\n---\n");
  return cacheable;
}

export function computePromptCacheKey(prefix: string): string {
  return createHash("sha256").update(prefix, "utf8").digest("hex");
}

export class PromptCacheHttpAdapter {
  private store = new Map<string, string>();
  private hits = 0;
  private misses = 0;
  private calls = 0;

  complete(request: HttpPromptRequest): HttpPromptResponse {
    this.calls += 1;
    const prefix = buildStablePromptPrefix(request.parts);
    const cache_key = computePromptCacheKey(prefix);
    const dynamic = request.dynamic_tail ?? "";
    const uncached_tokens = prefix.split(/\s+/).filter(Boolean).length + dynamic.split(/\s+/).filter(Boolean).length;

    const cachingOn = isPromptCacheEnabled();
    if (cachingOn && this.store.has(cache_key)) {
      this.hits += 1;
      const cached = this.store.get(cache_key)!;
      return {
        text: cached + dynamic,
        cache_key,
        cache_hit: true,
        cached_prefix_tokens: prefix.split(/\s+/).filter(Boolean).length,
        uncached_tokens: dynamic.split(/\s+/).filter(Boolean).length,
      };
    }

    this.misses += 1;
    const synthesized = `[prefix:${cache_key.slice(0, 8)}]${dynamic}`;
    if (cachingOn) {
      this.store.set(cache_key, `[prefix:${cache_key.slice(0, 8)}]`);
    }
    return {
      text: synthesized,
      cache_key,
      cache_hit: false,
      cached_prefix_tokens: 0,
      uncached_tokens,
    };
  }

  metrics(): PromptCacheMetrics {
    const denom = this.hits + this.misses;
    return {
      calls: this.calls,
      hits: this.hits,
      misses: this.misses,
      hit_rate: denom === 0 ? 0 : this.hits / denom,
    };
  }

  reset(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.calls = 0;
  }
}
