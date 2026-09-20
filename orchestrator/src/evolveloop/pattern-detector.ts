import { createHash } from "node:crypto";
import type {
  DetectedPattern,
  EvolutionScopeClass,
  NeedSignal,
  PatternKind,
  PatternWindow,
  SignalType,
} from "./types.js";
import { EVOLVE_THRESHOLDS } from "./types.js";

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

function scopeClass(scopeType: NeedSignal["scope"]["type"], distinctUsers: number, distinctProjects: number): EvolutionScopeClass {
  if (scopeType === "SYSTEM" || distinctProjects >= 2 || distinctUsers >= 3) {
    return "CORE_CANDIDATE";
  }
  if (scopeType === "USER" || (distinctUsers <= 1 && distinctProjects <= 1)) {
    return "USER_LOCAL";
  }
  return "UNKNOWN_SCOPE";
}

function withinWindow(ts: string, windowHours: number, now: Date): boolean {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= windowHours * 3600_000;
}

/**
 * Pattern Detector: signals → recurring patterns with temporal window + scope.
 */
export class PatternDetector {
  constructor(
    private readonly minFrequency = EVOLVE_THRESHOLDS.min_pattern_frequency,
    private readonly windowHours = EVOLVE_THRESHOLDS.pattern_window_hours,
  ) {}

  detect(signals: NeedSignal[], now: Date = new Date()): DetectedPattern[] {
    const fresh = signals.filter((s) => withinWindow(s.timestamp, this.windowHours, now));
    const groups = new Map<string, NeedSignal[]>();

    for (const s of fresh) {
      const key = [s.type, s.domain, s.task_class, s.scope.type, s.scope.id].join("|");
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }

    const patterns: DetectedPattern[] = [];

    const pushPattern = (group: NeedSignal[], forceSystem = false) => {
      if (group.length < this.minFrequency) return;
      const sample = group[0]!;
      const kind = KIND_MAP[sample.type];
      if (!kind) return;

      const users = new Set(group.map((g) => g.user_id).filter(Boolean));
      const projects = new Set(group.map((g) => g.project_id).filter(Boolean));
      const timestamps = group.map((g) => g.timestamp).sort();
      const scopeType = forceSystem ? "SYSTEM" : sample.scope.type;
      const scopeId = forceSystem ? "system" : sample.scope.id;
      const fingerprint = hash([kind, sample.domain, sample.task_class, scopeType, scopeId]);

      const window: PatternWindow = {
        type: "rolling_hours",
        hours: this.windowHours,
        start: timestamps[0]!,
        end: timestamps[timestamps.length - 1]!,
      };

      patterns.push({
        id: `pat-${fingerprint}`,
        fingerprint,
        kind,
        scope: scopeType,
        scope_class: scopeClass(scopeType, users.size, projects.size),
        scope_id: scopeId,
        domain: sample.domain,
        task_class: sample.task_class,
        window,
        signal_ids: group.map((g) => g.id),
        frequency: group.length,
        impact: group.reduce(
          (max, g) => (severityRank(g.severity) > severityRank(max) ? g.severity : max),
          sample.severity,
        ),
        first_seen: timestamps[0]!,
        last_seen: timestamps[timestamps.length - 1]!,
      });
    };

    // Pass 1: same scope
    for (const [, group] of groups) {
      pushPattern(group, false);
    }

    // Pass 2: cross-user/project aggregation → CORE_CANDIDATE (does not auto-promote to Core)
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
      if (users.size >= 3 || projects.size >= 2) {
        pushPattern(group, true);
      }
    }

    // Deduplicate by fingerprint
    const uniq = new Map<string, DetectedPattern>();
    for (const p of patterns) uniq.set(p.fingerprint, p);
    return [...uniq.values()];
  }
}

function severityRank(s: NeedSignal["severity"]): number {
  const order = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return order[s];
}
