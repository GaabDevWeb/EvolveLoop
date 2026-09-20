import type { AdapterConnectionStatus, Observation, ObservationClass } from "../longitudinal-types.js";
import type { RawObservation, SignalType } from "../types.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const ADAPTER_REGISTRY: AdapterConnectionStatus[] = [
  {
    id: "jsonl-events",
    status: "CONNECTED",
    source: "telemetry/events/*.jsonl",
    notes: "File helper adaptJsonlEventsFile/Dir; can read production-like events dir via resolveDataPaths",
  },
  {
    id: "runtime-eventbus",
    status: "CONNECTED",
    source: "EventBus.onEvent",
    notes: "attachEvolveLoopObserver maps NodeFailed/FeatureBlocked/GateRejected → ingest (opt-in)",
  },
  {
    id: "evidence-bus",
    status: "NOT_CONNECTED",
    source: "evidence payloads",
    notes: "No automatic Evidence[] → Observation bridge yet",
  },
  {
    id: "eval-results",
    status: "NOT_CONNECTED",
    source: "docs/evals/runs",
    notes: "Eval catalog not wired as live observation source",
  },
  {
    id: "user-feedback",
    status: "NOT_CONNECTED",
    source: "user corrections",
    notes: "No product feedback channel in orchestrator package",
  },
];

/** Map EventEnvelope-like JSONL records into RawObservations when possible. */
export function adaptJsonlEventsFile(
  filePath: string,
  opts: { session_id: string; observation_class?: ObservationClass } = { session_id: "unknown" },
): RawObservation[] {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
  const out: RawObservation[] = [];
  for (const line of lines) {
    try {
      const ev = JSON.parse(line) as {
        type?: string;
        timestamp?: string;
        feature_id?: string;
        payload?: Record<string, unknown>;
      };
      if (ev.type !== "NodeFailed" && ev.type !== "FeatureBlocked") continue;
      const kind: SignalType = ev.type === "FeatureBlocked" ? "policy_block" : "failure";
      out.push({
        id: `jsonl-${ev.feature_id ?? "x"}-${ev.timestamp ?? out.length}`,
        timestamp: ev.timestamp ?? new Date().toISOString(),
        source: "telemetry",
        synthetic: opts.observation_class === "SYNTHETIC" || opts.observation_class === "FIXTURE",
        execution_id: (ev.payload?.run_id as string) ?? ev.feature_id ?? `exec-${out.length}`,
        feature_id: ev.feature_id,
        domain: (ev.payload?.capability as string) ?? "unknown",
        task_class: (ev.payload?.capability as string) ?? "unknown",
        kind,
        severity: "HIGH",
        metadata: { session_id: opts.session_id, event_type: ev.type, observation_class: opts.observation_class ?? "REAL" },
        evidence_refs: [],
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export function adaptJsonlEventsDir(
  eventsDir: string,
  featureId: string,
  session_id: string,
): RawObservation[] {
  const path = join(eventsDir, `${featureId}.jsonl`);
  return adaptJsonlEventsFile(path, { session_id, observation_class: "REAL" });
}

export function observationToRaw(o: Observation): RawObservation {
  return {
    id: o.id,
    timestamp: o.timestamp,
    source: o.source,
    synthetic: o.observation_class !== "REAL",
    execution_id: o.execution_id,
    feature_id: o.feature_id,
    user_id: o.user_id,
    project_id: o.project_id,
    domain: o.domain,
    task_class: o.task_class,
    kind: o.type,
    severity: o.severity,
    metadata: { session_id: o.session_id, observation_class: o.observation_class, ...o.payload },
    evidence_refs: o.evidence_refs,
  };
}
