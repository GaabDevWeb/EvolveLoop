/**
 * Claude Code AgentBackend — dynamic @anthropic-ai/claude-agent-sdk.
 * Missing package → BACKEND_UNAVAILABLE (no fake live).
 */

import { createRequire } from "node:module";
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

export interface ClaudeCodeAgentBackendOptions {
  runFn?: (prompt: string) => Promise<{ result?: string; text?: string }>;
}

export class ClaudeCodeAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "claude-code",
    vendor: "Anthropic",
    product: "Claude Code Agent SDK",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "SECONDARY",
  };

  constructor(private readonly options: ClaudeCodeAgentBackendOptions = {}) {}

  capabilities(): BackendCapabilities {
    return defaultCapabilities({
      reasoning: "SUPPORTED",
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
      usage: "SUPPORTED",
      local: "SUPPORTED",
      approvals: "SUPPORTED",
      hooks: "SUPPORTED",
      evolveloop_sandbox: "UNAVAILABLE",
    });
  }

  async health(): Promise<BackendHealth> {
    if (this.options.runFn) {
      return { ok: true, status: "ready", checked_at: new Date().toISOString() };
    }
    try {
      const require = createRequire(import.meta.url);
      require.resolve("@anthropic-ai/claude-agent-sdk");
      return { ok: true, status: "ready", checked_at: new Date().toISOString() };
    } catch {
      return {
        ok: false,
        status: "unavailable",
        message: "@anthropic-ai/claude-agent-sdk not installed",
        checked_at: new Date().toISOString(),
      };
    }
  }

  async authenticate(): Promise<BackendAuthResult> {
    if (this.options.runFn) return { ok: true };
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) {
      return {
        ok: false,
        code: "AUTHENTICATION_FAILED",
        message: "ANTHROPIC_API_KEY not set",
      };
    }
    return { ok: true };
  }

  async run(request: BackendRunRequest): Promise<BackendRunResult> {
    if (request.mode === "agent_runtime") {
      return {
        ok: false,
        a03_enforcement: "LIMITED",
        error: {
          code: "PERMISSION_DENIED",
          message: "Claude Code agent_runtime LIMITED for A03 in this adapter",
        },
      };
    }

    const auth = await this.authenticate();
    if (!auth.ok && !this.options.runFn) {
      return {
        ok: false,
        a03_enforcement: "PASS",
        error: { code: auth.code ?? "AUTHENTICATION_FAILED", message: auth.message ?? "auth" },
      };
    }

    try {
      if (this.options.runFn) {
        const out = await this.options.runFn(request.objective);
        return {
          ok: true,
          text: out.result ?? out.text,
          payload: out,
          a03_enforcement: "PASS",
        };
      }

      const mod = await import("@anthropic-ai/claude-agent-sdk").catch(() => null);
      const query = mod
        ? (mod as unknown as {
            query: (args: {
              prompt: string;
              options?: Record<string, unknown>;
            }) => AsyncIterable<{ type: string; result?: string; session_id?: string }>;
          }).query
        : undefined;
      if (typeof query !== "function") {
        return {
          ok: false,
          a03_enforcement: "PASS",
          error: {
            code: "BACKEND_UNAVAILABLE",
            message: "claude-agent-sdk query() unavailable",
          },
        };
      }

      let last = "";
      let session_id: string | undefined;
      for await (const message of query({
        prompt: request.objective,
        options: {
          allowedTools: [],
          maxTurns: 1,
          persistSession: false,
        },
      })) {
        if (message.type === "result" && message.result !== undefined) {
          last = String(message.result);
        }
        if (message.session_id) {
          session_id = message.session_id;
        }
      }
      return {
        ok: true,
        text: last,
        a03_enforcement: "PASS",
        session: session_id ? { vendor_session_id: session_id } : undefined,
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

export class MockClaudeCodeAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "claude-code-mock",
    vendor: "Anthropic",
    product: "Claude Code Mock",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "SECONDARY",
  };

  capabilities() {
    return new ClaudeCodeAgentBackend().capabilities();
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
        error: { code: "PERMISSION_DENIED", message: "limited" },
      };
    }
    return { ok: true, text: "mock-claude", a03_enforcement: "PASS" };
  }
}
