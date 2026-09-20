/**
 * Diff as first-class review input — git when available, else content snapshots.
 * Read-only observation; never mutates workspace.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gitDiff } from "../../providers/deterministic/git.js";
import type { DiffFileSummary } from "./types.js";

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function buildDiffSummary(input: {
  workspace_root: string;
  changed_files: string[];
  baseline_contents?: Record<string, string>;
}): DiffFileSummary[] {
  const out: DiffFileSummary[] = [];
  for (const path of input.changed_files) {
    const abs = join(input.workspace_root, path);
    const after = existsSync(abs) ? readFileSync(abs, "utf-8") : undefined;
    const before = input.baseline_contents?.[path];
    let change: DiffFileSummary["change"] = "modified";
    if (before == null && after != null) change = "added";
    else if (before != null && after == null) change = "deleted";
    else if (before === after) change = "unchanged";
    const excerpt =
      after != null
        ? after.slice(0, 400)
        : before != null
          ? before.slice(0, 400)
          : undefined;
    out.push({
      path,
      change,
      before_hash: before != null ? hashContent(before) : undefined,
      after_hash: after != null ? hashContent(after) : undefined,
      excerpt,
    });
  }
  return out;
}

/** Optional git diff excerpt — observation only via existing git.diff helper */
export async function tryGitDiffExcerpt(workspaceRoot: string): Promise<string | undefined> {
  try {
    const r = await gitDiff(workspaceRoot);
    if (r.exit_code === 0 && r.diff_excerpt.trim()) return r.diff_excerpt;
  } catch {
    /* no git */
  }
  return undefined;
}

export function implementationVersionFingerprint(
  executionId: string,
  files: DiffFileSummary[],
): string {
  return hashContent(
    JSON.stringify({
      executionId,
      files: files.map((f) => ({ path: f.path, after: f.after_hash, change: f.change })),
    }),
  );
}
