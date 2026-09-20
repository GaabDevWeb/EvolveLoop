import type { EngineeringTask, EngineeringTaskGraph, TaskGraphChangeSet } from "./types.js";

export class TaskGraphImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskGraphImmutabilityError";
  }
}

export function cloneTaskGraph(graph: EngineeringTaskGraph): EngineeringTaskGraph {
  return structuredClone(graph);
}

export function createTaskGraphBaseline(graph: EngineeringTaskGraph): EngineeringTaskGraph {
  if (graph.baseline) {
    throw new TaskGraphImmutabilityError(
      `Task graph ${graph.task_graph_id}@v${graph.version} is already a baseline`,
    );
  }
  const snap = cloneTaskGraph(graph);
  snap.baseline = true;
  snap.baseline_at = new Date().toISOString();
  return snap;
}

export function assertTaskGraphMutable(graph: EngineeringTaskGraph): void {
  if (graph.baseline) {
    throw new TaskGraphImmutabilityError(
      `Cannot mutate baseline ${graph.task_graph_id}@v${graph.version}; create version+1`,
    );
  }
}

export function createNextTaskGraphVersion(
  prior: EngineeringTaskGraph,
  tasks: EngineeringTask[],
  extras?: Partial<Pick<EngineeringTaskGraph, "coverage_justifications" | "replan_reason" | "decision_id" | "title">>,
): EngineeringTaskGraph {
  return {
    ...cloneTaskGraph(prior),
    version: prior.version + 1,
    parent_version: prior.version,
    parent_graph_id: prior.task_graph_id,
    tasks,
    coverage_justifications: extras?.coverage_justifications ?? prior.coverage_justifications,
    replan_reason: extras?.replan_reason,
    decision_id: extras?.decision_id,
    title: extras?.title ?? prior.title,
    baseline: false,
    baseline_at: undefined,
    artifact_id: undefined,
    created_at: new Date().toISOString(),
  };
}

function taskFingerprint(t: EngineeringTask): string {
  return JSON.stringify({
    title: t.title,
    description: t.description,
    type: t.type,
    requirement_ids: [...t.requirement_ids].sort(),
    dependencies: t.dependencies.map((d) => d.task_id).sort(),
    required_capabilities: [...t.required_capabilities].sort(),
    scope: [...(t.scope ?? [])].sort(),
    owned_paths: [...(t.owned_paths ?? [])].sort(),
    definition_of_done: [...t.definition_of_done].sort(),
  });
}

export function diffTaskGraphVersions(
  from: EngineeringTaskGraph,
  to: EngineeringTaskGraph,
): TaskGraphChangeSet {
  const fromMap = new Map(from.tasks.map((t) => [t.id, t]));
  const toMap = new Map(to.tasks.map((t) => [t.id, t]));
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const dependency_changed: string[] = [];
  const capability_changed: string[] = [];
  const scope_changed: string[] = [];

  for (const id of toMap.keys()) {
    if (!fromMap.has(id)) added.push(id);
  }
  for (const id of fromMap.keys()) {
    if (!toMap.has(id)) removed.push(id);
  }
  for (const [id, next] of toMap) {
    const prev = fromMap.get(id);
    if (!prev) continue;
    if (taskFingerprint(prev) !== taskFingerprint(next)) modified.push(id);
    const pd = prev.dependencies.map((d) => d.task_id).sort().join(",");
    const nd = next.dependencies.map((d) => d.task_id).sort().join(",");
    if (pd !== nd) dependency_changed.push(id);
    if (
      [...prev.required_capabilities].sort().join(",") !==
      [...next.required_capabilities].sort().join(",")
    ) {
      capability_changed.push(id);
    }
    if (
      [...(prev.scope ?? []), ...(prev.owned_paths ?? [])].sort().join(",") !==
      [...(next.scope ?? []), ...(next.owned_paths ?? [])].sort().join(",")
    ) {
      scope_changed.push(id);
    }
  }

  return {
    from_version: from.version,
    to_version: to.version,
    added,
    removed,
    modified,
    dependency_changed,
    capability_changed,
    scope_changed,
  };
}

/** Replacement lineage (not retry) */
export function replaceTask(
  task: EngineeringTask,
  replacement: Omit<EngineeringTask, "id" | "parent_task_id" | "replacement_reason"> & {
    id?: string;
  },
  reason: string,
): EngineeringTask {
  const match = task.id.match(/^TASK-(\d+)(R(\d+))?$/);
  const num = match?.[1] ?? "001";
  const rev = match?.[3] ? Number(match[3]) + 1 : 1;
  return {
    ...replacement,
    id: replacement.id ?? `TASK-${num}R${rev}`,
    parent_task_id: task.id,
    replacement_reason: reason,
    task_version: (task.task_version ?? 1) + 1,
    status: "PROPOSED",
  } as EngineeringTask;
}
