/**
 * Map Cursor SDK / CLI errors → EvolveLoop ReasoningErrorCode (no secrets).
 */

import type { ReasoningErrorCode } from "../types.js";
import { redactCursorSecrets } from "./cursor-auth.js";

export function mapCursorError(err: unknown): {
  code: ReasoningErrorCode | string;
  message: string;
} {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  const message = redactCursorSecrets(raw).slice(0, 500);
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: unknown }).name)
      : "";
  const codeField =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : undefined;

  if (
    name.includes("Authentication") ||
    codeField.includes("AUTH") ||
    status === 401 ||
    /api key|unauthorized|401/i.test(message)
  ) {
    return { code: "REASONING_PROVIDER_UNAVAILABLE", message: "Cursor authentication failed" };
  }
  if (name.includes("Network") || /ECONNREFUSED|ENOTFOUND|network/i.test(message)) {
    return { code: "REASONING_PROVIDER_UNAVAILABLE", message: "Cursor network unavailable" };
  }
  if (/timeout|ETIMEDOUT/i.test(message) || codeField.includes("TIMEOUT")) {
    return { code: "REASONING_TIMEOUT", message: "Cursor reasoning timed out" };
  }
  if (/cancel|aborted|AbortError/i.test(message)) {
    return { code: "REASONING_REFUSED", message: "Cursor run cancelled" };
  }
  if (name.includes("Configuration") || /ConfigurationError/i.test(message)) {
    return { code: "REASONING_PROVIDER_UNAVAILABLE", message: `Cursor configuration: ${message}` };
  }
  if (/rate.?limit|429/i.test(message) || status === 429) {
    return { code: "REASONING_PROVIDER_UNAVAILABLE", message: "Cursor rate limited" };
  }
  return { code: "REASONING_PROVIDER_UNAVAILABLE", message };
}

export type CursorStreamEventKind =
  | "CursorRunStarted"
  | "CursorAssistantDelta"
  | "CursorToolActivity"
  | "CursorRunCompleted"
  | "CursorRunFailed"
  | "CursorRunCancelled";

export interface CursorStreamTelemetry {
  kind: CursorStreamEventKind;
  cursor_run_id?: string;
  cursor_agent_id?: string;
  tool_name?: string;
  note?: string;
}
