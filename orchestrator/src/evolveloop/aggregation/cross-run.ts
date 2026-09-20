import { createHash } from "node:crypto";
import type { NeedSignal, PatternKind, SignalType } from "../types.js";
import type { LongitudinalPattern, WindowPreset } from "../longitudinal-types.js";
import { LONGITUDINAL_THRESHOLDS, hoursForWindow, parseTimestamp } from "../longitudinal-types.js";

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

const KIND_MAP: Partial<Record<SignalType, PatternKind>> = {
  failure: "RepeatedFailure",
  retry: "RepeatedRetry",
  human_intervention: "RepeatedHumanIntervention",
  correction: "RepeatedUserCorrection",
  capability_unavailable: "CapabilityGap",
  skill_failure: "SkillGap",
  excessive_steps: "ExcessiveExecutionSteps",
  policy_block: "RepeatedPolicyBlock",
  eval_gap: "EvaluationGap",
  abandonment: "TaskAbandonment",
  latency: "LatencyPattern",
};

function severityRank(s: NeedSignal["severity"]): number {
  const order = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return order[s];
}

/**
 * Cross-run aggregator: patterns require unique_executions >= threshold.
 * Three signals in one execution do NOT form a longitudinal pattern.
 */
export class CrossRunAggregator {
  constructor(
    private readonly minUniqueExecutions = LONGITUDINAL_THRESHOLDS.min_unique_executions,
  ) {}

  aggregate(
    signals: NeedSignal[],
    opts: { window?: WindowPreset; custom_hours?: number; now?: Date } = {},
  ): LongitudinalPattern[] {
    const now = opts.now ?? new Date();
    const hours = hoursForWindow(opts.window ?? LONGITUDINAL_THRESHOLDS.default_window, opts.custom_hours);
    const since = now.getTime() - hours * 3600_000;

    const fresh: NeedSignal[] = [];
    for (const s of signals) {
      if (s.type.startsWith("post_evolution_") || s.metadata?.post_evolution === true) continue;
      const ts = parseTimestamp(s.timestamp, now);
      if (!ts.ok) continue;
      if (ts.ms < since) continue;
      fresh.push(s);
    }

    const groups = new Map<string, NeedSignal[]>();
    for (const s of fresh) {
      const key = [s.type, s.domain, s.task_class, s.scope.type, s.scope.id].join("|");
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }

    const patterns: LongitudinalPattern[] = [];

    const push = (group: NeedSignal[], forceSystem: boolean) => {
      const execs = new Set(group.map((g) => g.execution_id).filter(Boolean) as string[]);
      if (execs.size < this.minUniqueExecutions) return;

      const sample = group[0]!;
      const kind = KIND_MAP[sample.type];
      if (!kind) return;

      const sessions = new Set(
        group.map((g) => (g.metadata?.session_id as string | undefined) ?? g.feature_id ?? g.execution_id),
      );
      const sources = new Set(group.map((g) => g.source));
      const users = new Set(group.map((g) => g.user_id).filter(Boolean));
      const projects = new Set(group.map((g) => g.project_id).filter(Boolean));
      const timestamps = group.map((g) => g.timestamp).sort();
      const scopeType = forceSystem ? "SYSTEM" : sample.scope.type;
      const scopeId = forceSystem ? "system" : sample.scope.id;
      const fingerprint = hash([kind, sample.domain, sample.task_class, scopeType, scopeId, "xr"]);

      let scope_class: LongitudinalPattern["scope_class"] = "USER_LOCAL";
      if (scopeType === "SYSTEM" || users.size >= 3 || projects.size >= 2) scope_class = "CORE_CANDIDATE";

      patterns.push({
        id: `lpat-${fingerprint}`,
        fingerprint,
        kind,
        scope: scopeType,
        scope_class,
        scope_id: scopeId,
        domain: sample.domain,
        task_class: sample.task_class,
        frequency: group.length,
        unique_executions: execs.size,
        unique_sessions: sessions.size,
        source_diversity: sources.size,
        window: {
          type: opts.window ?? "7d",
          start: timestamps[0]!,
          end: timestamps[timestamps.length - 1]!,
          hours,
        },
        signal_ids: group.map((g) => g.id),
        impact: group.reduce(
          (max, g) => (severityRank(g.severity) > severityRank(max) ? g.severity : max),
          sample.severity,
        ),
        first_seen: timestamps[0]!,
        last_seen: timestamps[timestamps.length - 1]!,
      });
    };

    for (const [, group] of groups) push(group, false);

    const cross = new Map<string, NeedSignal[]>();
    for (const s of fresh) {
      const key = [s.type, s.domain, s.task_class].join("|");
      const list = cross.get(key) ?? [];
      list.push(s);
      cross.set(key, list);
    }
    for (const [, group] of cross) {
      const users = new Set(group.map((g) => g.user_id).filter(Boolean));
      const projects = new Set(group.map((g) => g.project_id).filter(Boolean));
      if (users.size >= 3 || projects.size >= 2) push(group, true);
    }

    const uniq = new Map<string, LongitudinalPattern>();
    for (const p of patterns) uniq.set(p.fingerprint, p);
    return [...uniq.values()];
  }
}
