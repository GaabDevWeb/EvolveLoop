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
  /** Project root for truth-source fence (V22-GOAL-002). When set, applies tier + provenance gate. */
  projectRoot?: string;
}

export async function knowledgeSearch(
  query: string,
  options?: KnowledgeSearchOptions,
): Promise<EvidenceSet> {
  const set = await resolveKnowledgeBackend().search(query);
  if (!options?.projectRoot) return set;
  return fenceEvidenceSet(set, options.projectRoot).evidence;
}

export async function knowledgeInspect(
  query = "",
): Promise<KnowledgeInspectResult> {
  return resolveKnowledgeBackend().inspect(query);
}
