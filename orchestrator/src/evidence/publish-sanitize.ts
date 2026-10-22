import type { Evidence } from "../types/index.js";
import { redactSecrets, sanitizeDeep } from "./secret-redaction.js";

/**
 * Prepare evidence JSON for persistence under memory/<feature>/evidence/ (V22-GOAL-007).
 */
export function sanitizeEvidenceForPublish(evidence: Evidence): Evidence {
  const clone = sanitizeDeep(evidence) as Evidence;
  if (clone.spec?.payload && typeof clone.spec.payload === "object") {
    const payload = clone.spec.payload as Record<string, unknown>;
    for (const key of ["stdout_excerpt", "stderr_excerpt", "excerpt", "notes"]) {
      if (typeof payload[key] === "string") {
        payload[key] = redactSecrets(String(payload[key]));
      }
    }
  }
  return clone;
}

export function serializeEvidenceForPublish(evidence: Evidence): string {
  return JSON.stringify(sanitizeEvidenceForPublish(evidence), null, 2);
}

/** Any JSON artifact written to jobs-dir / evidence bus / engine reports. */
export function serializeForPublish(data: unknown): string {
  return JSON.stringify(sanitizeDeep(data), null, 2);
}

/** Single-line JSON for JSONL telemetry (no pretty-print). */
export function serializeJsonlForPublish(data: unknown): string {
  return JSON.stringify(sanitizeDeep(data));
}
