/**
 * Task readiness from EngineeringTaskGraph + runtime overlay.
 */

import type { EngineeringTask, EngineeringTaskGraph } from "../tasks/types.js";
import type { SupervisorState, TaskRuntimeStatus } from "./types.js";

export function initialTaskStatuses(graph: EngineeringTaskGraph): Record<string, TaskRuntimeStatus> {
  const deps = new Map(graph.tasks.map((t) => [t.id, t.dependencies.map((d) => d.task_id)]));
  const out: Record<string, TaskRuntimeStatus> = {};
  for (const t of graph.tasks) {
    const pred = deps.get(t.id) ?? [];
    out[t.id] = pred.length === 0 ? "READY" : "PENDING";
  }
  return out;
}

export function recomputeReadiness(graph: EngineeringTaskGraph, state: SupervisorState): void {
  const completed = new Set(
    Object.values(state.tasks)
      .filter((t) => t.status === "COMPLETED")
      .map((t) => t.task_id),
  );

  for (const task of graph.tasks) {
    const rec = state.tasks[task.id];
    if (!rec) continue;
    if (
      rec.status === "COMPLETED" ||
      rec.status === "FAILED" ||
      rec.status === "CLAIMED" ||
      rec.status === "IN_PROGRESS" ||
      rec.status === "WAITING_RUNTIME" ||
      rec.status === "BLOCKED" ||
      rec.status === "SKIPPED"
    ) {
      continue;
    }
    const preds = task.dependencies.map((d) => d.task_id);
    const ready = preds.every((p) => completed.has(p));
    rec.status = ready ? "READY" : "PENDING";
    rec.updated_at = new Date().toISOString();
  }
}

export function listReadyTasks(
  graph: EngineeringTaskGraph,
  state: SupervisorState,
): EngineeringTask[] {
  recomputeReadiness(graph, state);
  return graph.tasks.filter((t) => state.tasks[t.id]?.status === "READY");
}

export function countActiveAssignments(state: SupervisorState): number {
  return Object.values(state.assignments).filter((a) =>
    ["CLAIMED", "RUNNING", "WAITING_RUNTIME", "RECOVERING"].includes(a.status),
  ).length;
}
