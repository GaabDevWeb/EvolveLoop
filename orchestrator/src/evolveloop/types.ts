/**
 * EvolveLoop — type contracts (deterministic core).
 * Need ≠ Solution. Signal ≠ Need. Candidate ≠ Approved change.
 */

export type SignalSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SignalType =
  | "failure"
  | "retry"
  | "human_intervention"
  | "correction"
  | "capability_unavailable"
  | "skill_failure"
  | "tool_misuse"
  | "excessive_steps"
  | "latency"
  | "eval_gap"
  | "repeated_request"
  | "abandonment"
  | "policy_block"
  | "knowledge_gap"
  | "post_evolution_improvement"
  | "post_evolution_regression"
  | "post_evolution_no_change"
  | "post_evolution_unknown";

export type EvolutionScopeKind = "USER" | "PROJECT" | "WORKSPACE" | "TEAM" | "SYSTEM";
export type EvolutionScopeClass = "USER_LOCAL" | "CORE_CANDIDATE" | "UNKNOWN_SCOPE";

export type RootCauseType =
  | "KNOWLEDGE_GAP"
  | "SKILL_GAP"
  | "CAPABILITY_GAP"
  | "PROVIDER_GAP"
  | "POLICY_GAP"
  | "ROUTING_GAP"
  | "AGENT_BOUNDARY"
  | "RUNTIME_GAP"
  | "OBSERVABILITY_GAP"
  | "EVAL_GAP"
  | "USER_CONFIGURATION"
  | "ENVIRONMENT"
  | "NO_CHANGE"
  | "UNKNOWN";

export type CandidateType =
  | "NO_CHANGE"
  | "DOCUMENTATION"
  | "KNOWLEDGE"
  | "SKILL"
  | "CAPABILITY"
  | "PROVIDER"
  | "POLICY"
  | "ROUTING"
  | "AGENT"
  | "RUNTIME"
  | "COMPOSITE";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type LoopState =
  | "OBSERVING"
  | "SIGNALING"
  | "ANALYZING"
  | "NEED_DETECTED"
  | "ROOT_CAUSE_ANALYSIS"
  | "CANDIDATE_GENERATED"
  | "CANDIDATE_VALIDATED"
  | "EVOLUTION_SUBMITTED"
  | "BLOCKED"
  | "REJECTED"
  | "INSUFFICIENT_EVIDENCE"
  | "REQUIRES_SCOPE"
  | "INVALID_SCOPE";

export type AutonomyLevel =
  | "OBSERVE"
  | "ANALYZE"
  | "PROPOSE"
  | "PROTOTYPE"
  | "VALIDATE"
  | "IMPLEMENT";

/** Raw observation from adapters (synthetic flagged explicitly). */
export interface RawObservation {
  id: string;
  timestamp: string;
  source: "telemetry" | "evidence" | "eval" | "user_feedback" | "execution" | "system";
  synthetic?: boolean;
  execution_id?: string;
  feature_id?: string;
  user_id?: string;
  project_id?: string;
  domain?: string;
  task_class?: string;
  kind: SignalType;
  severity?: SignalSeverity;
  message?: string;
  metadata?: Record<string, unknown>;
  evidence_refs?: string[];
}

export interface NeedSignal {
  id: string;
  fingerprint: string;
  timestamp: string;
  scope: { type: EvolutionScopeKind; id: string };
  source: RawObservation["source"];
  type: SignalType;
  domain: string;
  task_class: string;
  severity: SignalSeverity;
  evidence_refs: string[];
  execution_id?: string;
  feature_id?: string;
  user_id?: string;
  project_id?: string;
  synthetic: boolean;
  metadata: Record<string, unknown>;
}

export interface PatternWindow {
  type: "rolling_hours" | "absolute";
  start: string;
  end: string;
  hours?: number;
}

export type PatternKind =
  | "RepeatedFailure"
  | "RepeatedRetry"
  | "RepeatedHumanIntervention"
  | "RepeatedUserCorrection"
  | "CapabilityGap"
  | "SkillGap"
  | "ExcessiveExecutionSteps"
  | "RepeatedPolicyBlock"
  | "EvaluationGap"
  | "RepeatedUnsuccessfulRecovery"
  | "TaskAbandonment"
  | "LatencyPattern";

export interface DetectedPattern {
  id: string;
  fingerprint: string;
  kind: PatternKind;
  scope: EvolutionScopeKind;
  scope_class: EvolutionScopeClass;
  scope_id: string;
  domain: string;
  task_class: string;
  window: PatternWindow;
  signal_ids: string[];
  frequency: number;
  impact: SignalSeverity;
  first_seen: string;
  last_seen: string;
}

export interface NeedCandidate {
  id: string;
  fingerprint: string;
  scope: EvolutionScopeKind;
  scope_class: EvolutionScopeClass;
  scope_id: string;
  domain: string;
  type: PatternKind;
  recurrence: number;
  impact: SignalSeverity;
  affected_tasks: string[];
  evidence: string[];
  pattern_ids: string[];
  signal_ids: string[];
  confidence: Confidence;
  suspected_root_causes: RootCauseType[];
  first_seen: string;
  last_seen: string;
  status: "CANDIDATE" | "INSUFFICIENT_EVIDENCE" | "REJECTED";
}

export interface RootCauseAnalysis {
  need_id: string;
  primary: RootCauseType;
  alternatives: RootCauseType[];
  evidence: string[];
  uncertainties: string[];
}

export interface EvolutionCandidate {
  id: string;
  fingerprint: string;
  need_id: string;
  root_cause_primary: RootCauseType;
  scope: EvolutionScopeKind;
  scope_class: EvolutionScopeClass;
  type: CandidateType;
  target: string;
  rationale: string;
  expected_effect: string;
  evidence: string[];
  alternatives: CandidateType[];
  risks: string[];
  complexity: "LOW" | "MEDIUM" | "HIGH";
  rollback: string;
  eval_strategy: string;
  success_criteria: string[];
  failure_criteria: string[];
  status: "DRAFT" | "VALIDATED" | "INCOMPLETE" | "REJECTED";
}

export interface EvolutionRequest {
  id: string;
  source_need: string;
  source_patterns: string[];
  root_cause: RootCauseAnalysis;
  candidate: EvolutionCandidate;
  evidence: string[];
  scope: EvolutionScopeClass;
  requested_action: "SUBMIT_TO_PROTOTYPE_GATE" | "HOLD" | "NO_CHANGE";
  evaluation: {
    strategy: string;
    success_criteria: string[];
    failure_criteria: string[];
  };
  autonomy_ceiling: AutonomyLevel;
  created_at: string;
  mutates_core: false;
  mutates_runtime: false;
}

export interface EvolveLoopRunResult {
  evolve_run_id: string;
  state: LoopState;
  signal_count: number;
  pattern_count: number;
  need_count: number;
  candidate_count: number;
  blocked_count: number;
  rejected_count: number;
  submitted_count: number;
  signals: NeedSignal[];
  patterns: DetectedPattern[];
  needs: NeedCandidate[];
  root_causes: RootCauseAnalysis[];
  candidates: EvolutionCandidate[];
  requests: EvolutionRequest[];
  unauthorized_mutation: false;
  notes: string[];
}

/** Thresholds with documented rationale (see docs/architecture/evolveloopt/NEEDS.md). */
export const EVOLVE_THRESHOLDS = {
  /** Min distinct executions/signals in window to form a pattern (avoids one-off). */
  min_pattern_frequency: 3,
  /** Rolling window hours for recurrence. */
  pattern_window_hours: 168,
  /** Min patterns corroborating a need. */
  min_need_patterns: 1,
  /** Min signals supporting a need. */
  min_need_signals: 3,
  /** Cooldown ms after identical need fingerprint. */
  need_cooldown_ms: 0, // tests control time; production docs recommend >0
  /** Max recursive evolve depth from post-change observations. */
  max_loop_depth: 2,
} as const;
