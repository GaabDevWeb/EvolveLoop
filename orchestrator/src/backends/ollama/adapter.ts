/**
 * Ollama as AgentBackend — thin capability/health facade.
 * Full cognition remains ReasoningProvider (OllamaReasoningProvider).
 * workspace/tool_execution = UNAVAILABLE (ACK: not a full coding agent).
 */

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
import { OllamaReasoningProvider } from "../../agent/providers/ollama-reasoning-provider.js";

export interface OllamaAgentBackendOptions {
  baseUrl?: string;
  model?: string;
  provider?: OllamaReasoningProvider;
}

export class OllamaAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "ollama",
    vendor: "Ollama",
    product: "Ollama local inference",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "PRIMARY",
  };

  private readonly provider: OllamaReasoningProvider;
  private readonly baseUrl: string;

  constructor(options: OllamaAgentBackendOptions = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").replace(
      /\/$/,
      "",
    );
    this.provider =
      options.provider ??
      new OllamaReasoningProvider({
        base_url: this.baseUrl,
        model: options.model ?? process.env.OLLAMA_MODEL ?? "llama3.2",
      });
  }

  capabilities(): BackendCapabilities {
    return defaultCapabilities({
      reasoning: "PROVEN",
      workspace: "UNAVAILABLE",
      tool_execution: "UNAVAILABLE",
      structured_output: "SUPPORTED",
      streaming: "SUPPORTED",
      sessions: "UNAVAILABLE",
      resume: "UNAVAILABLE",
      cancellation: "SUPPORTED",
      local: "PROVEN",
      cloud: "PARTIAL",
      evolveloop_sandbox: "UNAVAILABLE",
    });
  }

  async health(): Promise<BackendHealth> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) {
        return {
          ok: false,
          status: "unavailable",
          message: `ollama HTTP ${res.status}`,
          checked_at: new Date().toISOString(),
        };
      }
      return { ok: true, status: "ready", checked_at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        status: "unavailable",
        message: err instanceof Error ? err.message : "ollama unreachable",
        checked_at: new Date().toISOString(),
      };
    }
  }

  async authenticate(): Promise<BackendAuthResult> {
    return { ok: true };
  }

  async run(request: BackendRunRequest): Promise<BackendRunResult> {
    if (request.mode === "agent_runtime") {
      return {
        ok: false,
        a03_enforcement: "NOT_APPLICABLE",
        error: {
          code: "PERMISSION_DENIED",
          message: "Ollama is ReasoningProvider-only; agent_runtime unsupported",
        },
      };
    }
    const started = Date.now();
    const response = await this.provider.invoke({
      request_id: request.run_id,
      execution_id: request.execution_id,
      agent_id: "ollama-agent-backend",
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
          code: response.error?.code === "REASONING_TIMEOUT" ? "TIMEOUT" : "RUN_FAILED",
          message: response.error?.message ?? "ollama failed",
        },
      };
    }
    return {
      ok: true,
      payload: response.payload,
      a03_enforcement: "PASS",
      usage: { ...response.usage, duration_ms },
    };
  }
}
