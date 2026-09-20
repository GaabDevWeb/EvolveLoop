/**
 * Observe-only skill lifecycle telemetry.
 * Failures never throw to callers — gates keep separate evidence semantics.
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { EventBus } from "../events/event-bus.js";
import type { EventType } from "../types/index.js";

export type SkillTelemetryEventType =
  | "DISCOVERED"
  | "REFERENCED"
  | "LOADED"
  | "ACTIVATED"
  | "EXECUTED"
  | "GATE_REQUIRED"
  | "GATE_SATISFIED"
  | "FALLBACK_USED"
  | "SKIPPED"
  | "FAILED"
  | "BLOCKED";

export interface SkillTelemetryRecord {
  event: "SkillLifecycle";
  event_type: SkillTelemetryEventType;
  skill_id: string;
  skill_version?: string;
  execution_id?: string;
  task_id?: string;
  feature_id?: string;
  agent_id?: string;
  source?: string;
  context?: string;
  gate_state?: string;
  policy_state?: string;
  success?: boolean;
  failure_reason?: string;
  duration_ms?: number;
  timestamp: string;
  provider?: string;
  command?: string;
  flow?: string;
}

const EVENT_BUS_TYPE: EventType = "SkillLifecycle";

export function buildSkillTelemetryRecord(
  partial: Omit<SkillTelemetryRecord, "event" | "timestamp"> & { timestamp?: string },
): SkillTelemetryRecord {
  return {
    event: "SkillLifecycle",
    timestamp: partial.timestamp ?? new Date().toISOString(),
    ...partial,
  };
}

/** Emit to EventBus if provided — never throws */
export function emitSkillTelemetry(bus: EventBus | undefined, record: SkillTelemetryRecord): void {
  try {
    if (!bus) return;
    bus.emit(
      EVENT_BUS_TYPE,
      record.feature_id ?? "unknown",
      "engine",
      { ...record },
      record.execution_id,
    );
  } catch {
    /* observe-only */
  }
}

/** Append JSONL — never throws; never blocks caller semantics */
export function appendSkillTelemetryJsonl(
  eventsDir: string,
  record: SkillTelemetryRecord,
): { ok: boolean; path?: string; error?: string } {
  try {
    mkdirSync(eventsDir, { recursive: true });
    const day = record.timestamp.slice(0, 10);
    const path = join(eventsDir, `skill-lifecycle-${day}.jsonl`);
    appendFileSync(path, `${JSON.stringify(record)}\n`, "utf-8");
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Convenience: bus + jsonl, swallow all errors */
export function recordSkillLifecycle(
  opts: {
    bus?: EventBus;
    eventsDir?: string;
  },
  partial: Omit<SkillTelemetryRecord, "event" | "timestamp"> & { timestamp?: string },
): SkillTelemetryRecord {
  const record = buildSkillTelemetryRecord(partial);
  emitSkillTelemetry(opts.bus, record);
  if (opts.eventsDir) appendSkillTelemetryJsonl(opts.eventsDir, record);
  return record;
}

export interface SkillUsageAggregate {
  skill_id: string;
  activation_count: number;
  execution_count: number;
  gate_required_count: number;
  gate_satisfied_count: number;
  fallback_count: number;
  failure_count: number;
  blocked_count: number;
  last_activation?: string;
  first_observed_activation?: string;
  distinct_flows: string[];
  distinct_commands: string[];
  distinct_agents: string[];
}

export interface ObservationWindow {
  started_at?: string;
  ended_at?: string;
  executions_observed: number;
  records: number;
}

export function aggregateSkillTelemetry(
  records: SkillTelemetryRecord[],
): { window: ObservationWindow; by_skill: SkillUsageAggregate[] } {
  const by = new Map<string, SkillUsageAggregate>();
  let started: string | undefined;
  let ended: string | undefined;

  const ensure = (id: string): SkillUsageAggregate => {
    let a = by.get(id);
    if (!a) {
      a = {
        skill_id: id,
        activation_count: 0,
        execution_count: 0,
        gate_required_count: 0,
        gate_satisfied_count: 0,
        fallback_count: 0,
        failure_count: 0,
        blocked_count: 0,
        distinct_flows: [],
        distinct_commands: [],
        distinct_agents: [],
      };
      by.set(id, a);
    }
    return a;
  };

  const addDistinct = (arr: string[], v?: string) => {
    if (v && !arr.includes(v)) arr.push(v);
  };

  for (const r of records) {
    if (!started || r.timestamp < started) started = r.timestamp;
    if (!ended || r.timestamp > ended) ended = r.timestamp;
    const a = ensure(r.skill_id);
    switch (r.event_type) {
      case "ACTIVATED":
      case "LOADED":
        a.activation_count++;
        break;
      case "EXECUTED":
        a.execution_count++;
        a.activation_count++;
        break;
      case "GATE_REQUIRED":
        a.gate_required_count++;
        break;
      case "GATE_SATISFIED":
        a.gate_satisfied_count++;
        break;
      case "FALLBACK_USED":
        a.fallback_count++;
        break;
      case "FAILED":
        a.failure_count++;
        break;
      case "BLOCKED":
        a.blocked_count++;
        break;
      default:
        break;
    }
    if (!a.first_observed_activation || r.timestamp < a.first_observed_activation) {
      a.first_observed_activation = r.timestamp;
    }
    a.last_activation = r.timestamp;
    addDistinct(a.distinct_flows, r.flow);
    addDistinct(a.distinct_commands, r.command);
    addDistinct(a.distinct_agents, r.agent_id);
  }

  return {
    window: {
      started_at: started,
      ended_at: ended,
      executions_observed: records.filter((r) => r.event_type === "EXECUTED").length,
      records: records.length,
    },
    by_skill: [...by.values()].sort((x, y) => x.skill_id.localeCompare(y.skill_id)),
  };
}

export function loadSkillTelemetryFromDir(eventsDir: string): SkillTelemetryRecord[] {
  const out: SkillTelemetryRecord[] = [];
  if (!existsSync(eventsDir)) return out;
  for (const name of readdirSync(eventsDir)) {
    if (!name.startsWith("skill-lifecycle-") || !name.endsWith(".jsonl")) continue;
    const text = readFileSync(join(eventsDir, name), "utf-8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line) as SkillTelemetryRecord;
        if (o.event === "SkillLifecycle" && o.skill_id) out.push(o);
      } catch {
        /* skip bad lines */
      }
    }
  }
  return out;
}
