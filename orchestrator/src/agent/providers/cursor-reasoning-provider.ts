/**
 * CursorReasoningProvider — ReasoningProvider adapter for @cursor/sdk.
 * Does NOT become a second Runtime. Effects in reasoning_only mode stay with EvolveLoop Worker.
 *
 * Tool authority:
 * - reasoning_only: tools=[] → text JSON only; A03 remains on Worker path (PASS)
 * - agentic_workspace: Cursor may edit cwd; A03 cannot fully gate Cursor-native tools → LIMITED
 *
 * EvolveLoop Sandbox = NOT_IMPLEMENTED (unchanged).
 * Cursor Sandbox = optional local.sandboxOptions (observed separately).
 */

import { extractJsonObject } from "./normalize-errors.js";
import { resolveCursorApiKey, redactCursorSecrets } from "./cursor-auth.js";
import { mapCursorError, type CursorStreamTelemetry } from "./cursor-errors.js";
import {
  buildCursorSystemPrompt,
  buildCursorUserPrompt,
  type CursorExecutionMode,
} from "./cursor-prompt.js";
import type { ReasoningProvider, ReasoningRequest, ReasoningResponse } from "../types.js";

export interface CursorReasoningProviderOptions {
  /** Prefer env CURSOR_API_KEY; optional override (tests only — never commit) */
  apiKey?: string;
  model?: string;
  /** Default reasoning_only */
  execution_mode?: CursorExecutionMode;
  /** Required for agentic_workspace; optional for reasoning_only */
  workspace_cwd?: string;
  timeout_ms?: number;
  provider_id?: string;
  /** Enable Cursor local sandboxOptions (≠ EvolveLoop sandbox) */
  cursor_sandbox_enabled?: boolean;
  /** Injected Agent API for unit tests */
  agentApi?: CursorAgentApi;
  onTelemetry?: (ev: CursorStreamTelemetry) => void;
  env?: NodeJS.ProcessEnv;
}

/** Minimal SDK surface we depend on — keeps rest of EvolveLoop decoupled */
export interface CursorAgentApi {
  prompt(
    message: string,
    options: Record<string, unknown>,
  ): Promise<{
    status: string;
    result?: string;
    id?: string;
    agentId?: string;
    durationMs?: number;
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    error?: { message?: string };
  }>;
}

async function loadDefaultAgentApi(): Promise<CursorAgentApi> {
  const mod = await import("@cursor/sdk");
  const Agent = (mod as { Agent: CursorAgentApi }).Agent;
  if (!Agent?.prompt) {
    throw new Error("@cursor/sdk Agent.prompt unavailable");
  }
  return Agent;
}

export class CursorReasoningProvider implements ReasoningProvider {
  readonly id: string;
  private apiKey?: string;
  private model: string;
  private mode: CursorExecutionMode;
  private cwd?: string;
  private timeout_ms: number;
  private cursorSandbox: boolean;
  private agentApi?: CursorAgentApi;
  private onTelemetry?: CursorReasoningProviderOptions["onTelemetry"];
  private env: NodeJS.ProcessEnv;

  constructor(options: CursorReasoningProviderOptions = {}) {
    this.id = options.provider_id ?? "cursor";
    this.apiKey = options.apiKey;
    this.model = options.model ?? "composer-2.5";
    this.mode = options.execution_mode ?? "reasoning_only";
    this.cwd = options.workspace_cwd;
    this.timeout_ms = options.timeout_ms ?? 300_000;
    this.cursorSandbox = options.cursor_sandbox_enabled ?? false;
    this.agentApi = options.agentApi;
    this.onTelemetry = options.onTelemetry;
    this.env = options.env ?? process.env;
  }

  /** Explicit availability — never fake success when auth missing */
  checkAvailable(): { available: boolean; reason?: string } {
    const auth = resolveCursorApiKey({ apiKey: this.apiKey, env: this.env });
    if (!auth.ok) return { available: false, reason: auth.message };
    if (this.mode === "agentic_workspace" && !this.cwd) {
      return { available: false, reason: "agentic_workspace requires workspace_cwd" };
    }
    return { available: true };
  }

  get execution_mode(): CursorExecutionMode {
    return this.mode;
  }

  get a03_enforcement(): "PASS" | "LIMITED" {
    return this.mode === "reasoning_only" ? "PASS" : "LIMITED";
  }

  async invoke(request: ReasoningRequest): Promise<ReasoningResponse> {
    const started = Date.now();
    const avail = this.checkAvailable();
    if (!avail.available) {
      return {
        ok: false,
        provider_id: this.id,
        model_id: this.model,
        duration_ms: Date.now() - started,
        error: {
          code: "REASONING_PROVIDER_UNAVAILABLE",
          message: avail.reason ?? "Cursor unavailable",
        },
      };
    }

    const auth = resolveCursorApiKey({ apiKey: this.apiKey, env: this.env });
    if (!auth.ok) {
      return {
        ok: false,
        provider_id: this.id,
        model_id: this.model,
        duration_ms: Date.now() - started,
        error: { code: "REASONING_PROVIDER_UNAVAILABLE", message: auth.message },
      };
    }

    const system = buildCursorSystemPrompt(this.mode);
    const user = buildCursorUserPrompt(request);
    const message = `${system}\n\n---\nTASK CONTRACT (JSON):\n${user}\n\nRespond now.`;

    this.onTelemetry?.({ kind: "CursorRunStarted" });

    try {
      const Agent = this.agentApi ?? (await loadDefaultAgentApi());
      const tools = this.mode === "reasoning_only" ? [] : undefined;
      const local: Record<string, unknown> = {
        cwd: this.cwd ?? process.cwd(),
      };
      if (this.cursorSandbox) {
        local.sandboxOptions = { enabled: true };
      }

      const runPromise = Agent.prompt(message, {
        apiKey: auth.apiKey,
        model: { id: this.model },
        local,
        tools,
        // Prefer plan mode for reasoning_only when agentic tools accidentally enabled
        ...(this.mode === "reasoning_only" ? { mode: "plan" } : { mode: "agent" }),
      });

      const timed = await Promise.race([
        runPromise,
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(Object.assign(new Error("Cursor invoke timeout"), { code: "TIMEOUT" })),
            this.timeout_ms,
          );
        }),
      ]);

      if (timed.status === "error" || timed.status === "cancelled") {
        this.onTelemetry?.({
          kind: timed.status === "cancelled" ? "CursorRunCancelled" : "CursorRunFailed",
          cursor_run_id: timed.id,
          cursor_agent_id: timed.agentId,
        });
        return {
          ok: false,
          provider_id: this.id,
          model_id: this.model,
          duration_ms: Date.now() - started,
          error: {
            code:
              timed.status === "cancelled" ? "REASONING_REFUSED" : "REASONING_PROVIDER_UNAVAILABLE",
            message: redactCursorSecrets(timed.error?.message ?? `Cursor run ${timed.status}`),
          },
        };
      }

      const text = (timed.result ?? "").trim();
      if (!text) {
        return {
          ok: false,
          provider_id: this.id,
          model_id: this.model,
          duration_ms: Date.now() - started,
          error: { code: "REASONING_MALFORMED_OUTPUT", message: "Empty Cursor result" },
        };
      }

      let payload: unknown;
      try {
        payload = extractJsonObject(text);
      } catch {
        // Soft wrap: treat free text as FINAL_RESPONSE details (Executor validates further)
        payload = {
          decision_type: "FINAL_RESPONSE",
          reason: "cursor_text_result",
          details: text.slice(0, 50_000),
        };
      }

      this.onTelemetry?.({
        kind: "CursorRunCompleted",
        cursor_run_id: timed.id,
        cursor_agent_id: timed.agentId,
      });

      const usage = timed.usage
        ? {
            input_tokens: timed.usage.inputTokens,
            output_tokens: timed.usage.outputTokens,
            total_tokens: timed.usage.totalTokens,
          }
        : { tokens_unknown: true as const };

      return {
        ok: true,
        payload,
        provider_id: this.id,
        model_id: this.model,
        duration_ms: Date.now() - started,
        usage,
      };
    } catch (err) {
      const mapped = mapCursorError(err);
      this.onTelemetry?.({ kind: "CursorRunFailed", note: mapped.code });
      return {
        ok: false,
        provider_id: this.id,
        model_id: this.model,
        duration_ms: Date.now() - started,
        error: mapped,
      };
    }
  }
}

/** Unit-test double — never used to claim live success */
export class MockCursorReasoningProvider implements ReasoningProvider {
  readonly id = "cursor-mock";
  constructor(
    private readonly payloadFactory: (req: ReasoningRequest) => unknown = () => ({
      decision_type: "FINAL_RESPONSE",
      reason: "mock",
      details: "mock",
    }),
  ) {}

  async invoke(request: ReasoningRequest): Promise<ReasoningResponse> {
    return {
      ok: true,
      payload: this.payloadFactory(request),
      provider_id: this.id,
      model_id: "mock",
      duration_ms: 1,
      usage: { tokens_unknown: true },
    };
  }
}
