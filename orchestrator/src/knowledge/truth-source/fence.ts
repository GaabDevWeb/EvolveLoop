import { isProvenanceComplete, normalizeAiPageStatus, rejectMissingProvenance } from "./provenance.js";
import type { TruthFenceResult, TruthSourcedItem, TruthSourceTier } from "./types.js";
import { TRUTH_TIER_RANK } from "./types.js";

function tierRank(tier: TruthSourceTier): number {
  return TRUTH_TIER_RANK[tier];
}

function isInjectable(item: TruthSourcedItem): boolean {
  if (!isProvenanceComplete(item.provenance)) return false;
  if (item.tier === "ai" && item.ai_status === "obsoleto") return false;
  if (item.tier === "inferred" && item.provenance.edge_kind === "inferred") {
    // INFERRED never substitutes code — still citable as hint when explicitly requested
    return true;
  }
  return true;
}

/**
 * Apply product hierarchy: for each topic_key keep the highest-authority item.
 * Reject items without provenance; demote obsolete .ai/ pages.
 */
export function applyTruthFence(items: TruthSourcedItem[]): TruthFenceResult {
  const rejected: TruthSourcedItem[] = [];
  const candidates: TruthSourcedItem[] = [];

  for (const raw of items) {
    if (raw.tier === "ai") {
      const norm = normalizeAiPageStatus(raw.ai_status, raw.provenance);
      if (!norm.valid) {
        rejected.push({
          ...raw,
          ai_status: norm.status,
          rejection_reason: norm.reason ?? "invalid_ai_page",
        });
        continue;
      }
      raw.ai_status = norm.status;
    }

    if (!isProvenanceComplete(raw.provenance)) {
      rejected.push(rejectMissingProvenance(raw));
      continue;
    }

    if (!isInjectable(raw)) {
      rejected.push({ ...raw, rejection_reason: "obsolete_or_non_injectable" });
      continue;
    }

    candidates.push(raw);
  }

  const winners = new Map<string, TruthSourcedItem>();
  for (const item of candidates) {
    const prev = winners.get(item.topic_key);
    if (!prev) {
      winners.set(item.topic_key, item);
      continue;
    }
    if (tierRank(item.tier) < tierRank(prev.tier)) {
      rejected.push({ ...prev, superseded: true, rejection_reason: "superseded_by_higher_tier" });
      winners.set(item.topic_key, item);
    } else {
      rejected.push({ ...item, superseded: true, rejection_reason: "superseded_by_higher_tier" });
    }
  }

  const accepted = [...winners.values()].sort(
    (a, b) => tierRank(a.tier) - tierRank(b.tier) || a.topic_key.localeCompare(b.topic_key),
  );

  return { accepted, rejected };
}

/** Code divergent from wiki: wiki cannot "fix" code — mark wiki topic as superseded when code exists. */
export function codeOverridesWiki(
  codeItems: TruthSourcedItem[],
  wikiItems: TruthSourcedItem[],
): TruthSourcedItem[] {
  const codeTopics = new Set(codeItems.map((c) => c.topic_key));
  return wikiItems.map((w) =>
    codeTopics.has(w.topic_key)
      ? { ...w, superseded: true, rejection_reason: "code_authority_over_wiki" }
      : w,
  );
}
