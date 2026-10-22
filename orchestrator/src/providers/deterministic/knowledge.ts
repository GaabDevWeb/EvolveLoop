/**
 * Deterministic knowledge.* capability handlers.
 * Core entry: resolve KnowledgeBackend (default Wiki) — no personal paths here.
 */

import type { EvidenceSet } from "../../capabilities/results.js";
import { resolveKnowledgeBackend } from "../../knowledge/backend/resolve.js";
import type { KnowledgeInspectResult } from "../../knowledge/backend/types.js";
import { fenceEvidenceSet } from "../../knowledge/truth-source/runtime.js";

/** @deprecated Prefer WikiKnowledgeBackend via resolveKnowledgeBackend */
export {
  resolveWikiRoot,
  resolveWikiCliModule,
} from "../../knowledge/backend/wiki-backend.js";

export interface KnowledgeSearchOptions {
  /** Project root for truth-source fence (V22-GOAL-002). Defaults to workspace / PROJECT_ROOT / cwd. */
  projectRoot?: string;
  /** When true, skip truth fence (escape hatch for debugging). */
  disableTruthFence?: boolean;
}

/**
 * Opt-out: set `KNOWLEDGE_TRUTH_FENCE=off` or pass `disableTruthFence: true`.
 * Default: fence ON (V22-GOAL-002).
 */
export function isTruthFenceEnabled(explicit?: boolean): boolean {
  if (explicit === false) return false;
  const env = (process.env.KNOWLEDGE_TRUTH_FENCE ?? "on").toLowerCase();
  return env !== "off" && env !== "0" && env !== "false";
}

export function resolveKnowledgeProjectRoot(options?: KnowledgeSearchOptions): string {
  return (
    options?.projectRoot ??
    process.env.PROJECT_ROOT ??
    process.env.WORKSPACE_ROOT ??
    process.cwd()
  );
}

export async function knowledgeSearch(
  query: string,
  options?: KnowledgeSearchOptions,
): Promise<EvidenceSet> {
  const set = await resolveKnowledgeBackend().search(query);
  const hits = set.hits.filter(
    (h) => (h.source ?? "").trim().length > 0 && !/^unknown$/i.test((h.source ?? "").trim()),
  );
  const pruned = hits.length === set.hits.length ? set : { ...set, hits };
  if (!isTruthFenceEnabled(options?.disableTruthFence)) {
    return fenceEvidenceSet(pruned, resolveKnowledgeProjectRoot(options)).evidence;
  }
  return pruned;
}

export async function knowledgeInspect(
  query = "",
  options?: KnowledgeSearchOptions,
): Promise<KnowledgeInspectResult> {
  const base = await resolveKnowledgeBackend().inspect(query);
  if (!isTruthFenceEnabled(options?.disableTruthFence)) {
    const fenced = fenceEvidenceSet(base, resolveKnowledgeProjectRoot(options));
    return { ...base, ...fenced.evidence, backend: base.backend, cli_available: base.cli_available, rag_root: base.rag_root };
  }
  return base;
}
