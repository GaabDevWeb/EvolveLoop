/**
 * V22-GOAL-002 — truth-source tiers and provenance for project knowledge runtime.
 * Authority order: code > .ai/ (non-obsolete) > vault > INFERRED.
 */

/** Lower numeric rank = higher authority (wins on conflict). */
export const TRUTH_TIER_RANK: Record<TruthSourceTier, number> = {
  code: 0,
  ai: 1,
  vault: 2,
  inferred: 3,
};

export type TruthSourceTier = "code" | "ai" | "vault" | "inferred";

export type AiPageStatus = "atual" | "obsoleto" | "draft" | "unknown";

export interface KnowledgeProvenance {
  /** Path, URI, or stable locator (required for acceptance). */
  source_ref: string;
  /** Optional content fingerprint (SHA-256 hex or similar). */
  content_hash?: string;
  /** When tier is inferred — EXTRACTED may be cited; INFERRED never overrides code. */
  edge_kind?: "extracted" | "inferred";
}

export interface TruthSourcedItem {
  /** Stable key for conflict resolution (e.g. decision id, symbol id). */
  topic_key: string;
  tier: TruthSourceTier;
  provenance: KnowledgeProvenance;
  excerpt?: string;
  ai_status?: AiPageStatus;
  /** Set when a lower-tier item is dropped in favour of a higher-tier one. */
  superseded?: boolean;
  rejection_reason?: string;
}

export interface TruthFenceResult {
  accepted: TruthSourcedItem[];
  rejected: TruthSourcedItem[];
}

export interface ProjectIsolationReport {
  foreign_canary: string;
  leak_count: number;
  ok: boolean;
}
