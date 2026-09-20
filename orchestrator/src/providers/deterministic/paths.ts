/**
 * Path confinement helpers for deterministic providers.
 */

import { resolve } from "node:path";
import { pathEscapesWorkspace } from "../../authority/capability-authority.js";

export class PathEscapeError extends Error {
  readonly code = "PATH_ESCAPE_DENIED";
  constructor(message: string) {
    super(message);
    this.name = "PathEscapeError";
  }
}

export function assertWithinWorkspace(workspaceRoot: string, targetPath: string): string {
  const root = resolve(workspaceRoot);
  const resolved = resolve(root, targetPath);
  if (pathEscapesWorkspace(targetPath, workspaceRoot)) {
    throw new PathEscapeError(`Path escapes workspace: ${targetPath}`);
  }
  return resolved;
}

export function resolveWorkspacePath(workspaceRoot: string, relativeOrAbs?: string): string {
  if (!relativeOrAbs) return resolve(workspaceRoot);
  return assertWithinWorkspace(workspaceRoot, relativeOrAbs);
}
