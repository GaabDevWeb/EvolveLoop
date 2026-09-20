/**
 * Longitudinal extensions — Observation, lifecycle, outcomes, windows.
 * Complements types.ts without breaking episodic APIs.
 */

import type {
  CandidateType,
  Confidence,
  EvolutionScopeClass,
  EvolutionScopeKind,
  NeedCandidate,
  NeedSignal,
  PatternKind,
  RootCauseType,
  SignalSeverity,
  SignalType,
} from "./types.js";

export type ObservationClass = "REAL" | "SYNTHETIC" | "REPLAY" | "FIXTURE";

export type AnalysisScopeType = "USER" | "PROJECT" | "WORKSPACE" | "SYSTEM";

export interface AnalysisScope {
  type: AnalysisScopeType;
  id: string;
}

/** Analyze-level status extensions (also mirrored on LoopState where applicable). */
export type AnalyzeStatus = "REQUIRES_SCOPE" | "INVALID_SCOPE";

export type NeedLifecycle =
  | "OBSERVED"
  | "EMERGING"
  | "ESTABLISHED"
  | "STALE"
  | "RESOLVED"
  | "REOPENED"
  | "REMAINS_ACTIVE"
  | "REGRESSED";

export type OutcomeKind = "IMPROVED" | "UNCHANGED" | "REGRESSED" | "INCONCLUSIVE";

export type WindowPreset = "24h" | "7d" | "30d" | "custom";

export interface LifecycleHistoryEntry {
  at: string;
  from: NeedLifecycle;
  to: NeedLifecycle;
  reason: string;
}

export const WINDOW_HOURS: Record<Exclude<WindowPreset, "custom">, number> = {
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

export interface Observation {
  id: string;
  timestamp: string;
  execution_id: string;
  session_id: string;
  scope: { type: EvolutionScopeKind; id: string };
  source: NeedSignal["source"];
  type: SignalType;
  observation_class: ObservationClass;
  domain: string;
  task_class: string;
  severity?: SignalSeverity;
  payload?: Record<string, unknown>;
  provenance: string[];
  evidence_refs?: string[];
  user_id?: string;
  project_id?: string;
  feature_id?: string;
}

export interface SignalQuery {
  user_id?: string;
  project_id?: string;
  feature_id?: string;
  domain?: string;
  task_class?: string;
  type?: SignalType;
  source?: NeedSignal["source"];
  fingerprint?: string;
  since?: string;
  until?: string;
  window?: WindowPreset;
  custom_hours?: number;
  now?: Date;
  limit?: number;
}

export interface LongitudinalPattern {
  id: string;
  fingerprint: string;
  kind: PatternKind;
  scope: EvolutionScopeKind;
  scope_class: EvolutionScopeClass;
  scope_id: string;
  domain: string;
  task_class: string;
  frequency: number;
  unique_executions: number;
  unique_sessions: number;
  source_diversity: number;
  window: { type: WindowPreset | "rolling_hours"; start: string; end: string; hours: number };
  signal_ids: string[];
  impact: SignalSeverity;
  first_seen: string;
  last_seen: string;
}

export interface LongitudinalNeed extends NeedCandidate {
  lifecycle: NeedLifecycle;
  affected_executions: string[];
  affected_sessions: string[];
  unique_executions: number;
  unique_sessions: number;
  /** Append-only trail of lifecycle transitions (outcome / analyze driven). */
  lifecycle_history?: LifecycleHistoryEntry[];
}

export interface EvolutionOutcome {
  id: string;
  evolution_request_id: string;
  candidate_id: string;
  implementation_id?: string;
  baseline_before?: string;
  baseline_after?: string;
  observation_window: { start: string; end: string };
  metrics: {
    failure_rate_before?: number;
    failure_rate_after?: number;
    signal_count_before: number;
    signal_count_after: number;
    sample_size_before?: number;
    sample_size_after?: number;
  };
  outcome: OutcomeKind;
  need_id: string;
  need_fingerprint?: string;
  scope_id?: string;
  created_at: string;
  notes: string[];
}

export interface AdapterConnectionStatus {
  id: string;
  status: "CONNECTED" | "NOT_CONNECTED" | "DEGRADED" | "PARTIALLY_CONNECTED";
  source: string;
  notes: string;
}

/** Longitudinal thresholds — documented rationale in LONGITUDINAL docs */
export const LONGITUDINAL_THRESHOLDS = {
  /** Recurrence requires independent executions, not 3 events in one run */
  min_unique_executions: 3,
  /** Default analysis window */
  default_window: "7d" as WindowPreset,
  /** Need becomes STALE if no supporting signal within this many days */
  stale_after_days: 30,
  /** Soft retention cap for signals on disk (oldest trimmed) */
  max_signals_retained: 10_000,
  /** Max candidates emitted per analyze cycle */
  max_candidates_per_cycle: 20,
  /** Cooldown hours before same need fingerprint can reopen after RESOLVED */
  reopen_cooldown_hours: 1,
} as const;

export function hoursForWindow(window: WindowPreset, customHours?: number): number {
  if (window === "custom") return customHours ?? WINDOW_HOURS["7d"];
  return WINDOW_HOURS[window];
}

export function parseTimestamp(ts: string, now: Date): { ok: true; ms: number } | { ok: false; reason: string } {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return { ok: false, reason: "invalid_timestamp" };
  // Future skew > 5 minutes rejected
  if (ms > now.getTime() + 5 * 60_000) return { ok: false, reason: "future_timestamp" };
  return { ok: true, ms };
}

export type { Confidence, CandidateType, RootCauseType, NeedLifecycle as NeedLifecycleAlias };
