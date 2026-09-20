/**
 * Failure disposition — distinct from NodeFailed telemetry.
 * Retry ≠ Replan ≠ Fatal ≠ Policy bypass.
 */

export type FailureDisposition =
  | "RETRYABLE"
  | "FALLBACKABLE"
  | "REPLANABLE"
  | "FATAL"
  | "POLICY_BLOCKED"
  | "BUDGET_BLOCKED"
  | "HUMAN_REQUIRED";

export interface FailureClassification {
  disposition: FailureDisposition;
  failure_class: string;
  error_code?: string;
  reason: string;
}

const POLICY_CODES = new Set([
  "AUTHORITY_DENIED",
  "CONFIRMATION_REQUIRED",
  "POLICY_DENIED",
  "POLICY_BLOCKED",
  "GATE_DENIED",
  "CAPABILITY_DENIED",
  "GROUNDING_REQUIRED",
  "WORKSPACE_DENIED",
]);

const BUDGET_CODES = new Set([
  "BUDGET_EXCEEDED",
  "RETRY_BUDGET_EXCEEDED",
  "REPLAN_BUDGET_EXCEEDED",
  "REPLAN_EXHAUSTED",
  "TIMEOUT",
  "EXECUTION_TIMEOUT",
  "COST_BUDGET_EXCEEDED",
  "TOKEN_BUDGET_EXCEEDED",
  "FAIL_FAST",
  "PROVIDER_FALLBACK_EXHAUSTED",
  "MAX_ITERATIONS",
]);

const REPLANABLE_CODES = new Set([
  "PROVIDER_UNAVAILABLE",
  "EXECUTOR_UNAVAILABLE",
  "NO_PROVIDER",
  "JOB_FAILED",
]);

const RETRYABLE_CODES = new Set([
  "MOCK_FAILURE",
  "EXECUTOR_TIMEOUT",
  "EXECUTOR_FAILED",
  "NETWORK_ERROR",
  "TIMEOUT",
]);

const HUMAN_CODES = new Set(["JOB_PENDING", "CONFIRMATION_REQUIRED"]);

export function classifyFailure(input: {
  blocked_reason?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}): FailureClassification {
  const code = (input.error_code ?? "").toUpperCase();
  const blocked = input.blocked_reason ?? "";
  const msg = `${input.error_message ?? ""} ${blocked}`.toLowerCase();

  if (
    POLICY_CODES.has(code) ||
    POLICY_CODES.has(blocked.toUpperCase()) ||
    blocked.includes("AUTHORITY_DENIED") ||
    blocked.includes("GATE_DENIED") ||
    blocked.includes("CAPABILITY_DENIED") ||
    blocked.includes("GROUNDING_REQUIRED") ||
    blocked.includes("policy")
  ) {
    return {
      disposition: "POLICY_BLOCKED",
      failure_class: "policy_blocked",
      error_code: code || blocked || undefined,
      reason: "Policy/authority denial — replan must not bypass",
    };
  }

  if (
    BUDGET_CODES.has(code) ||
    BUDGET_CODES.has(blocked.toUpperCase()) ||
    blocked === "max_iterations" ||
    blocked.includes("BUDGET") ||
    blocked.includes("TIMEOUT") ||
    blocked === "FAIL_FAST"
  ) {
    return {
      disposition: "BUDGET_BLOCKED",
      failure_class: "budget_blocked",
      error_code: code || blocked || undefined,
      reason: "Resource/recovery budget exhausted — stop without infinite recovery",
    };
  }

  if (
    HUMAN_CODES.has(code) ||
    blocked === "awaiting_external_jobs" ||
    blocked === "deadlock_or_waiting_external"
  ) {
    return {
      disposition: "HUMAN_REQUIRED",
      failure_class: "human_required",
      error_code: code || undefined,
      reason: "External/human completion required",
    };
  }

  if (
    REPLANABLE_CODES.has(code) ||
    blocked === "unrecoverable_failure" ||
    msg.includes("no provider for capability") ||
    code === "PROVIDER_UNAVAILABLE"
  ) {
    return {
      disposition: "REPLANABLE",
      failure_class: "provider_or_capability_failure",
      error_code: code || "PROVIDER_UNAVAILABLE",
      reason: "Structural provider/capability failure — candidate for replan",
    };
  }

  if (RETRYABLE_CODES.has(code) || blocked.startsWith("dod_failed:")) {
    return {
      disposition: "RETRYABLE",
      failure_class: "transient_or_dod",
      error_code: code || undefined,
      reason: "Transient failure / DoD — prefer retry before replan",
    };
  }

  if (blocked === "max_iterations" || blocked === "REPLAN_EXHAUSTED" || blocked === "NO_PROGRESS") {
    return {
      disposition: "FATAL",
      failure_class: "exhausted",
      error_code: blocked,
      reason: "Budgets exhausted",
    };
  }

  if (blocked === "unrecoverable_failure") {
    return {
      disposition: "REPLANABLE",
      failure_class: "unrecoverable_after_retries",
      error_code: code || undefined,
      reason: "Retries exhausted — replan may change strategy",
    };
  }

  return {
    disposition: "REPLANABLE",
    failure_class: "unclassified_structural",
    error_code: code || undefined,
    reason: `Default replanable: ${blocked || code || "unknown"}`,
  };
}
