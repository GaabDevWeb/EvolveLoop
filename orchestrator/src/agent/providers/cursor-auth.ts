/**
 * Resolve Cursor API credentials from environment — never log or persist secrets.
 */

export interface CursorAuthResolution {
  ok: true;
  /** Opaque handle — callers must not log this value */
  apiKey: string;
  source: "env:CURSOR_API_KEY" | "options";
}

export type CursorAuthFailure = {
  ok: false;
  code: "CURSOR_AUTH_UNAVAILABLE";
  message: string;
};

export function resolveCursorApiKey(options?: {
  apiKey?: string;
  env?: NodeJS.ProcessEnv;
}): CursorAuthResolution | CursorAuthFailure {
  const env = options?.env ?? process.env;
  const fromOptions = options?.apiKey?.trim();
  if (fromOptions) {
    return { ok: true, apiKey: fromOptions, source: "options" };
  }
  const fromEnv = env.CURSOR_API_KEY?.trim();
  if (fromEnv) {
    return { ok: true, apiKey: fromEnv, source: "env:CURSOR_API_KEY" };
  }
  return {
    ok: false,
    code: "CURSOR_AUTH_UNAVAILABLE",
    message:
      "CURSOR_API_KEY not set — CursorReasoningProvider unavailable (no fake success)",
  };
}

/** Redact any string that looks like a Cursor API key for logs/evidence */
export function redactCursorSecrets(text: string): string {
  return text
    .replace(/cursor_[A-Za-z0-9_-]{8,}/g, "cursor_[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
}
