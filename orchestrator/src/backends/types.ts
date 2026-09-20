/**
 * AgentBackend contract — coding-agent runtime seam (≠ ReasoningProvider).
 * ADR-AGENT-BACKEND-BOUNDARY.md — grill-me Q2/Q3.
 */

export const AGENT_BACKEND_CONTRACT_VERSION = "1.0.0";

export type BackendErrorCode =
  | "BACKEND_UNAVAILABLE"
  | "AUTHENTICATION_FAILED"
  | "SESSION_FAILED"
  | "RUN_FAILED"
  | "TOOL_FAILED"
  | "TIMEOUT"
  | "CANCELLED"
  | "INVALID_OUTPUT"
  | "PERMISSION_DENIED"
  | "WORKSPACE_UNAVAILABLE"
  | "CONTEXT_ERROR"
  | "RECOVERY_FAILED"
  | "UNKNOWN";

export type BackendEventType =
  | "BACKEND_STARTED"
  | "BACKEND_READY"
  | "BACKEND_TOOL_STARTED"
  | "BACKEND_TOOL_COMPLETED"
  | "BACKEND_OUTPUT"
  | "BACKEND_FAILED"
  | "BACKEND_CANCELLED"
  | "BACKEND_COMPLETED"
  | "BACKEND_RECOVERED";

export type ToolAuthorityMode = "reasoning_only" | "agent_runtime";

export type CapabilityLevel =
  | "PROVEN"
  | "SUPPORTED"
  | "PARTIAL"
  | "LIMITED"
  | "UNAVAILABLE"
  | "UNKNOWN";

export interface BackendCapabilities {
  reasoning: CapabilityLevel;
  workspace: CapabilityLevel;
  tool_execution: CapabilityLevel;
  structured_output: CapabilityLevel;
  streaming: CapabilityLevel;
  sessions: CapabilityLevel;
  resume: CapabilityLevel;
  cancellation: CapabilityLevel;
  custom_tools: CapabilityLevel;
  mcp: CapabilityLevel;
  subagents: CapabilityLevel;
  sandbox_vendor: CapabilityLevel;
  usage: CapabilityLevel;
  local: CapabilityLevel;
  cloud: CapabilityLevel;
  approvals: CapabilityLevel;
  hooks: CapabilityLevel;
  /** EvolveLoop sandbox — always UNAVAILABLE until implemented */
  evolveloop_sandbox: CapabilityLevel;
}

export interface AgentBackendIdentity {
  backend_id: string;
  vendor: string;
  product: string;
  adapter_version: string;
  contract_version: string;
  classification: "PRIMARY" | "SECONDARY" | "EXPERIMENTAL" | "RESEARCH" | "NOT_RECOMMENDED_FOR_ADAPTER";
}

export interface BackendHealth {
  ok: boolean;
  status: "ready" | "degraded" | "unavailable" | "auth_required";
  message?: string;
  checked_at: string;
}

export interface BackendAuthResult {
  ok: boolean;
  code?: BackendErrorCode;
  message?: string;
}

export interface BackendSessionRef {
  /** Vendor-local only — NEVER canonical EvolveLoop state */
  vendor_session_id?: string;
  vendor_thread_id?: string;
  vendor_run_id?: string;
}

export interface BackendRunRequest {
  run_id: string;
  execution_id: string;
  task_id: string;
  objective: string;
  mode: ToolAuthorityMode;
  workspace_roots?: string[];
  /** Sanitized context — no secrets */
  context?: Record<string, unknown>;
  model_id?: string;
  timeout_ms?: number;
  session?: BackendSessionRef;
}

export interface BackendUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  tokens_unknown?: boolean;
  duration_ms?: number;
}

export interface BackendRunResult {
  ok: boolean;
  /** Structured payload when reasoning/decision expected */
  payload?: unknown;
  text?: string;
  session?: BackendSessionRef;
  usage?: BackendUsage;
  /** A03 claim for this run */
  a03_enforcement: "PASS" | "LIMITED" | "NOT_APPLICABLE";
  error?: { code: BackendErrorCode; message: string };
  vendor_event_ids?: string[];
}

export interface BackendEvent {
  type: BackendEventType;
  run_id: string;
  ts: string;
  message?: string;
  vendor_event_id?: string;
  data?: Record<string, unknown>;
}

export interface AgentBackend {
  readonly identity: AgentBackendIdentity;
  capabilities(): BackendCapabilities;
  health(): Promise<BackendHealth>;
  authenticate(): Promise<BackendAuthResult>;
  /** Optional — backends without sessions return empty ref */
  createSession?(workspace_roots?: string[]): Promise<BackendSessionRef>;
  run(request: BackendRunRequest): Promise<BackendRunResult>;
  cancel?(run_id: string): Promise<void>;
  resume?(session: BackendSessionRef, request: BackendRunRequest): Promise<BackendRunResult>;
}

export function defaultCapabilities(overrides: Partial<BackendCapabilities> = {}): BackendCapabilities {
  return {
    reasoning: "UNKNOWN",
    workspace: "UNAVAILABLE",
    tool_execution: "UNAVAILABLE",
    structured_output: "UNKNOWN",
    streaming: "UNAVAILABLE",
    sessions: "UNAVAILABLE",
    resume: "UNAVAILABLE",
    cancellation: "PARTIAL",
    custom_tools: "UNAVAILABLE",
    mcp: "UNAVAILABLE",
    subagents: "UNAVAILABLE",
    sandbox_vendor: "UNAVAILABLE",
    usage: "PARTIAL",
    local: "UNKNOWN",
    cloud: "UNAVAILABLE",
    approvals: "UNAVAILABLE",
    hooks: "UNAVAILABLE",
    evolveloop_sandbox: "UNAVAILABLE",
    ...overrides,
  };
}
