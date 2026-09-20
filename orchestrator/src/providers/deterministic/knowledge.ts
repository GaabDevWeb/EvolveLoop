/**
 * Deterministic knowledge.* capability handlers.
 * Core entry: resolve KnowledgeBackend (default Wiki) — no personal paths here.
 */

import type { EvidenceSet } from "../../capabilities/results.js";
import { resolveKnowledgeBackend } from "../../knowledge/backend/resolve.js";
import type { KnowledgeInspectResult } from "../../knowledge/backend/types.js";

/** @deprecated Prefer WikiKnowledgeBackend via resolveKnowledgeBackend */
export {
  resolveWikiRoot,
  resolveWikiCliModule,
} from "../../knowledge/backend/wiki-backend.js";

export async function knowledgeSearch(query: string): Promise<EvidenceSet> {
  return resolveKnowledgeBackend().search(query);
}

export async function knowledgeInspect(
  query = "",
): Promise<KnowledgeInspectResult> {
  return resolveKnowledgeBackend().inspect(query);
}
