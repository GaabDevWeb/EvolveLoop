/**
 * Failure classification — retry ≠ repair ≠ replan.
 */

import type { FailureClass, EngineeringValidationResult } from "./types.js";

export function classifyEngineeringFailure(input: {
  error_code?: string;
  validation?: EngineeringValidationResult;
}): { class: FailureClass; action: "retry" | "repair" | "replan" | "fail" | "block" } {
  const code = input.error_code ?? "";
  if (code === "POLICY_BLOCKED" || code === "CONFIRMATION_REQUIRED" || code === "SCOPE_VIOLATION") {
    return { class: code === "SCOPE_VIOLATION" ? "SCOPE_VIOLATION" : "POLICY_BLOCKED", action: "block" };
  }
  if (code === "BUDGET_EXHAUSTED") {
    return { class: "BUDGET_EXHAUSTED", action: "fail" };
  }
  if (code === "TIMEOUT") {
    return { class: "TIMEOUT", action: "retry" };
  }
  if (code === "IMPOSSIBLE_ASSUMPTION" || code === "REQUIRES_REPLAN") {
    return { class: "IMPOSSIBLE_ASSUMPTION", action: "replan" };
  }
  if (input.validation?.completion_decision === "REPAIR") {
    return { class: "TEST_FAILED", action: "repair" };
  }
  if (input.validation?.completion_decision === "REPLAN") {
    return { class: "IMPOSSIBLE_ASSUMPTION", action: "replan" };
  }
  if (input.validation?.completion_decision === "BLOCK") {
    return { class: "POLICY_BLOCKED", action: "block" };
  }
  if (code === "PROVIDER_FAILURE") {
    return { class: "PROVIDER_FAILURE", action: "retry" };
  }
  if (code === "IMPLEMENTATION_INVALID") {
    return { class: "IMPLEMENTATION_INVALID", action: "repair" };
  }
  return { class: "TEST_FAILED", action: "repair" };
}
