import { createHash } from "node:crypto";
import type {
  EvolutionOutcome,
  LifecycleHistoryEntry,
  LongitudinalNeed,
  LongitudinalPattern,
  NeedLifecycle,
  OutcomeKind,
} from "../longitudinal-types.js";
import { LONGITUDINAL_THRESHOLDS } from "../longitudinal-types.js";

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function appendHistory(
  prev: LongitudinalNeed | undefined,
  from: NeedLifecycle | undefined,
  to: NeedLifecycle,
  reason: string,
  at: string,
): LifecycleHistoryEntry[] {
  const base = prev?.lifecycle_history ? [...prev.lifecycle_history] : [];
  if (from && from !== to) {
    base.push({ at, from, to, reason });
  }
  return base;
}

/** Map latest outcome kind → lifecycle that must survive re-analyze. */
export function lifecycleFromOutcome(kind: OutcomeKind): NeedLifecycle | null {
  switch (kind) {
    case "IMPROVED":
      return "RESOLVED";
    case "REGRESSED":
      return "REGRESSED";
    case "UNCHANGED":
    case "INCONCLUSIVE":
      return "REMAINS_ACTIVE";
    default:
      return null;
  }
}

function latestOutcomesByNeed(outcomes: EvolutionOutcome[]): Map<string, EvolutionOutcome> {
  const map = new Map<string, EvolutionOutcome>();
  const sorted = [...outcomes].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const o of sorted) {
    map.set(o.need_id, o);
  }
  return map;
}

function findOutcomeForNeed(
  needId: string | undefined,
  fingerprint: string,
  byNeed: Map<string, EvolutionOutcome>,
  outcomes: EvolutionOutcome[],
): EvolutionOutcome | undefined {
  if (needId && byNeed.has(needId)) return byNeed.get(needId);
  const matching = outcomes
    .filter((o) => o.need_fingerprint === fingerprint || o.need_id === needId)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return matching[matching.length - 1];
}

/**
 * Longitudinal need detector with lifecycle + cross-run identity.
 */
export class LongitudinalNeedDetector {
  detect(
    patterns: LongitudinalPattern[],
    existing: LongitudinalNeed[],
    now: Date = new Date(),
    outcomes: EvolutionOutcome[] = [],
  ): LongitudinalNeed[] {
    const byFp = new Map(existing.map((n) => [n.fingerprint, n]));
    const latestByNeed = latestOutcomesByNeed(outcomes);
    const out: LongitudinalNeed[] = [];
    const at = now.toISOString();

    for (const p of patterns) {
      const fingerprint = hash([p.kind, p.domain, p.task_class, p.scope_class, p.scope_id, "ln"]);
      const prev = byFp.get(fingerprint);
      const relatedOutcome = findOutcomeForNeed(prev?.id, fingerprint, latestByNeed, outcomes);
      const fromOutcome = relatedOutcome ? lifecycleFromOutcome(relatedOutcome.outcome) : null;

      let lifecycle: NeedLifecycle = "EMERGING";
      if (p.unique_executions >= LONGITUDINAL_THRESHOLDS.min_unique_executions) {
        lifecycle = p.unique_executions >= 5 ? "ESTABLISHED" : "EMERGING";
      }

      // Outcome RESOLVED / prev RESOLVED: reopen only with fresh evidence after cooldown
      const resolvedAnchor = fromOutcome === "RESOLVED" || prev?.lifecycle === "RESOLVED";
      if (resolvedAnchor && fromOutcome !== "REGRESSED" && fromOutcome !== "REMAINS_ACTIVE") {
        const last = Date.parse(prev?.last_seen ?? p.last_seen);
        const cool = LONGITUDINAL_THRESHOLDS.reopen_cooldown_hours * 3600_000;
        if (Date.parse(p.last_seen) - last < cool) {
          const kept: LongitudinalNeed = {
            ...(prev ?? {
              id: `lneed-${fingerprint}`,
              fingerprint,
              scope: p.scope,
              scope_class: p.scope_class,
              scope_id: p.scope_id,
              domain: p.domain,
              type: p.kind,
              recurrence: p.frequency,
              impact: p.impact,
              affected_tasks: [p.task_class],
              evidence: [...p.signal_ids],
              pattern_ids: [p.id],
              signal_ids: [...p.signal_ids],
              confidence: "MEDIUM" as const,
              suspected_root_causes: [],
              first_seen: p.first_seen,
              last_seen: p.last_seen,
              status: "CANDIDATE" as const,
              lifecycle: "RESOLVED" as const,
              affected_executions: [],
              affected_sessions: [],
              unique_executions: p.unique_executions,
              unique_sessions: p.unique_sessions,
            }),
            lifecycle: "RESOLVED",
            lifecycle_history: appendHistory(prev, prev?.lifecycle, "RESOLVED", "outcome_resolved", at),
          };
          out.push(kept);
          byFp.set(fingerprint, kept);
          continue;
        }
        lifecycle = "REOPENED";
      }

      const conf =
        p.unique_executions >= 5 && p.source_diversity >= 2
          ? "HIGH"
          : p.unique_executions >= LONGITUDINAL_THRESHOLDS.min_unique_executions
            ? "MEDIUM"
            : "LOW";

      let finalLifecycle: NeedLifecycle = conf === "LOW" ? "OBSERVED" : lifecycle;

      // Outcome-driven states from prior analyze / recordOutcome
      if (prev?.lifecycle === "REGRESSED" || prev?.lifecycle === "REMAINS_ACTIVE") {
        finalLifecycle = prev.lifecycle;
      }
      if (fromOutcome === "REGRESSED" || fromOutcome === "REMAINS_ACTIVE" || fromOutcome === "RESOLVED") {
        finalLifecycle = fromOutcome;
      }

      const need: LongitudinalNeed = {
        id: prev?.id ?? `lneed-${fingerprint}`,
        fingerprint,
        scope: p.scope,
        scope_class: p.scope_class,
        scope_id: p.scope_id,
        domain: p.domain,
        type: p.kind,
        recurrence: p.frequency,
        impact: p.impact,
        affected_tasks: [p.task_class],
        evidence: [...p.signal_ids],
        pattern_ids: [p.id],
        signal_ids: [...p.signal_ids],
        confidence: conf,
        suspected_root_causes: [],
        first_seen: prev?.first_seen ?? p.first_seen,
        last_seen: p.last_seen,
        status: conf === "LOW" ? "INSUFFICIENT_EVIDENCE" : "CANDIDATE",
        lifecycle: finalLifecycle,
        affected_executions: Array.from({ length: p.unique_executions }, (_, i) => `exec-agg-${i}`),
        affected_sessions: Array.from({ length: p.unique_sessions }, (_, i) => `sess-agg-${i}`),
        unique_executions: p.unique_executions,
        unique_sessions: p.unique_sessions,
        lifecycle_history: appendHistory(prev, prev?.lifecycle, finalLifecycle, "detect", at),
      };

      out.push(need);
      byFp.set(fingerprint, need);
    }

    // Mark STALE existing needs not refreshed
    for (const prev of existing) {
      if (out.some((n) => n.fingerprint === prev.fingerprint)) continue;
      if (prev.lifecycle === "RESOLVED") {
        out.push(prev);
        continue;
      }
      const relatedOutcome = findOutcomeForNeed(prev.id, prev.fingerprint, latestByNeed, outcomes);
      const fromOutcome = relatedOutcome ? lifecycleFromOutcome(relatedOutcome.outcome) : null;
      if (fromOutcome === "REGRESSED" || fromOutcome === "REMAINS_ACTIVE" || fromOutcome === "RESOLVED") {
        out.push({
          ...prev,
          lifecycle: fromOutcome,
          lifecycle_history: appendHistory(prev, prev.lifecycle, fromOutcome, "outcome_preserve", at),
        });
        continue;
      }
      const ageDays = (now.getTime() - Date.parse(prev.last_seen)) / 86_400_000;
      if (ageDays >= LONGITUDINAL_THRESHOLDS.stale_after_days) {
        out.push({
          ...prev,
          lifecycle: "STALE",
          lifecycle_history: appendHistory(prev, prev.lifecycle, "STALE", "stale_age", at),
        });
      } else {
        out.push(prev);
      }
    }

    return out;
  }

  /** Enrich need with real execution/session ids from signals + optional outcome feedback evidence. */
  enrich(
    need: LongitudinalNeed,
    signals: { id: string; execution_id?: string; metadata?: Record<string, unknown> }[],
    feedbackSignalIds: string[] = [],
  ): LongitudinalNeed {
    const related = signals.filter((s) => need.signal_ids.includes(s.id));
    const execs = [...new Set(related.map((s) => s.execution_id).filter(Boolean) as string[])];
    const sessions = [
      ...new Set(
        related.map(
          (s) => (s.metadata?.session_id as string | undefined) ?? s.execution_id ?? "unknown",
        ),
      ),
    ];
    const evidence = [...new Set([...need.evidence, ...feedbackSignalIds])];
    return {
      ...need,
      evidence,
      affected_executions: execs,
      affected_sessions: sessions,
      unique_executions: execs.length,
      unique_sessions: sessions.length,
    };
  }
}
