import { buildPlanningEvidence } from "../evidence/builders.js";
import type { Evidence } from "../types/index.js";
import type { EngineeringTaskGraph, TaskGraphValidationResult } from "./types.js";

export function buildTaskGraphEvidence(
  runId: string,
  graph: EngineeringTaskGraph,
  validation: TaskGraphValidationResult,
): Evidence {
  const evidence = buildPlanningEvidence(
    runId,
    {
      type: "planning",
      decomposition_confidence:
        validation.health === "READY"
          ? 0.9
          : validation.health === "READY_WITH_WARNINGS"
            ? 0.75
            : 0.3,
      unresolved_dependencies: [
        ...validation.unmapped_must,
        ...validation.unimplemented_components,
      ],
      critical_path: graph.derived?.critical_path ?? graph.tasks.map((t) => t.id),
      out_of_scope: [],
    },
    validation.warnings.map((w) => w.message),
  );

  evidence.metadata.capability = "tasks.decompose";
  evidence.metadata.node_id = `taskgraph:${graph.task_graph_id}@${graph.version}`;
  evidence.spec.checks = [
    {
      dod_id: "schema",
      result: validation.errors.some((e) => e.code === "SCHEMA") ? "fail" : "pass",
      details: "EngineeringTaskGraph schema",
    },
    {
      dod_id: "coverage",
      result: validation.unmapped_must.length === 0 ? "pass" : "fail",
      details: `unmapped_must=${validation.unmapped_must.length}`,
    },
    {
      dod_id: "health",
      result:
        validation.health === "READY" || validation.health === "READY_WITH_WARNINGS"
          ? "pass"
          : "fail",
      details: `health=${validation.health}`,
    },
  ];
  evidence.spec.outputs = [
    {
      ref: graph.artifact_id ?? `taskgraph://${graph.task_graph_id}@${graph.version}`,
      schema: "EngineeringTaskGraph",
      validated: validation.ok,
    },
  ];
  evidence.spec.findings = validation.errors.map((e) => ({
    id: e.code,
    severity: "major" as const,
    description: e.message,
    requirement_ref: e.requirement_id,
  }));
  return evidence;
}
