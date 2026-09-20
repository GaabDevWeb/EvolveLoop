import type { RawObservation } from "../types.js";

let seq = 0;

/** Build dated observation for longitudinal harness (Day N simulation). */
export function dayObs(
  dayOffset: number,
  partial: Omit<RawObservation, "id" | "timestamp"> & { id?: string },
  now: Date = new Date(),
): RawObservation {
  seq += 1;
  const ts = new Date(now.getTime() - dayOffset * 86_400_000).toISOString();
  return {
    id: partial.id ?? `lobs-${seq}`,
    timestamp: ts,
    ...partial,
    metadata: {
      ...(partial.metadata ?? {}),
      session_id: (partial.metadata?.session_id as string) ?? `session-${dayOffset}`,
      observation_class: partial.synthetic ? "SYNTHETIC" : "FIXTURE",
    },
  };
}

export function resetLongitudinalSeq(): void {
  seq = 0;
}

/** Classic longitudinal failure arc across days / executions */
export function longitudinalFailureArc(user = "user-a", now = new Date()): RawObservation[] {
  return [
    dayObs(6, { source: "execution", synthetic: true, execution_id: "run-d6", user_id: user, domain: "sql", task_class: "complex_query", kind: "failure", severity: "HIGH" }, now),
    dayObs(5, { source: "execution", synthetic: true, execution_id: "run-d5", user_id: user, domain: "sql", task_class: "complex_query", kind: "failure", severity: "HIGH" }, now),
    dayObs(4, { source: "user_feedback", synthetic: true, execution_id: "run-d4", user_id: user, domain: "sql", task_class: "complex_query", kind: "correction", severity: "MEDIUM" }, now),
    dayObs(2, { source: "execution", synthetic: true, execution_id: "run-d2", user_id: user, domain: "sql", task_class: "complex_query", kind: "failure", severity: "HIGH" }, now),
    dayObs(1, { source: "execution", synthetic: true, execution_id: "run-d1", user_id: user, domain: "sql", task_class: "complex_query", kind: "failure", severity: "HIGH" }, now),
  ];
}

/** Three signals same execution — must NOT form longitudinal pattern */
export function sameExecutionTriple(user = "user-a", now = new Date()): RawObservation[] {
  return [0, 1, 2].map((i) =>
    dayObs(0, {
      source: "execution",
      synthetic: true,
      execution_id: "run-same",
      user_id: user,
      domain: "sql",
      task_class: "complex_query",
      kind: "failure",
      severity: "HIGH",
      id: `same-exec-${i}`,
    }, now),
  );
}
