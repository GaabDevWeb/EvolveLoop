/** PDA roles aligned with gate-bundle.md */
export type PdaRole = "plan" | "exec" | "gate" | "explore" | "critic" | "librarian";

export type ContextSliceKind =
  | "acceptance_criteria"
  | "security_restriction"
  | "evidence"
  | "gate_bundle"
  | "knowledge"
  | "memory"
  | "checkpoint"
  | "working"
  | "generic";

/** Explicit owner for working context within one spawn (ADR-0013). */
export type ContextOwnerId = string;

export interface GateBundleFields {
  parent_cycle_id: string;
  spawn_depth: number;
  max_spawn_depth: number;
  role: PdaRole;
  skill_path?: string;
  knowledge_grounding?: "pending" | "applied" | "skipped_trivial";
  /** Optional — normalized to context_owner_id when absent */
  context_owner_id?: string;
  /** V22-GOAL-006 — aditivo, não obrigatório em bundles legados */
  context_budget?: ContextBudgetLimits;
}

export interface ContextBudgetLimits {
  max_paths?: number;
  max_pages?: number;
  max_tokens?: number;
}

export interface ContextSlice {
  path: string;
  content: string;
  kind: ContextSliceKind;
  /** Lower priority drops first when over budget (except protected kinds). */
  priority: number;
}

export interface ContextRetrievalEntry {
  path: string;
  content: string;
  kind?: ContextSliceKind;
  priority?: number;
}

export interface ContextBudgetTelemetry {
  context_owner_id: ContextOwnerId;
  tokenizer: string;
  tokens_measured: number;
  paths_read: string[];
  pages_read: number;
  slices_kept: number;
  slices_dropped: number;
  redundant_paths_skipped: number;
  budget_limits: ContextBudgetLimits;
  overflow: boolean;
  protected_slices_preserved: number;
  timestamp: string;
}

export interface ContextBudgetApplyResult {
  kept: ContextSlice[];
  dropped: ContextSlice[];
  paths_read: string[];
  context_text: string;
  telemetry: ContextBudgetTelemetry;
}

export interface SpawnContextValidation {
  valid: boolean;
  reason?: string;
  context_owner_id?: ContextOwnerId;
  gate_bundle?: GateBundleFields;
  compaction: CompactionReinjectContractRef;
}

/** Reference shape — full contract in compaction-contract.ts */
export interface CompactionReinjectContractRef {
  status: "NOT_IMPLEMENTED";
  adr: string;
  reinject_allowed: boolean;
}
