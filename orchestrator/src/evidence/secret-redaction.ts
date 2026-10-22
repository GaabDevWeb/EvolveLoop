/**
 * V22-GOAL-007 — minimal secret redaction for evidence and retrieval excerpts.
 * Test canary only — never use real credentials in fixtures.
 */

/** Fixture canary from V22-BENCH plan (not a real secret). */
export const EVIDENCE_SECRET_CANARY = "SUPERSECRETO_NAO_LOGAR";

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\b(?:sk|api)[-_]?[a-zA-Z0-9]{16,}\b/gi,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /(?:^|[\s"'`])([A-Z][A-Z0-9_]{2,}(?:KEY|SECRET|TOKEN|PASSWORD))\s*=\s*[^\s#'"`]+/gm,
];

const SENSITIVE_PATH_RE = /(?:^|\/)(?:\.env(?:\.|$)|mcp\.env|id_rsa|credentials\.json)(?:\/|$)/i;

export interface RedactionOptions {
  /** Additional literal strings to redact (e.g. test canaries). */
  extraCanaries?: string[];
  /** When true, redact path segments that look like secret files. */
  redactSensitivePaths?: boolean;
}

export function redactSecrets(text: string, options?: RedactionOptions): string {
  let out = text;
  for (const re of SECRET_VALUE_PATTERNS) {
    out = out.replace(re, "[REDACTED_SECRET]");
  }
  const canaries = [EVIDENCE_SECRET_CANARY, ...(options?.extraCanaries ?? [])];
  for (const c of canaries) {
    if (!c) continue;
    out = out.split(c).join("[REDACTED_CANARY]");
  }
  if (options?.redactSensitivePaths) {
    out = out.replace(SENSITIVE_PATH_RE, "[REDACTED_PATH]/");
  }
  return out;
}

export function countCanaryOccurrences(text: string, canary: string): number {
  if (!canary) return 0;
  let count = 0;
  let idx = text.indexOf(canary);
  while (idx !== -1) {
    count += 1;
    idx = text.indexOf(canary, idx + canary.length);
  }
  return count;
}

export function assertNoCanaryInPublishedEvidence(
  serialized: string,
  canaries: string[] = [EVIDENCE_SECRET_CANARY],
): { ok: boolean; total: number; hits: Record<string, number> } {
  const hits: Record<string, number> = {};
  let total = 0;
  for (const c of canaries) {
    const n = countCanaryOccurrences(serialized, c);
    hits[c] = n;
    total += n;
  }
  return { ok: total === 0, total, hits };
}

export function sanitizeDeep(value: unknown, options?: RedactionOptions): unknown {
  if (typeof value === "string") return redactSecrets(value, options);
  if (Array.isArray(value)) return value.map((v) => sanitizeDeep(v, options));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeDeep(v, options);
    }
    return out;
  }
  return value;
}
