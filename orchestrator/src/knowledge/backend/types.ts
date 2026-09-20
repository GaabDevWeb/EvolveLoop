/**
 * KnowledgeBackend — minimal seam between EvolveLoop core and retrieval implementations.
 * Backend-agnostic: no host paths, no personal identity, no Cursor/Obsidian assumptions.
 *
 * Reuses EvidenceSet from capabilities/results (existing abstraction).
 */

import type { EvidenceSet } from "../../capabilities/results.js";

/** Registered backend ids. Default production backend is always "wiki". */
export type KnowledgeBackendId = "wiki" | "fake";

export interface KnowledgeHealth {
  available: boolean;
  backend: KnowledgeBackendId;
  /** Corpus/root path when applicable — may be empty if unset */
  root?: string;
  error_code?: string | null;
  degraded?: string | null;
}

export interface KnowledgeInspectResult extends EvidenceSet {
  cli_available: boolean;
  /** Backend root / corpus path (empty if missing) */
  rag_root: string;
  backend: KnowledgeBackendId;
}

/**
 * Operations actually used by the deterministic knowledge.* provider today.
 * Keep this surface small — do not mirror the full Wiki CLI.
 */
export interface KnowledgeBackend {
  readonly id: KnowledgeBackendId;
  search(query: string): Promise<EvidenceSet>;
  inspect(query?: string): Promise<KnowledgeInspectResult>;
  health(): Promise<KnowledgeHealth>;
}
