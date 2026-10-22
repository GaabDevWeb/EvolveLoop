import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { isProvenanceComplete } from "./provenance.js";
import type { ProjectIsolationReport, TruthSourcedItem } from "./types.js";

export function normalizeProjectRoot(projectRoot: string): string {
  return resolve(projectRoot);
}

/** Stable scope id — one project root = one `.ai/` = one optional graph cache namespace. */
export function projectScopeId(projectRoot: string): string {
  const normalized = normalizeProjectRoot(projectRoot);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function scopedGraphCacheDir(baseDataDir: string, projectRoot: string): string {
  return `${baseDataDir.replace(/\/$/, "")}/graph-cache/${projectScopeId(projectRoot)}`;
}

export function serializeInjectionBundle(items: TruthSourcedItem[]): string {
  return JSON.stringify(
    items.map((i) => ({
      topic_key: i.topic_key,
      tier: i.tier,
      source_ref: i.provenance.source_ref,
      content_hash: i.provenance.content_hash,
      excerpt: i.excerpt,
    })),
  );
}

/**
 * Scenario 12 — foreign project canary must not appear in another project's bundle.
 */
export function detectCrossProjectLeakage(
  foreignCanary: string,
  targetBundleText: string,
): ProjectIsolationReport {
  if (!foreignCanary) {
    return { foreign_canary: foreignCanary, leak_count: 0, ok: true };
  }
  let leak_count = 0;
  let idx = targetBundleText.indexOf(foreignCanary);
  while (idx !== -1) {
    leak_count += 1;
    idx = targetBundleText.indexOf(foreignCanary, idx + foreignCanary.length);
  }
  return { foreign_canary: foreignCanary, leak_count, ok: leak_count === 0 };
}

export function filterItemsToProjectScope(
  items: TruthSourcedItem[],
  projectRoot: string,
): TruthSourcedItem[] {
  const scope = projectScopeId(projectRoot);
  const prefix = normalizeProjectRoot(projectRoot);
  return items.filter((item) => {
    const ref = item.provenance.source_ref;
    // Vault (WIKI_ROOT) is out-of-tree; provenance is the gate, not path prefix.
    if (item.tier === "vault") return isProvenanceComplete(item.provenance);
    if (ref.includes(scope)) return true;
    if (ref.startsWith(prefix)) return true;
    if (item.tier === "code" || item.tier === "ai") {
      return ref.startsWith(".ai/") || ref.startsWith(prefix);
    }
    return ref.startsWith(prefix);
  });
}
