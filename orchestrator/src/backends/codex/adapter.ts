/**
 * Codex AgentBackend — dynamic import of @openai/codex-sdk.
 * If package missing or CLI unavailable → BACKEND_UNAVAILABLE (no fake live).
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

export interface CodexAgentBackendOptions {
  /** Injected for tests */
  runFn?: (prompt: string, cwd?: string) => Promise<{ finalResponse?: string; text?: string }>;
  cwd?: string;
}

export class CodexAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "codex",
    vendor: "OpenAI",
    product: "Codex",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "SECONDARY",
  };

  constructor(private readonly options: CodexAgentBackendOptions = {}) {}

  capabilities(): BackendCapabilities {
    return defaultCapabilities({
      reasoning: "SUPPORTED",
      workspace: "SUPPORTED",
      tool_execution: "SUPPORTED",
      structured_output: "SUPPORTED",
      streaming: "SUPPORTED",
      sessions: "SUPPORTED",
      resume: "SUPPORTED",
      cancellation: "PARTIAL",
      sandbox_vendor: "SUPPORTED",
      usage: "PARTIAL",
      local: "SUPPORTED",
      cloud: "PARTIAL",
      approvals: "SUPPORTED",
      evolveloop_sandbox: "UNAVAILABLE",
    });
  }

  async health(): Promise<BackendHealth> {
    if (this.options.runFn) {
      return { ok: true, status: "ready", checked_at: new Date().toISOString() };
    }
    const avail = await this.detectSdk();
    if (!avail.ok) {
      return {
        ok: false,
        status: "unavailable",
        message: avail.message,
        checked_at: new Date().toISOString(),
      };
    }
    return { ok: true, status: "ready", message: "sdk present", checked_at: new Date().toISOString() };
  }

  async authenticate(): Promise<BackendAuthResult> {
    if (this.options.runFn) return { ok: true };
    const key = process.env.CODEX_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      return {
        ok: false,
        code: "AUTHENTICATION_FAILED",
        message: "CODEX_API_KEY or OPENAI_API_KEY not set",
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
          message: "Codex agent_runtime LIMITED for A03; default reasoning_only only in this adapter",
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
        const out = await this.options.runFn(request.objective, request.workspace_roots?.[0]);
        return {
          ok: true,
          text: out.finalResponse ?? out.text,
          payload: out,
          a03_enforcement: "PASS",
        };
      }

      const sdk = await this.loadSdk();
      if (!sdk) {
        return {
          ok: false,
          a03_enforcement: "PASS",
          error: {
            code: "BACKEND_UNAVAILABLE",
            message: "@openai/codex-sdk not installed or failed to load",
          },
        };
      }

      const codex = new sdk.Codex();
      const thread = codex.startThread();
      const turn = await thread.run(request.objective);
      return {
        ok: true,
        text: turn.finalResponse ?? String(turn),
        payload: turn,
        a03_enforcement: "PASS",
        session: { vendor_thread_id: thread.id ?? undefined },
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

  private async detectSdk(): Promise<{ ok: boolean; message?: string }> {
    try {
      await import("@openai/codex-sdk");
      return { ok: true };
    } catch (err) {
      try {
        const require = createRequire(import.meta.url);
        require.resolve("@openai/codex-sdk");
        return { ok: true };
      } catch {
        return {
          ok: false,
          message:
            err instanceof Error
              ? `@openai/codex-sdk unavailable: ${err.message}`
              : "@openai/codex-sdk not installed",
        };
      }
    }
  }

  private async loadSdk(): Promise<{ Codex: new () => CodexClient } | null> {
    try {
      const mod = await import("@openai/codex-sdk");
      return mod as { Codex: new () => CodexClient };
    } catch {
      return null;
    }
  }
}

interface CodexClient {
  startThread(): {
    id?: string;
    run(prompt: string): Promise<{ finalResponse?: string }>;
  };
}

/** Contract-test mock — never live. */
export class MockCodexAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "codex-mock",
    vendor: "OpenAI",
    product: "Codex Mock",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "SECONDARY",
  };
  constructor(private readonly text = "mock-codex") {}
  capabilities() {
    return new CodexAgentBackend().capabilities();
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
    return { ok: true, text: this.text, a03_enforcement: "PASS" };
  }
}
