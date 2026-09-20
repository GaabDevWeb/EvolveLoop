/**
 * Normalize vendor HTTP/API failures → ReasoningErrorCode (provider-neutral).
 */

import type { ReasoningErrorCode } from "../types.js";
import { HttpTransportError } from "./http-transport.js";

export interface NormalizedProviderError {
  code: ReasoningErrorCode;
  message: string;
}

function extractErrorMessage(bodyJson: unknown, bodyText: string, status: number): string {
  if (bodyJson && typeof bodyJson === "object" && "error" in bodyJson) {
    const err = (bodyJson as { error: unknown }).error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && "message" in err) {
      const m = (err as { message: unknown }).message;
      if (typeof m === "string") return m;
    }
  }
  const slice = bodyText.slice(0, 400);
  return slice || `HTTP ${status}`;
}

export function normalizeProviderHttpError(
  status: number,
  bodyText: string,
  bodyJson: unknown,
): NormalizedProviderError {
  const msg = extractErrorMessage(bodyJson, bodyText, status);

  if (status === 401 || status === 403) {
    return { code: "REASONING_PROVIDER_UNAVAILABLE", message: `Authentication failed: ${msg}` };
  }
  if (status === 408 || status === 504) {
    return { code: "REASONING_TIMEOUT", message: msg };
  }
  if (status === 429) {
    return { code: "REASONING_PROVIDER_UNAVAILABLE", message: `Rate limited: ${msg}` };
  }
  if (status === 413 || /context.*(length|window|overflow)|too large|token/i.test(msg)) {
    return { code: "REASONING_CONTEXT_TOO_LARGE", message: msg };
  }
  if (status >= 500) {
    return { code: "REASONING_PROVIDER_UNAVAILABLE", message: `Server error: ${msg}` };
  }
  if (/refus|content.?filter|safety|policy/i.test(msg)) {
    return { code: "REASONING_REFUSED", message: msg };
  }
  return { code: "REASONING_PROVIDER_UNAVAILABLE", message: msg };
}

export function normalizeTransportException(err: unknown): NormalizedProviderError {
  if (err instanceof HttpTransportError) {
    return {
      code: err.code as ReasoningErrorCode,
      message: err.message,
    };
  }
  return {
    code: "REASONING_PROVIDER_UNAVAILABLE",
    message: err instanceof Error ? err.message : String(err),
  };
}

/** Extract JSON object from model text (strict preference for whole-object parse). */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Empty model response"), {
      code: "REASONING_MALFORMED_OUTPUT" as ReasoningErrorCode,
    });
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw Object.assign(new Error("Model response is not valid JSON"), {
      code: "REASONING_MALFORMED_OUTPUT" as ReasoningErrorCode,
    });
  }
}
