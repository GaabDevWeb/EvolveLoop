/**
 * Reasoning mode / provider configuration — external, opt-in live.
 * Default provider remains UNDECIDED; factory never silently promotes live as default runtime path.
 */

import type { ReasoningProvider } from "./types.js";
import { TestReasoningProvider } from "./test-reasoning-provider.js";
import { OllamaReasoningProvider } from "./providers/ollama-reasoning-provider.js";
import { CursorReasoningProvider } from "./providers/cursor-reasoning-provider.js";
import { resolveCursorApiKey } from "./providers/cursor-auth.js";

export type ReasoningMode = "deterministic" | "live";

export interface ReasoningRuntimeConfig {
  mode: ReasoningMode;
  /** Requested adapter id when mode=live — not a global default claim */
  provider_id?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  timeout_ms?: number;
  temperature?: number;
  max_output_tokens?: number;
  cursor_model?: string;
  cursor_execution_mode?: "reasoning_only" | "agentic_workspace";
  cursor_workspace_cwd?: string;
  cursor_sandbox_enabled?: boolean;
  /** Explicit: architectural default remains undecided */
  default_provider: "UNDECIDED";
}

export function readReasoningConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ReasoningRuntimeConfig {
  const modeRaw = (env.REASONING_MODE ?? "deterministic").toLowerCase();
  const mode: ReasoningMode = modeRaw === "live" ? "live" : "deterministic";
  const cursorModeRaw = (env.CURSOR_EXECUTION_MODE ?? "reasoning_only").toLowerCase();

  return {
    mode,
    provider_id: env.REASONING_PROVIDER?.trim() || undefined,
    ollama_base_url: env.OLLAMA_HOST?.trim() || env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434",
    ollama_model: env.OLLAMA_MODEL?.trim() || env.REASONING_MODEL?.trim() || undefined,
    timeout_ms: env.REASONING_TIMEOUT_MS ? Number(env.REASONING_TIMEOUT_MS) : undefined,
    temperature: env.REASONING_TEMPERATURE ? Number(env.REASONING_TEMPERATURE) : undefined,
    max_output_tokens: env.REASONING_MAX_OUTPUT_TOKENS
      ? Number(env.REASONING_MAX_OUTPUT_TOKENS)
      : undefined,
    cursor_model: env.CURSOR_MODEL?.trim() || env.REASONING_MODEL?.trim() || undefined,
    cursor_execution_mode:
      cursorModeRaw === "agentic_workspace" ? "agentic_workspace" : "reasoning_only",
    cursor_workspace_cwd: env.CURSOR_WORKSPACE_CWD?.trim() || undefined,
    cursor_sandbox_enabled: env.CURSOR_SANDBOX === "1" || env.CURSOR_SANDBOX === "true",
    default_provider: "UNDECIDED",
  };
}

export type CreateReasoningProviderResult =
  | { ok: true; provider: ReasoningProvider; config: ReasoningRuntimeConfig }
  | {
      ok: false;
      code: "REASONING_PROVIDER_UNAVAILABLE" | "LIVE_NOT_CONFIGURED";
      message: string;
      config: ReasoningRuntimeConfig;
    };

/**
 * Create ReasoningProvider from config.
 * - deterministic → TestReasoningProvider (or caller-supplied)
 * - live → concrete adapter when configured; else explicit failure (no silent fallback)
 */
export function createReasoningProvider(
  config: ReasoningRuntimeConfig,
  options?: { deterministic?: ReasoningProvider },
): CreateReasoningProviderResult {
  if (config.mode !== "live") {
    return {
      ok: true,
      provider: options?.deterministic ?? new TestReasoningProvider({ scenario: "valid_plan" }),
      config,
    };
  }

  const id = (config.provider_id ?? "").toLowerCase();
  if (!id) {
    return {
      ok: false,
      code: "LIVE_NOT_CONFIGURED",
      message: "REASONING_MODE=live requires REASONING_PROVIDER=<id> (e.g. cursor|ollama)",
      config,
    };
  }

  if (id === "nonexistent" || id === "none") {
    return {
      ok: false,
      code: "REASONING_PROVIDER_UNAVAILABLE",
      message: `Unknown reasoning provider: ${id}`,
      config,
    };
  }

  if (id === "cursor") {
    const auth = resolveCursorApiKey();
    if (!auth.ok) {
      return {
        ok: false,
        code: "REASONING_PROVIDER_UNAVAILABLE",
        message: auth.message,
        config,
      };
    }
    return {
      ok: true,
      provider: new CursorReasoningProvider({
        model: config.cursor_model ?? "composer-2.5",
        execution_mode: config.cursor_execution_mode ?? "reasoning_only",
        workspace_cwd: config.cursor_workspace_cwd,
        timeout_ms: config.timeout_ms,
        cursor_sandbox_enabled: config.cursor_sandbox_enabled,
        provider_id: "cursor",
      }),
      config,
    };
  }

  if (id === "ollama") {
    if (!config.ollama_model) {
      return {
        ok: false,
        code: "LIVE_NOT_CONFIGURED",
        message: "ollama live mode requires OLLAMA_MODEL or REASONING_MODEL",
        config,
      };
    }
    return {
      ok: true,
      provider: new OllamaReasoningProvider({
        base_url: config.ollama_base_url ?? "http://127.0.0.1:11434",
        model: config.ollama_model,
        timeout_ms: config.timeout_ms,
        temperature: config.temperature,
        max_output_tokens: config.max_output_tokens,
        provider_id: "ollama",
      }),
      config,
    };
  }

  return {
    ok: false,
    code: "REASONING_PROVIDER_UNAVAILABLE",
    message: `Unknown reasoning provider: ${id} (available: cursor, ollama)`,
    config,
  };
}

export async function probeOllamaAvailable(
  baseUrl: string,
  timeout_ms = 3000,
): Promise<{ available: boolean; models: string[] }> {
  try {
    const { httpJson } = await import("./providers/http-transport.js");
    const res = await httpJson({
      url: `${baseUrl.replace(/\/$/, "")}/api/tags`,
      method: "GET",
      timeout_ms,
    });
    if (!res.ok || !res.json || typeof res.json !== "object") {
      return { available: false, models: [] };
    }
    const models = Array.isArray((res.json as { models?: unknown }).models)
      ? ((res.json as { models: Array<{ name?: string }> }).models
          .map((m) => m.name)
          .filter((n): n is string => typeof n === "string"))
      : [];
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}

export async function probeCursorAvailable(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ available: boolean; reason?: string }> {
  const auth = resolveCursorApiKey({ env });
  if (!auth.ok) return { available: false, reason: auth.message };
  try {
    await import("@cursor/sdk");
    return { available: true };
  } catch (e) {
    return { available: false, reason: `@cursor/sdk import failed: ${String(e).slice(0, 120)}` };
  }
}
