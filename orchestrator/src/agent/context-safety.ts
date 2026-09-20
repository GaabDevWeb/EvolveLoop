/**
 * Strip FORBIDDEN / SECRET-shaped keys before ReasoningProvider sees context.
 */

import { FORBIDDEN_CONTEXT_KEY_PATTERN } from "./types.js";

export function assertNoForbiddenKeys(
  obj: unknown,
  path = "",
): { ok: true } | { ok: false; path: string; key: string } {
  if (obj == null || typeof obj !== "object") return { ok: true };
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const r = assertNoForbiddenKeys(obj[i], `${path}[${i}]`);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_CONTEXT_KEY_PATTERN.test(k)) {
      return { ok: false, path: path ? `${path}.${k}` : k, key: k };
    }
    if (typeof v === "string" && /^(sk-|ghp_|xox[baprs]-)/i.test(v.trim())) {
      return { ok: false, path: path ? `${path}.${k}` : k, key: k };
    }
    const r = assertNoForbiddenKeys(v, path ? `${path}.${k}` : k);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export function redactForbiddenKeys<T>(obj: T): T {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((x) => redactForbiddenKeys(x)) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_CONTEXT_KEY_PATTERN.test(k)) continue;
    if (typeof v === "string" && /^(sk-|ghp_|xox[baprs]-)/i.test(v.trim())) continue;
    out[k] = redactForbiddenKeys(v);
  }
  return out as T;
}
