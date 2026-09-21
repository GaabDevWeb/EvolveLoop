/**
 * Path confinement helpers for deterministic providers.
 *
 * Lexical resolve + realpath for symlink escape.
 * Residual limitation: TOCTOU between check and use without OS sandbox.
 */

import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathEscapesWorkspace } from "../../authority/capability-authority.js";
import { isForbiddenPath } from "../../engineering/scope.js";

export class PathEscapeError extends Error {
  readonly code = "PATH_ESCAPE_DENIED";
  constructor(message: string) {
    super(message);
    this.name = "PathEscapeError";
  }
}

export class ForbiddenPathError extends Error {
  readonly code = "FORBIDDEN_PATH_DENIED";
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenPathError";
  }
}

function assertRealpathWithinRoot(root: string, candidate: string): string {
  const realRoot = realpathSync(root);
  const real = realpathSync(candidate);
  if (!(real === realRoot || real.startsWith(realRoot + "/"))) {
    throw new PathEscapeError(`Symlink escapes workspace: ${candidate}`);
  }
  return real;
}

/**
 * Walk parents until an existing path under the lexical workspace root is found;
 * ensure its realpath stays in root. Stops at workspace root — never treats `/`
 * or `/tmp` as a confinement failure for nested workspaces.
 */
function assertParentChainWithinRoot(root: string, target: string): void {
  const absRoot = resolve(root);
  let realRoot: string;
  try {
    realRoot = realpathSync(absRoot);
  } catch {
    realRoot = absRoot;
  }

  let cur = dirname(target);
  for (let i = 0; i < 64; i++) {
    const underRoot = cur === absRoot || cur.startsWith(absRoot + "/");
    if (!underRoot) {
      return;
    }
    if (existsSync(cur)) {
      try {
        const real = realpathSync(cur);
        if (!(real === realRoot || real.startsWith(realRoot + "/"))) {
          throw new PathEscapeError(`Symlink parent escapes workspace: ${cur}`);
        }
      } catch (e) {
        if (e instanceof PathEscapeError) throw e;
        throw new PathEscapeError(`Cannot verify path confinement: ${cur}`);
      }
      return;
    }
    if (cur === absRoot) return;
    const next = dirname(cur);
    if (next === cur) return;
    cur = next;
  }
}

export function assertWithinWorkspace(workspaceRoot: string, targetPath: string): string {
  if (!workspaceRoot) {
    throw new PathEscapeError("workspace_root_required");
  }
  if (isForbiddenPath(targetPath)) {
    throw new ForbiddenPathError(`Forbidden path: ${targetPath}`);
  }

  const root = resolve(workspaceRoot);
  const resolved = resolve(root, targetPath);

  if (pathEscapesWorkspace(targetPath, workspaceRoot)) {
    throw new PathEscapeError(`Path escapes workspace: ${targetPath}`);
  }

  // Forbidden check on normalized relative form
  const rel = resolved === root ? "." : resolved.slice(root.length + 1);
  if (isForbiddenPath(rel) || isForbiddenPath(resolved)) {
    throw new ForbiddenPathError(`Forbidden path: ${targetPath}`);
  }

  if (existsSync(resolved)) {
    return assertRealpathWithinRoot(root, resolved);
  }

  assertParentChainWithinRoot(root, resolved);
  return resolved;
}

export function resolveWorkspacePath(workspaceRoot: string, relativeOrAbs?: string): string {
  if (!relativeOrAbs) {
    if (!workspaceRoot) throw new PathEscapeError("workspace_root_required");
    return resolve(workspaceRoot);
  }
  return assertWithinWorkspace(workspaceRoot, relativeOrAbs);
}
