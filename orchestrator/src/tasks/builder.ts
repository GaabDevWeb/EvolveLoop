/**
 * TaskGraphBuilder — TASK_GRAPH_PROPOSAL → EngineeringTaskGraph.
 */

import type { AgentDecision } from "../agent/types.js";
import { validateTaskGraph, deriveTaskGraphMetadata } from "./validate.js";
import type {
  CoverageJustification,
  EngineeringTask,
  EngineeringTaskGraph,
  TaskActionType,
  TaskDependency,
  TaskGraphExtractionInput,
  TaskGraphValidationResult,
  TaskPriority,
  TaskRisk,
  TaskSideEffect,
  TaskType,
} from "./types.js";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function nowIso(): string {
  return new Date().toISOString();
}

const TYPES = new Set<TaskType>([
  "IMPLEMENTATION",
  "TEST",
  "DOCUMENTATION",
  "DATABASE",
  "CONFIGURATION",
  "INTEGRATION",
  "MIGRATION",
  "VALIDATION",
  "RESEARCH",
]);

function parseTask(raw: unknown, i: number): EngineeringTask | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim()
      : `TASK-${String(i + 1).padStart(3, "0")}`;
  const title = typeof o.title === "string" ? o.title : "";
  const description = typeof o.description === "string" ? o.description : title;
  if (!title && !description) return null;

  const dependencies: TaskDependency[] = Array.isArray(o.dependencies)
    ? o.dependencies
        .map((d) => {
          if (typeof d === "string") return { task_id: d };
          const dr = asRecord(d);
          if (!dr || typeof dr.task_id !== "string") return null;
          return {
            task_id: dr.task_id,
            reason: typeof dr.reason === "string" ? dr.reason : undefined,
          };
        })
        .filter((x): x is TaskDependency => x != null)
    : [];

  return {
    id,
    title: title || description.slice(0, 80),
    description: description || title,
    type: TYPES.has(o.type as TaskType) ? (o.type as TaskType) : "IMPLEMENTATION",
    priority: (["MUST", "SHOULD", "COULD"].includes(o.priority as string)
      ? o.priority
      : "SHOULD") as TaskPriority,
    status:
      o.status === "READY" ||
      o.status === "BLOCKED" ||
      o.status === "SKIPPED" ||
      o.status === "CANCELLED"
        ? o.status
        : "PROPOSED",
    action: typeof o.action === "string" ? (o.action as TaskActionType) : undefined,
    requirement_ids: Array.isArray(o.requirement_ids)
      ? o.requirement_ids.filter((x): x is string => typeof x === "string")
      : [],
    architecture_component_ids: Array.isArray(o.architecture_component_ids)
      ? o.architecture_component_ids.filter((x): x is string => typeof x === "string")
      : undefined,
    architecture_decision_ids: Array.isArray(o.architecture_decision_ids)
      ? o.architecture_decision_ids.filter((x): x is string => typeof x === "string")
      : undefined,
    interface_ids: Array.isArray(o.interface_ids)
      ? o.interface_ids.filter((x): x is string => typeof x === "string")
      : undefined,
    dependencies,
    required_capabilities: Array.isArray(o.required_capabilities)
      ? o.required_capabilities.filter((x): x is string => typeof x === "string")
      : [],
    preferred_agent_role:
      typeof o.preferred_agent_role === "string" ? o.preferred_agent_role : undefined,
    compatible_agent_roles: Array.isArray(o.compatible_agent_roles)
      ? o.compatible_agent_roles.filter((x): x is string => typeof x === "string")
      : undefined,
    definition_of_done: Array.isArray(o.definition_of_done)
      ? o.definition_of_done.filter((x): x is string => typeof x === "string")
      : [],
    acceptance_criteria: Array.isArray(o.acceptance_criteria)
      ? o.acceptance_criteria.filter((x): x is string => typeof x === "string")
      : undefined,
    scope: Array.isArray(o.scope) ? o.scope.filter((x): x is string => typeof x === "string") : undefined,
    owned_paths: Array.isArray(o.owned_paths)
      ? o.owned_paths.filter((x): x is string => typeof x === "string")
      : undefined,
    risk: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(o.risk as string)
      ? (o.risk as TaskRisk)
      : undefined,
    side_effects: Array.isArray(o.side_effects)
      ? o.side_effects.filter((x): x is TaskSideEffect => typeof x === "string")
      : undefined,
    evidence_requirements: Array.isArray(o.evidence_requirements)
      ? o.evidence_requirements
          .map((e, ei) => {
            const er = asRecord(e);
            if (!er || typeof er.kind !== "string") return null;
            return {
              evidence_id:
                typeof er.evidence_id === "string"
                  ? er.evidence_id
                  : `EV-${String(ei + 1).padStart(3, "0")}`,
              kind: er.kind,
              description: typeof er.description === "string" ? er.description : er.kind,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)
      : undefined,
    human_required: typeof o.human_required === "boolean" ? o.human_required : undefined,
    parent_task_id: typeof o.parent_task_id === "string" ? o.parent_task_id : undefined,
    replacement_reason:
      typeof o.replacement_reason === "string" ? o.replacement_reason : undefined,
    task_version: typeof o.task_version === "number" ? o.task_version : 1,
    notes: typeof o.notes === "string" ? o.notes : undefined,
    external_dependencies: Array.isArray(o.external_dependencies)
      ? o.external_dependencies.filter((x): x is string => typeof x === "string")
      : undefined,
    test_strategy: Array.isArray(o.test_strategy)
      ? (o.test_strategy.filter((x) => typeof x === "string") as EngineeringTask["test_strategy"])
      : undefined,
  };
}

export interface BuildTaskGraphResult {
  graph: EngineeringTaskGraph;
  validation: TaskGraphValidationResult;
}

export function emptyTaskGraph(
  task_graph_id: string,
  input: TaskGraphExtractionInput,
): EngineeringTaskGraph {
  return {
    kind: "EngineeringTaskGraph",
    apiVersion: "evolveloop.io/se/v1",
    task_graph_id,
    version: 1,
    requirements_reference: {
      requirements_id: input.requirements.requirements_id,
      requirements_version: input.requirements.version,
    },
    architecture_reference: {
      architecture_id: input.architecture.architecture_id,
      architecture_version: input.architecture.version,
    },
    tasks: [],
    created_at: nowIso(),
  };
}

export function buildTaskGraphFromProposal(
  proposal: unknown,
  input: TaskGraphExtractionInput,
): BuildTaskGraphResult {
  const o = asRecord(proposal) ?? {};
  const nested = asRecord(o.proposed_task_graph) ?? asRecord(o.spec) ?? o;

  const task_graph_id =
    (typeof nested.task_graph_id === "string" && nested.task_graph_id) ||
    input.task_graph_id ||
    (input.project ? `${input.project}-TG` : "TG-SPEC");

  const version =
    input.prior != null
      ? input.prior.version + 1
      : typeof nested.version === "number" && nested.version >= 1
        ? nested.version
        : 1;

  const rawTasks = Array.isArray(nested.tasks) ? nested.tasks : [];
  const tasks: EngineeringTask[] = [];
  for (let i = 0; i < rawTasks.length; i++) {
    const t = parseTask(rawTasks[i], i);
    if (t) tasks.push(t);
  }

  const coverage_justifications: CoverageJustification[] = Array.isArray(
    nested.coverage_justifications,
  )
    ? nested.coverage_justifications
        .map((j) => {
          const jr = asRecord(j);
          if (!jr || typeof jr.reason !== "string") return null;
          return {
            requirement_id:
              typeof jr.requirement_id === "string" ? jr.requirement_id : undefined,
            component_id: typeof jr.component_id === "string" ? jr.component_id : undefined,
            reason: jr.reason as CoverageJustification["reason"],
            note: typeof jr.note === "string" ? jr.note : undefined,
          };
        })
        .filter((x): x is CoverageJustification => x != null)
    : [];

  const graph: EngineeringTaskGraph = {
    kind: "EngineeringTaskGraph",
    apiVersion: "evolveloop.io/se/v1",
    task_graph_id,
    version,
    parent_version: input.prior?.version,
    parent_graph_id: input.prior ? input.prior.task_graph_id : undefined,
    replan_reason: typeof nested.replan_reason === "string" ? nested.replan_reason : undefined,
    decision_id: typeof nested.decision_id === "string" ? nested.decision_id : undefined,
    project: input.project ?? (typeof nested.project === "string" ? nested.project : undefined),
    title: typeof nested.title === "string" ? nested.title : undefined,
    requirements_reference: {
      requirements_id: input.requirements.requirements_id,
      requirements_version: input.requirements.version,
    },
    architecture_reference: {
      architecture_id: input.architecture.architecture_id,
      architecture_version: input.architecture.version,
    },
    tasks,
    coverage_justifications,
    created_at: nowIso(),
  };

  graph.derived = deriveTaskGraphMetadata(graph);
  if (graph.derived) {
    const must = input.requirements.requirements.filter(
      (r) => r.priority === "MUST" || r.priority === "MUST_NOT",
    );
    const covered = new Set(tasks.flatMap((t) => t.requirement_ids));
    for (const j of coverage_justifications) {
      if (j.requirement_id) covered.add(j.requirement_id);
    }
    const comps = input.architecture.components;
    const coveredC = new Set(tasks.flatMap((t) => t.architecture_component_ids ?? []));
    for (const j of coverage_justifications) {
      if (j.component_id) coveredC.add(j.component_id);
    }
    graph.derived.coverage_summary = {
      must_requirements: must.length,
      covered_must: must.filter((r) => covered.has(r.id)).length,
      components: comps.length,
      covered_components: comps.filter((c) => coveredC.has(c.id)).length,
    };
  }

  const validation = validateTaskGraph(graph, input.requirements, input.architecture, {
    known_capabilities: input.known_capabilities,
    allow_warnings_as_ready: input.allow_warnings_as_ready,
  });

  return { graph, validation };
}

export function buildTaskGraphFromAgentDecision(
  decision: AgentDecision,
  input: TaskGraphExtractionInput,
): BuildTaskGraphResult {
  if (decision.decision_type !== "TASK_GRAPH_PROPOSAL") {
    const empty = emptyTaskGraph(input.task_graph_id ?? "TG-SPEC", input);
    empty.tasks = [];
    const validation = validateTaskGraph(empty, input.requirements, input.architecture, input);
    return { graph: empty, validation };
  }

  const result = buildTaskGraphFromProposal(
    { proposed_task_graph: decision.proposed_task_graph },
    input,
  );
  result.graph.baseline = false;
  delete result.graph.baseline_at;
  result.graph.decision_id = decision.decision_id;
  result.validation = validateTaskGraph(
    result.graph,
    input.requirements,
    input.architecture,
    input,
  );
  return result;
}
