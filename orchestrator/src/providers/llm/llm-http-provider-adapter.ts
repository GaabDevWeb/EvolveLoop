/**
 * V22-GOAL-010-vendor — HTTP LLM provider adapter with vendor cache_control + usage parse.
 */

import type { PromptCachePart } from "../../v22/prompt-cache-http.js";
import { buildStablePromptPrefix } from "../../v22/prompt-cache-http.js";
import { redactSecrets } from "../../evidence/secret-redaction.js";
import {
  parseAnthropicCacheUsage,
  parseOpenAiCacheUsage,
  parseOpenRouterUsage,
  type OpenRouterUsage,
  type VendorCacheUsage,
} from "./vendor-cache-usage.js";
import {
  cursorAgentArgs,
  parseCursorAgentNdjson,
  spawnCursorAgent,
  type CursorAgentSpawn,
  type CursorCliMeasurement,
} from "./cursor-agent-provider.js";
import {
  buildVendorCacheTelemetry,
  persistVendorCacheTelemetry,
  type VendorCacheTelemetryRecord,
} from "./vendor-cache-telemetry.js";

export type FetchFn = typeof fetch;

export interface LlmAdapterResult {
  text: string;
  raw: unknown;
  usage: VendorCacheUsage;
  telemetry: VendorCacheTelemetryRecord;
}

export interface AnthropicCompleteInput {
  apiKey: string;
  model: string;
  stablePrefixParts: PromptCachePart[];
  userMessage: string;
  maxTokens?: number;
  featureId?: string;
  memoryRoot?: string;
  callIndex?: number;
  liveProbe?: boolean;
}

export interface OpenAiCompleteInput {
  apiKey: string;
  model: string;
  stablePrefixParts: PromptCachePart[];
  userMessage: string;
  maxTokens?: number;
  featureId?: string;
  memoryRoot?: string;
  callIndex?: number;
  liveProbe?: boolean;
}

export function buildAnthropicMessagesBody(input: {
  model: string;
  stablePrefixParts: PromptCachePart[];
  userMessage: string;
  maxTokens?: number;
}): Record<string, unknown> {
  const stableText = buildStablePromptPrefix(input.stablePrefixParts);
  return {
    model: input.model,
    max_tokens: input.maxTokens ?? 64,
    system: [
      {
        type: "text",
        text: stableText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: redactSecrets(input.userMessage) }],
  };
}

export function buildOpenRouterChatBody(input: {
  model: string;
  stablePrefix: string;
  userMessage: string;
  maxTokens?: number;
}): Record<string, unknown> {
  const stableText = input.stablePrefix;
  const anthropic = input.model.startsWith("anthropic/");
  return {
    model: input.model,
    max_tokens: input.maxTokens ?? 300,
    messages: [
      {
        role: "system",
        content: anthropic
          ? [{ type: "text", text: stableText, cache_control: { type: "ephemeral" } }]
          : stableText,
      },
      { role: "user", content: redactSecrets(input.userMessage) },
    ],
  };
}

/** Retry-After as delta-seconds or HTTP-date. Unparseable values return null. */
export function parseRetryAfterMs(header: string | null, nowMs: number): number | null {
  if (header === null) return null;
  const trimmed = header.trim();
  if (trimmed.length === 0) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.max(0, Number(trimmed) * 1000);
  const dated = Date.parse(trimmed);
  if (Number.isNaN(dated)) return null;
  return Math.max(0, dated - nowMs);
}

export function openRouterRetryDelayMs(header: string | null, attempt: number, nowMs: number): number {
  const parsed = parseRetryAfterMs(header, nowMs);
  if (parsed !== null) return parsed;
  return 1000 * 2 ** Math.max(0, attempt - 1);
}

export function buildOpenAiChatBody(input: {
  model: string;
  stablePrefixParts: PromptCachePart[];
  userMessage: string;
  maxTokens?: number;
}): Record<string, unknown> {
  const stableText = buildStablePromptPrefix(input.stablePrefixParts);
  return {
    model: input.model,
    max_tokens: input.maxTokens ?? 64,
    messages: [
      {
        role: "system",
        content: stableText,
      },
      { role: "user", content: redactSecrets(input.userMessage) },
    ],
  };
}

function extractAnthropicText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const content = (body as { content?: Array<{ type?: string; text?: string }> }).content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!)
    .join("");
}

function extractOpenAiText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const choices = (body as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? "";
}

export class LlmHttpProviderAdapter {
  constructor(private readonly fetchImpl: FetchFn = fetch) {}

  async completeAnthropic(input: AnthropicCompleteInput): Promise<LlmAdapterResult> {
    const body = buildAnthropicMessagesBody(input);
    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const raw = (await res.json()) as unknown;
    if (!res.ok) {
      throw new Error(`anthropic_http_${res.status}`);
    }
    const usage = parseAnthropicCacheUsage(raw);
    const telemetry = buildVendorCacheTelemetry({
      vendor: "anthropic",
      usage,
      stablePrefixParts: input.stablePrefixParts,
      callIndex: input.callIndex,
      liveProbe: input.liveProbe,
    });
    if (input.memoryRoot && input.featureId) {
      persistVendorCacheTelemetry(input.memoryRoot, input.featureId, telemetry);
    }
    return { text: extractAnthropicText(raw), raw, usage, telemetry };
  }

  async completeOpenAi(input: OpenAiCompleteInput): Promise<LlmAdapterResult> {
    const body = buildOpenAiChatBody(input);
    const res = await this.fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const raw = (await res.json()) as unknown;
    if (!res.ok) {
      throw new Error(`openai_http_${res.status}`);
    }
    const usage = parseOpenAiCacheUsage(raw);
    const telemetry = buildVendorCacheTelemetry({
      vendor: "openai",
      usage,
      stablePrefixParts: input.stablePrefixParts,
      callIndex: input.callIndex,
      liveProbe: input.liveProbe,
    });
    if (input.memoryRoot && input.featureId) {
      persistVendorCacheTelemetry(input.memoryRoot, input.featureId, telemetry);
    }
    return { text: extractOpenAiText(raw), raw, usage, telemetry };
  }

  async completeOpenRouter(input: OpenAiCompleteInput & {
    maxTokens?: number;
    maxAttempts?: number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  }): Promise<LlmAdapterResult & { openrouter: OpenRouterUsage }> {
    const body = buildOpenRouterChatBody({
      model: input.model,
      stablePrefix: buildStablePromptPrefix(input.stablePrefixParts),
      userMessage: input.userMessage,
      maxTokens: input.maxTokens,
    });
    const maxAttempts = input.maxAttempts ?? 4;
    const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    const now = input.now ?? Date.now;
    let res: Response | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      res = await this.fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (res.status !== 429 || attempt === maxAttempts) break;
      const wait = openRouterRetryDelayMs(res.headers.get("retry-after"), attempt, now());
      await res.text().catch(() => undefined);
      await sleep(wait);
    }
    if (!res) throw new Error("openrouter_http_missing");
    const rawText = await res.text();
    if (!res.ok) throw new Error(`openrouter_http_${res.status}`);
    let raw: unknown;
    try {
      raw = JSON.parse(rawText) as unknown;
    } catch {
      throw new Error("openrouter_body_invalid");
    }
    const openrouter = parseOpenRouterUsage(raw);
    const telemetry = buildVendorCacheTelemetry({
      vendor: "openrouter",
      usage: openrouter,
      stablePrefixParts: input.stablePrefixParts,
      callIndex: input.callIndex,
      liveProbe: input.liveProbe,
    });
    if (input.memoryRoot && input.featureId) {
      persistVendorCacheTelemetry(input.memoryRoot, input.featureId, telemetry);
    }
    return { text: extractOpenAiText(raw), raw, usage: openrouter, telemetry, openrouter };
  }

  async completeCursorAgent(input: {
    prompt: string;
    model?: string;
    bin?: string;
    cwd: string;
    env: NodeJS.ProcessEnv;
    spawnImpl?: CursorAgentSpawn;
  }): Promise<CursorCliMeasurement> {
    const bin = input.bin ?? "cursor-agent";
    const args = cursorAgentArgs({ model: input.model });
    const spawnImpl = input.spawnImpl ?? spawnCursorAgent;
    const child = await spawnImpl(bin, args, {
      input: input.prompt,
      cwd: input.cwd,
      env: input.env,
    });
    if (child.status !== 0) {
      throw new Error(`cursor_agent_exit_${child.status}`);
    }
    return parseCursorAgentNdjson(child.stdout);
  }
}
