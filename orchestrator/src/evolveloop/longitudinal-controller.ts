import { createHash } from "node:crypto";
import { SignalMiner } from "./signal-miner.js";
import { RootCauseAnalyzer } from "./root-cause.js";
import { EvolutionCandidateGenerator } from "./candidate-generator.js";
import { CandidateValidator, buildEvolutionRequest } from "./candidate-validator.js";
import { submitEvolutionRequest } from "./handoff/evolution-request.js";
import { PersistentSignalStore } from "./persistence/signal-store.js";
import { CrossRunAggregator } from "./aggregation/cross-run.js";
import { LongitudinalNeedDetector, lifecycleFromOutcome } from "./lifecycle/need-lifecycle.js";
import { OutcomeTracker, type OutcomeInput } from "./outcome/outcome-tracker.js";
import { diagnoseWithInventory, type SystemInventory } from "./diagnosis/registry-aware.js";
import {
  snapshotInventoryFromRegistry,
  type InventorySnapshot,
} from "./diagnosis/live-inventory.js";
import type { CapabilityRegistry } from "../types/index.js";
import type { EvolveLoopRunResult, NeedSignal, RawObservation, SignalType } from "./types.js";
import type {
  AnalysisScope,
  EvolutionOutcome,
  LongitudinalNeed,
  OutcomeKind,
  SignalQuery,
  WindowPreset,
} from "./longitudinal-types.js";
import { LONGITUDINAL_THRESHOLDS } from "./longitudinal-types.js";

export interface LongitudinalOptions {
  evolutionDir: string;
  handoffDir?: string;
  window?: WindowPreset;
  inventory?: SystemInventory;
  /** Live CapabilityRegistry — snapshotted when inventory is not injected. */
  registry?: CapabilityRegistry;
  /** Optional agents/skills root for live inventory scan. */
  agentsRoot?: string;
  skillsHint?: string[];
  now?: Date;
  depth?: number;
}

export interface AnalyzeOpts {
  window?: WindowPreset;
  now?: Date;
  depth?: number;
  /** Preferred: explicit analysis scope (required unless legacy ids provided). */
  scope?: AnalysisScope;
  /** Legacy → mapped to USER scope when `scope` omitted. */
  user_id?: string;
  /** Legacy → mapped to PROJECT scope when `scope` omitted. */
  project_id?: string;
  /** Required for SYSTEM scope global aggregation. */
  authorize_system?: boolean;
}

const OUTCOME_TO_SIGNAL: Record<OutcomeKind, SignalType> = {
  IMPROVED: "post_evolution_improvement",
  UNCHANGED: "post_evolution_no_change",
  REGRESSED: "post_evolution_regression",
  INCONCLUSIVE: "post_evolution_unknown",
};

/**
 * Longitudinal EvolveLoop Controller.
 * Cross-run: ingest() persists; analyze() reads history — not one-shot batch only.
 * NEVER mutates runtime/core directly.
 */
export class LongitudinalEvolveLoop {
  private readonly aggregator = new CrossRunAggregator();
  private readonly needDetector = new LongitudinalNeedDetector();
  private readonly rca = new RootCauseAnalyzer();
  private readonly candidates = new EvolutionCandidateGenerator();
  private readonly validator = new CandidateValidator();
  private readonly outcomes = new OutcomeTracker();
  private readonly store: PersistentSignalStore;

  constructor(private readonly options: LongitudinalOptions) {
    this.store = new PersistentSignalStore(options.evolutionDir);
  }

  getStore(): PersistentSignalStore {
    return this.store;
  }

  getEvolutionDir(): string {
    return this.options.evolutionDir;
  }

  getHandoffDir(): string | undefined {
    return this.options.handoffDir;
  }

  /** Persist observations as signals (store-level idempotency). Does not analyze. */
  ingest(observations: RawObservation[], now?: Date): { written: number; skipped: number; rejected: number } {
    // Fresh miner each ingest — durable dedupe is PersistentSignalStore fingerprints
    const miner = new SignalMiner();
    const signals = miner.mine(observations);
    return this.store.appendSignals(signals, now ?? this.options.now ?? new Date());
  }

  /**
   * Analyze persisted history in window → patterns → needs → candidates → requests.
   * Requires explicit `scope` (or legacy user_id / project_id). No silent global.
   */
  analyze(opts?: AnalyzeOpts): EvolveLoopRunResult & {
    longitudinal_needs: LongitudinalNeed[];
    inventory_snapshot?: InventorySnapshot;
  } {
    const now = opts?.now ?? this.options.now ?? new Date();
    const depth = opts?.depth ?? 0;
    const notes: string[] = [];

    if (depth > 2) {
      return {
        ...empty("BLOCKED", ["max_loop_depth_exceeded"]),
        longitudinal_needs: [],
      };
    }

    const resolved = resolveAnalysisScope(opts);
    if (!resolved.ok) {
      return {
        ...empty(resolved.state, resolved.notes),
        longitudinal_needs: [],
      };
    }
    const scope = resolved.scope;
    if (resolved.auditNote) notes.push(resolved.auditNote);

    let inventorySnapshot: InventorySnapshot | undefined;
    if (!this.options.inventory && this.options.registry) {
      inventorySnapshot = snapshotInventoryFromRegistry(this.options.registry, {
        agentsRoot: this.options.agentsRoot,
        skillsHint: this.options.skillsHint,
        now,
      });
      if (inventorySnapshot.notes?.length) notes.push(...inventorySnapshot.notes);
      notes.push(`inventory_rev:${inventorySnapshot.source_revision}`);
      notes.push(`inventory_status:${inventorySnapshot.status}`);
    }

    const query = scopeToQuery(scope, {
      window: opts?.window ?? this.options.window ?? LONGITUDINAL_THRESHOLDS.default_window,
      now,
    });
    const signals = this.store.query(query);

    const patternsXr = this.aggregator.aggregate(signals, {
      window: opts?.window ?? this.options.window ?? "7d",
      now,
    });

    // Map to DetectedPattern-compatible for RCA/candidate reuse
    const patterns = patternsXr.map((p) => ({
      id: p.id,
      fingerprint: p.fingerprint,
      kind: p.kind,
      scope: p.scope,
      scope_class: p.scope_class,
      scope_id: p.scope_id,
      domain: p.domain,
      task_class: p.task_class,
      window: {
        type: "rolling_hours" as const,
        start: p.window.start,
        end: p.window.end,
        hours: p.window.hours,
      },
      signal_ids: p.signal_ids,
      frequency: p.frequency,
      impact: p.impact,
      first_seen: p.first_seen,
      last_seen: p.last_seen,
    }));

    const storedOutcomes = this.store.loadOutcomes();
    const scopedOutcomes = filterOutcomesForScope(storedOutcomes, scope, signals);

    let needs = this.needDetector.detect(patternsXr, this.store.loadNeeds(), now, scopedOutcomes);
    needs = needs.map((n) => {
      const feedback = feedbackSignalsForNeed(n, scopedOutcomes, now);
      const feedbackIds = feedback.map((s) => s.id);
      const enriched = this.needDetector.enrich(n, [...signals, ...feedback], feedbackIds);
      const latest = scopedOutcomes
        .filter((o) => o.need_id === n.id || o.need_fingerprint === n.fingerprint)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        .at(-1);
      if (latest) {
        notes.push(`outcome_feedback:${n.id}:${latest.outcome}`);
      }
      return enriched;
    });
    this.store.saveNeeds(needs);

    const active = needs.filter(
      (n) => n.status === "CANDIDATE" && n.lifecycle !== "STALE" && n.lifecycle !== "RESOLVED",
    );

    const inventory: SystemInventory =
      this.options.inventory ??
      inventorySnapshot?.inventory ?? { skills: [], capabilities: [], providers: [], agents: [] };
    const rootCauses = active.map((n) => {
      const base = this.rca.analyze(n, patterns);
      const advice = diagnoseWithInventory(base.primary, inventory, n.domain);
      return {
        ...base,
        uncertainties: [...base.uncertainties, ...advice.rationale],
        evidence: [...base.evidence, ...advice.overlaps],
      };
    });

    const allCandidates = [];
    for (const need of active) {
      const rca = rootCauses.find((r) => r.need_id === need.id);
      if (!rca) continue;
      const advice = diagnoseWithInventory(rca.primary, inventory, need.domain);
      let generated = this.candidates.generate(need, rca);
      generated = generated.filter((c) => {
        if (advice.avoid.includes(c.type) && c.type !== "NO_CHANGE") return false;
        return true;
      });
      if (!generated.some((c) => c.type === advice.prefer) && advice.prefer !== "NO_CHANGE") {
        // keep generator output; advice recorded in RCA uncertainties
      }
      allCandidates.push(...generated);
    }

    // Cap candidate storm
    const capped = allCandidates.slice(0, LONGITUDINAL_THRESHOLDS.max_candidates_per_cycle);

    let blocked = 0;
    let rejected = 0;
    let submitted = 0;
    const validated = [];
    const requests = [];

    for (const cand of capped) {
      const need = active.find((n) => n.id === cand.need_id);
      const rca = rootCauses.find((r) => r.need_id === cand.need_id);
      if (!need || !rca) {
        blocked += 1;
        continue;
      }
      const v = this.validator.validate(cand, need, rca);
      if (!v.ok) {
        blocked += 1;
        notes.push(`incomplete:${v.reasons.join(",")}`);
        continue;
      }
      validated.push(v.candidate);
      const req = buildEvolutionRequest(need, rca, v.candidate, need.pattern_ids);
      requests.push(req);
      if (this.options.handoffDir) {
        if (req.requested_action === "SUBMIT_TO_PROTOTYPE_GATE") {
          submitEvolutionRequest(req, this.options.handoffDir);
          submitted += 1;
        } else if (req.requested_action === "HOLD") {
          submitEvolutionRequest(req, this.options.handoffDir);
          notes.push(`held_core:${need.id}`);
        }
      }
    }

    const evolve_run_id = `levolve-${createHash("sha256")
      .update(signals.map((s) => s.id).join(","))
      .digest("hex")
      .slice(0, 12)}`;

    return {
      evolve_run_id,
      state: submitted > 0 ? "EVOLUTION_SUBMITTED" : active.length ? "CANDIDATE_VALIDATED" : "OBSERVING",
      signal_count: signals.length,
      pattern_count: patterns.length,
      need_count: active.length,
      candidate_count: validated.length,
      blocked_count: blocked,
      rejected_count: rejected,
      submitted_count: submitted,
      signals,
      patterns,
      needs: active,
      root_causes: rootCauses,
      candidates: validated,
      requests,
      unauthorized_mutation: false,
      notes,
      longitudinal_needs: needs,
      inventory_snapshot: inventorySnapshot,
    };
  }

  /** Record post-change outcome, update need lifecycle, re-ingest synthetic feedback signal. */
  recordOutcome(input: OutcomeInput): ReturnType<OutcomeTracker["evaluate"]> {
    const result = this.outcomes.evaluate(input);
    this.store.appendOutcome(result.outcome);

    const at = input.window_end;
    const needs = this.store.loadNeeds().map((n) => {
      if (n.id !== input.need.id) return n;
      const history = n.lifecycle_history ? [...n.lifecycle_history] : [];
      if (n.lifecycle !== result.need_lifecycle) {
        history.push({
          at,
          from: n.lifecycle,
          to: result.need_lifecycle,
          reason: `outcome:${result.outcome.outcome}`,
        });
      }
      return {
        ...n,
        lifecycle: result.need_lifecycle,
        last_seen: input.window_end,
        lifecycle_history: history,
      };
    });
    this.store.saveNeeds(needs);

    // Synthetic post-evolution signal for next analyze cycle (does not create RepeatedFailure patterns)
    const kind = OUTCOME_TO_SIGNAL[result.outcome.outcome];
    const obs: RawObservation = {
      id: `post-evo-${result.outcome.id}`,
      timestamp: input.window_end,
      source: "system",
      synthetic: true,
      execution_id: `outcome-${result.outcome.id}`,
      user_id: input.need.scope === "USER" ? input.need.scope_id : undefined,
      project_id: input.need.scope === "PROJECT" ? input.need.scope_id : undefined,
      feature_id: input.need.scope === "WORKSPACE" ? input.need.scope_id : undefined,
      domain: input.need.domain,
      task_class: input.need.affected_tasks[0] ?? "unknown",
      kind,
      severity: "INFO",
      message: `post_evolution_${result.outcome.outcome.toLowerCase()}`,
      metadata: {
        post_evolution: true,
        post_evolution_outcome: result.outcome.outcome,
        observation_class: "SYNTHETIC",
        need_id: input.need.id,
        need_fingerprint: input.need.fingerprint,
        outcome_id: result.outcome.id,
      },
    };
    this.ingest([obs], new Date(input.window_end));

    return result;
  }

  /** Safe replay: re-analyze without new ingest (no mutation of signals). Requires scope. */
  replayAnalyze(
    scopeOrWindow?: AnalysisScope | WindowPreset,
    maybeWindow?: WindowPreset,
  ): ReturnType<LongitudinalEvolveLoop["analyze"]> {
    this.candidates.reset();
    if (scopeOrWindow && typeof scopeOrWindow === "object" && "type" in scopeOrWindow) {
      return this.analyze({ scope: scopeOrWindow, window: maybeWindow, now: this.options.now });
    }
    // Legacy signature replayAnalyze(window) — blocked without scope
    return this.analyze({
      window: typeof scopeOrWindow === "string" ? scopeOrWindow : maybeWindow,
      now: this.options.now,
    });
  }
}

type ScopeResolve =
  | { ok: true; scope: AnalysisScope; auditNote?: string }
  | { ok: false; state: EvolveLoopRunResult["state"]; notes: string[] };

function resolveAnalysisScope(opts?: AnalyzeOpts): ScopeResolve {
  if (opts?.scope) {
    if (!opts.scope.id || !opts.scope.type) {
      return { ok: false, state: "INVALID_SCOPE", notes: ["invalid_scope", "requires_scope"] };
    }
    if (opts.scope.type === "SYSTEM") {
      if (opts.authorize_system !== true) {
        return {
          ok: false,
          state: "REQUIRES_SCOPE",
          notes: ["requires_scope", "system_requires_authorize_system"],
        };
      }
      return {
        ok: true,
        scope: opts.scope,
        auditNote: `audit:system_scope_authorized:${opts.scope.id}`,
      };
    }
    return { ok: true, scope: opts.scope };
  }
  // Legacy mapping
  if (opts?.user_id) {
    return { ok: true, scope: { type: "USER", id: opts.user_id } };
  }
  if (opts?.project_id) {
    return { ok: true, scope: { type: "PROJECT", id: opts.project_id } };
  }
  return { ok: false, state: "REQUIRES_SCOPE", notes: ["requires_scope"] };
}

function scopeToQuery(scope: AnalysisScope, base: Pick<SignalQuery, "window" | "now">): SignalQuery {
  const q: SignalQuery = { ...base };
  switch (scope.type) {
    case "USER":
      q.user_id = scope.id;
      break;
    case "PROJECT":
      q.project_id = scope.id;
      break;
    case "WORKSPACE":
      q.feature_id = scope.id;
      break;
    case "SYSTEM":
      // global — no user/project filter
      break;
  }
  return q;
}

function filterOutcomesForScope(
  outcomes: EvolutionOutcome[],
  scope: AnalysisScope,
  _signals: NeedSignal[],
): EvolutionOutcome[] {
  if (scope.type === "SYSTEM") return outcomes;
  return outcomes.filter((o) => !o.scope_id || o.scope_id === scope.id);
}

/** Ephemeral feedback signals derived from persisted outcomes (not re-written to store). */
function feedbackSignalsForNeed(
  need: LongitudinalNeed,
  outcomes: EvolutionOutcome[],
  now: Date,
): NeedSignal[] {
  const related = outcomes.filter(
    (o) => o.need_id === need.id || o.need_fingerprint === need.fingerprint,
  );
  return related.map((o) => {
    const type = OUTCOME_TO_SIGNAL[o.outcome];
    const fp = `feedback-${o.id}`;
    return {
      id: `sig-feedback-${o.id}`,
      fingerprint: fp,
      timestamp: o.created_at || now.toISOString(),
      scope: { type: need.scope, id: need.scope_id },
      source: "system" as const,
      type,
      domain: need.domain,
      task_class: need.affected_tasks[0] ?? "unknown",
      severity: "INFO" as const,
      evidence_refs: [],
      user_id: need.scope === "USER" ? need.scope_id : undefined,
      project_id: need.scope === "PROJECT" ? need.scope_id : undefined,
      feature_id: need.scope === "WORKSPACE" ? need.scope_id : undefined,
      synthetic: true,
      metadata: {
        post_evolution: true,
        post_evolution_outcome: o.outcome,
        ephemeral_feedback: true,
        need_id: need.id,
        outcome_id: o.id,
        lifecycle_hint: lifecycleFromOutcome(o.outcome),
      },
    };
  });
}

function empty(state: EvolveLoopRunResult["state"], notes: string[]): EvolveLoopRunResult {
  return {
    evolve_run_id: "levolve-blocked",
    state,
    signal_count: 0,
    pattern_count: 0,
    need_count: 0,
    candidate_count: 0,
    blocked_count: 1,
    rejected_count: 0,
    submitted_count: 0,
    signals: [],
    patterns: [],
    needs: [],
    root_causes: [],
    candidates: [],
    requests: [],
    unauthorized_mutation: false,
    notes,
  };
}
