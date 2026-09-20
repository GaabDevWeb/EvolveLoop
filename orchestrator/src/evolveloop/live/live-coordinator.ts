/**
 * LiveAnalysisCoordinator — connects ingest → cadence → automatic analyze(scope).
 * Never mutates core/runtime; never bypasses gate; never analyzes without scope.
 */

import type { LongitudinalEvolveLoop, AnalyzeOpts } from "../longitudinal-controller.js";
import type { AnalysisScope, LongitudinalNeed, OutcomeKind } from "../longitudinal-types.js";
import type { EvolveLoopRunResult, NeedSignal, RawObservation } from "../types.js";
import { ScopedAnalysisCadence } from "./scoped-cadence.js";
import {
  ObservationWindowManager,
  approveEvolutionRequestFixture,
  type ObservationWindow,
} from "./observation-window.js";
import { resolveLiveCadence, scopeKey, type LiveCadenceConfig } from "./live-config.js";

export interface LiveCoordinatorOptions {
  loop: LongitudinalEvolveLoop;
  cadence?: LiveCadenceConfig;
  authorize_system?: boolean;
  /** Inline analyze for deterministic tests (default false = queueMicrotask). */
  sync?: boolean;
  auto_open_windows_on_fixture_approve?: boolean;
  /** Harness-only: ControlledGateFixture auto-approves SUBMIT (not production). */
  harness_auto_approve?: boolean;
  onResult?: (
    result: EvolveLoopRunResult & { longitudinal_needs?: LongitudinalNeed[] },
    scope: AnalysisScope,
  ) => void;
  onError?: (err: unknown, scope: AnalysisScope) => void;
  onDeferred?: (reason: string, scope: AnalysisScope | null) => void;
  onAnalysisFailed?: (err: unknown, scope: AnalysisScope) => void;
}

export interface NotifyMeta {
  high_severity?: boolean;
  observe_only?: boolean;
  signals?: NeedSignal[];
}

export class LiveAnalysisCoordinator {
  private readonly cadence: ScopedAnalysisCadence;
  private readonly windows: ObservationWindowManager;
  private readonly pending = new Set<string>();
  private readonly scheduled = new Set<string>();
  private depth = 0;
  /** Per-scope cap for outcome→analyze triggers (uses max_loop_depth). */
  private readonly outcomeTriggerCount = new Map<string, number>();
  private readonly cfg: ReturnType<typeof resolveLiveCadence>;
  private readonly lastResults = new Map<string, EvolveLoopRunResult>();

  constructor(private readonly options: LiveCoordinatorOptions) {
    this.cfg = resolveLiveCadence(options.cadence);
    this.cadence = new ScopedAnalysisCadence(options.cadence);
    this.windows = new ObservationWindowManager(options.loop.getEvolutionDir(), {
      minimum_samples: this.cfg.window_minimum_samples,
      max_duration_ms: this.cfg.window_max_duration_ms,
    });
  }

  getCadence(): ScopedAnalysisCadence {
    return this.cadence;
  }

  getWindows(): ObservationWindowManager {
    return this.windows;
  }

  getLastResult(scope: AnalysisScope): EvolveLoopRunResult | undefined {
    return this.lastResults.get(scopeKey(scope));
  }

  getOutcomeTriggerCount(scope: AnalysisScope): number {
    return this.outcomeTriggerCount.get(scopeKey(scope)) ?? 0;
  }

  notifySignal(scope: AnalysisScope | null, meta: NotifyMeta = {}): void {
    if (!scope || !scope.id || !scope.type) {
      this.options.onDeferred?.("missing_scope", scope);
      return;
    }
    if (scope.type === "SYSTEM" && this.options.authorize_system !== true) {
      this.options.onDeferred?.("system_requires_authorize_system", scope);
      return;
    }

    for (const s of meta.signals ?? []) {
      const closed = this.windows.observeSignal(s);
      for (const w of closed) {
        try {
          const evaluated = this.windows.evaluateClosed(this.options.loop, w);
          if (evaluated) {
            this.afterOutcome(w.scope, evaluated.outcome.outcome);
          }
        } catch (err) {
          this.options.onError?.(err, scope);
        }
      }
    }

    if (meta.observe_only) return;

    const onlyPostEvo =
      (meta.signals ?? []).length > 0 &&
      (meta.signals ?? []).every(
        (s) => String(s.type).startsWith("post_evolution_") || s.metadata?.ephemeral_feedback,
      );
    if (onlyPostEvo) return;

    this.cadence.recordSignal(scope, meta.signals?.length ?? 1);
    this.pending.add(scopeKey(scope));

    if (this.cadence.shouldAnalyze(scope, { high_severity: meta.high_severity })) {
      this.scheduleAnalyze(scope);
    }
  }

  /**
   * Outcome → next analytical cycle (CRITICAL closed-loop path).
   * INCONCLUSIVE → observe_only (no schedule).
   * REGRESSED → after_outcome + high_severity.
   * IMPROVED | UNCHANGED → after_outcome.
   * Caps per-scope via outcomeTriggerCount vs max_loop_depth.
   */
  afterOutcome(scope: AnalysisScope, outcome: OutcomeKind): void {
    if (!scope?.id || !scope?.type) {
      this.options.onDeferred?.("missing_scope", scope ?? null);
      return;
    }
    if (scope.type === "SYSTEM" && this.options.authorize_system !== true) {
      this.options.onDeferred?.("system_requires_authorize_system", scope);
      return;
    }

    if (outcome === "INCONCLUSIVE") {
      this.options.onDeferred?.("observe_only_inconclusive", scope);
      return;
    }

    const key = scopeKey(scope);
    const count = this.outcomeTriggerCount.get(key) ?? 0;
    if (count >= this.cfg.max_loop_depth) {
      this.options.onDeferred?.("outcome_max_loop_depth", scope);
      return;
    }
    this.outcomeTriggerCount.set(key, count + 1);

    // Ensure cadence has scope state so shouldAnalyze can evaluate cooldown/backpressure.
    this.cadence.recordSignal(scope, 0);
    this.pending.add(key);

    const high_severity = outcome === "REGRESSED";
    if (
      this.cadence.shouldAnalyze(scope, {
        after_outcome: true,
        high_severity,
      })
    ) {
      this.scheduleAnalyze(scope);
    } else {
      this.options.onDeferred?.("outcome_cadence_blocked", scope);
    }
  }

  /**
   * Evaluate a CLOSED window and trigger afterOutcome (tests/E2E without manual analyze).
   */
  closeAndFeedback(
    window: ObservationWindow,
  ): ReturnType<LongitudinalEvolveLoop["recordOutcome"]> | null {
    const evaluated = this.windows.evaluateClosed(this.options.loop, window);
    if (evaluated) {
      this.afterOutcome(window.scope, evaluated.outcome.outcome);
    }
    return evaluated;
  }

  tick(): void {
    for (const key of [...this.pending]) {
      const [type, ...rest] = key.split(":");
      const scope: AnalysisScope = { type: type as AnalysisScope["type"], id: rest.join(":") };
      if (this.cadence.shouldAnalyze(scope)) {
        this.scheduleAnalyze(scope);
      }
    }
  }

  flush(scope: AnalysisScope): EvolveLoopRunResult | null {
    return this.runAnalyze(scope);
  }

  private scheduleAnalyze(scope: AnalysisScope): void {
    const key = scopeKey(scope);
    if (this.scheduled.has(key)) return;
    this.scheduled.add(key);

    const run = () => {
      this.scheduled.delete(key);
      this.runAnalyze(scope);
    };

    if (this.options.sync) run();
    else queueMicrotask(run);
  }

  private runAnalyze(scope: AnalysisScope): EvolveLoopRunResult | null {
    if (this.depth >= this.cfg.max_loop_depth) {
      this.options.onDeferred?.("max_loop_depth", scope);
      return null;
    }

    const opts: AnalyzeOpts = {
      scope,
      authorize_system: scope.type === "SYSTEM" ? this.options.authorize_system : undefined,
    };

    this.depth += 1;
    try {
      const result = this.options.loop.analyze(opts);
      this.cadence.recordAnalyze(scope, this.options.loop.getStore());
      this.pending.delete(scopeKey(scope));

      const filtered = this.cadence.filterRequests(result.requests);
      const bounded = {
        ...result,
        requests: filtered,
        submitted_count: filtered.filter((r) => r.requested_action === "SUBMIT_TO_PROTOTYPE_GATE")
          .length,
      };
      this.lastResults.set(scopeKey(scope), bounded);
      this.options.onResult?.(bounded, scope);

      if (this.options.harness_auto_approve) {
        this.maybeApproveAndOpenWindows(bounded, scope);
      }

      return bounded;
    } catch (err) {
      this.options.onAnalysisFailed?.(err, scope);
      this.options.onError?.(err, scope);
      return null;
    } finally {
      this.depth -= 1;
    }
  }

  private maybeApproveAndOpenWindows(
    result: EvolveLoopRunResult & { longitudinal_needs?: LongitudinalNeed[] },
    scope: AnalysisScope,
  ): void {
    const dir = this.options.loop.getHandoffDir();
    if (!dir) return;

    for (const req of result.requests) {
      if (req.requested_action !== "SUBMIT_TO_PROTOTYPE_GATE") continue;
      const gate = approveEvolutionRequestFixture(dir, req.id);
      if (!gate.approved) continue;
      if (!this.options.auto_open_windows_on_fixture_approve) continue;
      const need = result.longitudinal_needs?.find((n) => n.id === req.source_need);
      if (!need) continue;
      const before = this.options.loop.getStore().query({
        user_id: scope.type === "USER" ? scope.id : undefined,
        project_id: scope.type === "PROJECT" ? scope.id : undefined,
        feature_id: scope.type === "WORKSPACE" ? scope.id : undefined,
        domain: need.domain,
        task_class: need.affected_tasks[0],
      });
      this.windows.open({
        evolution_request_id: req.id,
        candidate_id: req.candidate.id,
        need,
        scope,
        before_signals: before,
        implementation_id: `impl-${req.id}`,
      });
    }
  }
}

/** Derive AnalysisScope from observation. Never invents silent global. */
export function deriveScopeFromObservation(
  obs: Pick<RawObservation, "user_id" | "project_id" | "feature_id">,
  fallback?: AnalysisScope,
): AnalysisScope | null {
  if (obs.user_id) return { type: "USER", id: obs.user_id };
  if (obs.project_id) return { type: "PROJECT", id: obs.project_id };
  if (obs.feature_id) return { type: "WORKSPACE", id: obs.feature_id };
  if (fallback) return fallback;
  return null;
}
