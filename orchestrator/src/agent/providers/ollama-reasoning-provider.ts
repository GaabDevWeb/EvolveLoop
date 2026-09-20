/**
 * OllamaReasoningProvider — isolated adapter (native fetch, no SDK).
 * Produces structured JSON → AgentExecutor validates into AgentDecision.
 * Never executes capabilities.
 */

import type {
  ReasoningProvider,
  ReasoningRequest,
  ReasoningResponse,
  ReasoningUsage,
} from "../types.js";
import { httpJson } from "./http-transport.js";
import {
  extractJsonObject,
  normalizeProviderHttpError,
  normalizeTransportException,
} from "./normalize-errors.js";
import { buildReasoningMessages, REASONING_PROMPT_VERSION } from "./prompt-builder.js";

export interface OllamaReasoningProviderOptions {
  /** Base URL without trailing slash — from env / config, not hardcoded secrets */
  base_url: string;
  model: string;
  timeout_ms?: number;
  temperature?: number;
  /** Maps to Ollama options.num_predict */
  max_output_tokens?: number;
  provider_id?: string;
  /** Injected for tests */
  fetchImpl?: typeof fetch;
}

export class OllamaReasoningProvider implements ReasoningProvider {
  readonly id: string;
  private base_url: string;
  private model: string;
  private timeout_ms: number;
  private temperature: number;
  private max_output_tokens: number;

  constructor(options: OllamaReasoningProviderOptions) {
    this.id = options.provider_id ?? "ollama";
    this.base_url = options.base_url.replace(/\/$/, "");
    this.model = options.model;
    this.timeout_ms = options.timeout_ms ?? 120_000;
    this.temperature = options.temperature ?? 0;
    this.max_output_tokens = options.max_output_tokens ?? 2048;
  }

  async invoke(request: ReasoningRequest): Promise<ReasoningResponse> {
    const started = Date.now();
    const messages = buildReasoningMessages(request);

    // Rough char budget guard — fail closed rather than silent truncate of critical fields
    const approxChars = JSON.stringify(messages).length;
    if (approxChars > 400_000) {
      return {
        ok: false,
        provider_id: this.id,
        model_id: this.model,
        duration_ms: Date.now() - started,
        error: {
          code: "REASONING_CONTEXT_TOO_LARGE",
          message: `Context approximately ${approxChars} chars exceeds adapter limit`,
        },
      };
    }

    try {
      const res = await httpJson({
        url: `${this.base_url}/api/chat`,
        timeout_ms: this.timeout_ms,
        body: {
          model: this.model,
          stream: false,
          format: "json",
          messages,
          options: {
            temperature: this.temperature,
            num_predict: this.max_output_tokens,
          },
        },
      });

      if (!res.ok) {
        const norm = normalizeProviderHttpError(res.status, res.text, res.json);
        return {
          ok: false,
          provider_id: this.id,
          model_id: this.model,
          duration_ms: Date.now() - started,
          error: norm,
        };
      }

      const root = res.json as Record<string, unknown> | null;
      if (!root || typeof root !== "object") {
        return {
          ok: false,
          provider_id: this.id,
          model_id: this.model,
          duration_ms: Date.now() - started,
          error: { code: "REASONING_MALFORMED_OUTPUT", message: "Empty or non-JSON Ollama body" },
        };
      }

      const message = root.message as { content?: string; thinking?: string } | undefined;
      let content = (message?.content ?? "").trim();
      // Never persist thinking/CoT. If content is empty (thinking models), attempt
      // one-shot JSON extraction from thinking for parse only — discard the rest.
      if (!content && typeof message?.thinking === "string" && message.thinking.trim()) {
        try {
          const fromThink = extractJsonObject(message.thinking);
          content = JSON.stringify(fromThink);
        } catch {
          /* keep empty */
        }
      }
      if (!content) {
        return {
          ok: false,
          provider_id: this.id,
          model_id: this.model,
          duration_ms: Date.now() - started,
          error: {
            code: "REASONING_MALFORMED_OUTPUT",
            message: "Model returned empty content (thinking-only responses are rejected)",
          },
        };
      }

      let payload: unknown;
      try {
        payload = extractJsonObject(content);
      } catch (err) {
        return {
          ok: false,
          provider_id: this.id,
          model_id: this.model,
          duration_ms: Date.now() - started,
          error: {
            code: "REASONING_MALFORMED_OUTPUT",
            message: err instanceof Error ? err.message : String(err),
          },
        };
      }

      const usage = usageFromOllama(root);

      return {
        ok: true,
        payload,
        provider_id: this.id,
        model_id: this.model,
        model_version: typeof root.created_at === "string" ? undefined : undefined,
        duration_ms: Date.now() - started,
        usage,
      };
    } catch (err) {
      const norm = normalizeTransportException(err);
      return {
        ok: false,
        provider_id: this.id,
        model_id: this.model,
        duration_ms: Date.now() - started,
        error: norm,
      };
    }
  }
}

function usageFromOllama(root: Record<string, unknown>): ReasoningUsage {
  const prompt = typeof root.prompt_eval_count === "number" ? root.prompt_eval_count : undefined;
  const evalCount = typeof root.eval_count === "number" ? root.eval_count : undefined;
  if (prompt == null && evalCount == null) {
    return { tokens_unknown: true };
  }
  return {
    input_tokens: prompt,
    output_tokens: evalCount,
    total_tokens: (prompt ?? 0) + (evalCount ?? 0),
  };
}

export { REASONING_PROMPT_VERSION };
