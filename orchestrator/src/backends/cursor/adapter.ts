/**
 * Cursor AgentBackend — incremental facade over SE-08 CursorReasoningProvider.
 * Default mode: reasoning_only (A03 PASS via Worker path).
 * agent_runtime: A03 LIMITED (vendor tools).
 */

import { CursorReasoningProvider } from "../../agent/providers/cursor-reasoning-provider.js";
import { resolveCursorApiKey } from "../../agent/providers/cursor-auth.js";
import type {
  AgentBackend,
  AgentBackendIdentity,
  BackendAuthResult,
  BackendCapabilities,
  BackendHealth,
  BackendRunRequest,
  BackendRunResult,
} from "../types.js";
import { AGENT_BACKEND_CONTRACT_VERSION, defaultCapabilities } from "../types.js";

export interface CursorAgentBackendOptions {
  provider?: CursorReasoningProvider;
  apiKey?: string;
}

export class CursorAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "cursor",
    vendor: "Anysphere",
    product: "Cursor Agent SDK",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "PRIMARY",
  };

  private readonly provider: CursorReasoningProvider;
  private readonly apiKey?: string;

  constructor(options: CursorAgentBackendOptions = {}) {
    this.apiKey = options.apiKey;
    this.provider =
      options.provider ??
      new CursorReasoningProvider({
        apiKey: options.apiKey,
        execution_mode: "reasoning_only",
      });
  }

  capabilities(): BackendCapabilities {
    return defaultCapabilities({
      reasoning: "PROVEN",
      workspace: "SUPPORTED",
      tool_execution: "SUPPORTED",
      structured_output: "PARTIAL",
      streaming: "SUPPORTED",
      sessions: "SUPPORTED",
      resume: "SUPPORTED",
      cancellation: "SUPPORTED",
      custom_tools: "SUPPORTED",
      mcp: "SUPPORTED",
      subagents: "SUPPORTED",
      sandbox_vendor: "PARTIAL",
      usage: "PARTIAL",
      local: "SUPPORTED",
      cloud: "SUPPORTED",
      approvals: "PARTIAL",
      hooks: "SUPPORTED",
      evolveloop_sandbox: "UNAVAILABLE",
    });
  }

  async health(): Promise<BackendHealth> {
    const auth = resolveCursorApiKey({ apiKey: this.apiKey });
    if (!auth.ok) {
      return {
        ok: false,
        status: "auth_required",
        message: auth.message ?? "CURSOR_API_KEY required",
        checked_at: new Date().toISOString(),
      };
    }
    return { ok: true, status: "ready", checked_at: new Date().toISOString() };
  }

  async authenticate(): Promise<BackendAuthResult> {
    const auth = resolveCursorApiKey({ apiKey: this.apiKey });
    if (!auth.ok) {
      return { ok: false, code: "AUTHENTICATION_FAILED", message: auth.message };
    }
    return { ok: true };
  }

  async run(request: BackendRunRequest): Promise<BackendRunResult> {
    const auth = await this.authenticate();
    if (!auth.ok) {
      return {
        ok: false,
        a03_enforcement: request.mode === "reasoning_only" ? "PASS" : "LIMITED",
        error: { code: auth.code ?? "AUTHENTICATION_FAILED", message: auth.message ?? "auth failed" },
      };
    }

    if (request.mode === "agent_runtime") {
      // Explicit LIMITED — vendor tools bypass EvolveLoop Runtime (ADR / ACK Q3).
      return {
        ok: false,
        a03_enforcement: "LIMITED",
        error: {
          code: "PERMISSION_DENIED",
          message:
            "Cursor agent_runtime mode is LIMITED for A03; use reasoning_only or EngineeringWorker path",
        },
      };
    }

    const started = Date.now();
    try {
      const response = await this.provider.invoke({
        request_id: request.run_id,
        execution_id: request.execution_id,
        agent_id: "cursor-agent-backend",
        objective: request.objective,
        decision_mode: "ANSWER",
        context: request.context ?? {},
      });
      const duration_ms = Date.now() - started;
      if (!response.ok) {
        return {
          ok: false,
          a03_enforcement: "PASS",
          usage: { ...response.usage, duration_ms },
          error: {
            code: mapReasoningToBackend(response.error?.code),
            message: response.error?.message ?? "cursor run failed",
          },
        };
      }
      return {
        ok: true,
        payload: response.payload,
        a03_enforcement: "PASS",
        usage: { ...response.usage, duration_ms },
      };
    } catch (err) {
      return {
        ok: false,
        a03_enforcement: "PASS",
        error: {
          code: "RUN_FAILED",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }
}

function mapReasoningToBackend(code?: string): BackendRunResult["error"] extends infer E
  ? E extends { code: infer C }
    ? C
    : never
  : never {
  switch (code) {
    case "REASONING_PROVIDER_UNAVAILABLE":
      return "BACKEND_UNAVAILABLE";
    case "REASONING_TIMEOUT":
      return "TIMEOUT";
    case "REASONING_MALFORMED_OUTPUT":
    case "REASONING_SCHEMA_ERROR":
      return "INVALID_OUTPUT";
    case "REASONING_CONTEXT_TOO_LARGE":
      return "CONTEXT_ERROR";
    case "REASONING_REFUSED":
      return "PERMISSION_DENIED";
    default:
      return "RUN_FAILED";
  }
}

/** Mock backend for contract tests — never claims live. */
export class MockCursorAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "cursor-mock",
    vendor: "Anysphere",
    product: "Cursor Mock",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "PRIMARY",
  };

  constructor(private readonly decision: unknown = { ok: true }) {}

  capabilities(): BackendCapabilities {
    return new CursorAgentBackend().capabilities();
  }

  async health(): Promise<BackendHealth> {
    return { ok: true, status: "ready", checked_at: new Date().toISOString() };
  }

  async authenticate(): Promise<BackendAuthResult> {
    return { ok: true };
  }

  async run(request: BackendRunRequest): Promise<BackendRunResult> {
    if (request.mode === "agent_runtime") {
      return {
        ok: false,
        a03_enforcement: "LIMITED",
        error: { code: "PERMISSION_DENIED", message: "mock agent_runtime LIMITED" },
      };
    }
    return { ok: true, payload: this.decision, a03_enforcement: "PASS" };
  }
}
