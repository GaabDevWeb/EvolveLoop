/**
 * Workspace scope enforcement — path restriction, NOT a sandbox.
 * Sandbox = NOT_IMPLEMENTED.
 */

import { resolve, normalize, relative, isAbsolute } from "node:path";

const FORBIDDEN_DEFAULTS = [
  ".git/config",
  ".git/",
  ".env",
  ".env.local",
  "secrets/",
  "credentials",
  "id_rsa",
];

export function normalizeRel(path: string): string {
  const n = normalize(path.replace(/\\/g, "/")).replace(/^\.\//, "");
  return n;
}

export function pathEscapesRoot(workspaceRoot: string, target: string): boolean {
  const root = resolve(workspaceRoot);
  const abs = isAbsolute(target) ? resolve(target) : resolve(root, target);
  const rel = relative(root, abs);
  return rel.startsWith("..") || isAbsolute(rel);
}

export function pathInScope(path: string, allowed: string[]): boolean {
  if (!allowed.length) return false;
  const norm = normalizeRel(path);
  if (norm.includes("..")) return false;
  return allowed.some((s) => {
    const prefix = s.replace(/\/\*\*$/, "/").replace(/\*$/, "").replace(/\/\*$/, "/");
    if (s.endsWith("/**")) return norm === s.slice(0, -3).replace(/\/$/, "") || norm.startsWith(s.slice(0, -3));
    if (s.endsWith("/*")) return norm.startsWith(prefix) && !norm.slice(prefix.length).includes("/");
    return norm === s || norm.startsWith(prefix.endsWith("/") ? prefix : prefix + "/") || norm.startsWith(s);
  });
}

export function isForbiddenPath(path: string, extra: string[] = []): boolean {
  const norm = normalizeRel(path).toLowerCase();
  const all = [...FORBIDDEN_DEFAULTS, ...extra.map((p) => p.toLowerCase())];
  return all.some((f) => {
    const ff = f.toLowerCase();
    return norm === ff || norm.startsWith(ff) || norm.includes(`/${ff}`) || norm.endsWith(ff);
  });
}

export interface ScopeCheckResult {
  ok: boolean;
  errors: string[];
}

export function assertWorkspaceOpScope(
  path: string,
  opts: {
    workspace_root: string;
    allowed_paths: string[];
    forbidden_paths?: string[];
  },
): ScopeCheckResult {
  const errors: string[] = [];
  const norm = normalizeRel(path);

  if (norm.includes("..") || path.includes("..")) {
    errors.push(`path traversal rejected: ${path}`);
  }
  if (pathEscapesRoot(opts.workspace_root, path)) {
    errors.push(`path escapes workspace: ${path}`);
  }
  if (isForbiddenPath(norm, opts.forbidden_paths)) {
    errors.push(`forbidden path: ${path}`);
  }
  if (!pathInScope(norm, opts.allowed_paths)) {
    errors.push(`path outside task scope: ${path}`);
  }
  return { ok: errors.length === 0, errors };
}
