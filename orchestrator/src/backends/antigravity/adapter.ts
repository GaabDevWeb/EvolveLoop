/**
 * Antigravity AgentBackend — CLI `agy` headless when present.
 * No TUI scraping. Missing binary → BACKEND_UNAVAILABLE / BLOCKED live.
 */

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
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

export interface AntigravityAgentBackendOptions {
  binaryPath?: string;
  runFn?: (prompt: string) => Promise<{ response?: string; conversation_id?: string }>;
}

export class AntigravityAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "antigravity",
    vendor: "Google",
    product: "Antigravity CLI",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "EXPERIMENTAL",
  };

  constructor(private readonly options: AntigravityAgentBackendOptions = {}) {}

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
      usage: "SUPPORTED",
      local: "SUPPORTED",
      cloud: "SUPPORTED",
      approvals: "SUPPORTED",
      subagents: "SUPPORTED",
      evolveloop_sandbox: "UNAVAILABLE",
    });
  }

  private binary(): string {
    return this.options.binaryPath ?? "agy";
  }

  async health(): Promise<BackendHealth> {
    if (this.options.runFn) {
      return { ok: true, status: "ready", checked_at: new Date().toISOString() };
    }
    const found = await which(this.binary());
    if (!found) {
      return {
        ok: false,
        status: "unavailable",
        message: `agy binary not found (PROGRAMMATIC via CLI only; no fake adapter)`,
        checked_at: new Date().toISOString(),
      };
    }
    return { ok: true, status: "ready", checked_at: new Date().toISOString() };
  }

  async authenticate(): Promise<BackendAuthResult> {
    // Interactive login is vendor-side; we cannot fake it.
    if (this.options.runFn) return { ok: true };
    const h = await this.health();
    if (!h.ok) {
      return { ok: false, code: "BACKEND_UNAVAILABLE", message: h.message };
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
          message: "Antigravity agent_runtime LIMITED for A03 in this adapter",
        },
      };
    }

    if (this.options.runFn) {
      const out = await this.options.runFn(request.objective);
      return {
        ok: true,
        text: out.response,
        payload: out,
        a03_enforcement: "PASS",
        session: out.conversation_id
          ? { vendor_session_id: out.conversation_id }
          : undefined,
      };
    }

    const h = await this.health();
    if (!h.ok) {
      return {
        ok: false,
        a03_enforcement: "PASS",
        error: { code: "BACKEND_UNAVAILABLE", message: h.message ?? "agy missing" },
      };
    }

    try {
      const cwd = request.workspace_roots?.[0] ?? process.cwd();
      const raw = await runAgyJson(this.binary(), request.objective, cwd, request.timeout_ms ?? 300_000);
      return {
        ok: raw.status === "SUCCESS" || !!raw.response,
        text: raw.response,
        payload: raw,
        a03_enforcement: "PASS",
        session: raw.conversation_id
          ? { vendor_session_id: raw.conversation_id }
          : undefined,
        error:
          raw.status && raw.status !== "SUCCESS"
            ? { code: "RUN_FAILED", message: String(raw.error ?? raw.status) }
            : undefined,
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

async function which(bin: string): Promise<boolean> {
  if (bin.includes("/")) {
    try {
      await access(bin, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(":")) {
    try {
      await access(`${dir}/${bin}`, constants.X_OK);
      return true;
    } catch {
      /* continue */
    }
  }
  return false;
}

function runAgyJson(
  bin: string,
  prompt: string,
  cwd: string,
  timeout_ms: number,
): Promise<{ status?: string; response?: string; conversation_id?: string; error?: unknown }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["-p", prompt, "--output-format", "json"], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("TIMEOUT"));
    }, timeout_ms);
    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        const line = stdout.trim().split("\n").filter(Boolean).at(-1) ?? "{}";
        resolve(JSON.parse(line) as {
          status?: string;
          response?: string;
          conversation_id?: string;
          error?: unknown;
        });
      } catch {
        reject(new Error(`invalid agy json (exit ${code}): ${stderr.slice(0, 200)}`));
      }
    });
  });
}

export class MockAntigravityAgentBackend implements AgentBackend {
  readonly identity: AgentBackendIdentity = {
    backend_id: "antigravity-mock",
    vendor: "Google",
    product: "Antigravity Mock",
    adapter_version: "1.0.0",
    contract_version: AGENT_BACKEND_CONTRACT_VERSION,
    classification: "EXPERIMENTAL",
  };
  capabilities() {
    return new AntigravityAgentBackend().capabilities();
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
    return { ok: true, text: "mock-agy", a03_enforcement: "PASS" };
  }
}
