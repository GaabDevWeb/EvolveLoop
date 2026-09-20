import { buildPlanningEvidence } from "../evidence/builders.js";
import type { Evidence } from "../types/index.js";
import type { EngineeringWorkRequest, EngineeringWorkResult } from "./types.js";

export function buildEngineeringEvidence(
  work: EngineeringWorkRequest,
  result: EngineeringWorkResult,
): Evidence {
  const evidence = buildPlanningEvidence(
    work.correlation.run_id,
    {
      type: "planning",
      decomposition_confidence: result.ok ? 0.95 : 0.35,
      unresolved_dependencies: result.validation?.outstanding_failures ?? [],
      critical_path: [work.task_id, work.assignment_id, work.work_id],
      out_of_scope: [],
    },
    [
      `work=${work.work_id}`,
      `agent=${work.agent_id}@${work.agent_version}`,
      `phase=${result.phase}`,
      `files=${result.files_changed.join(",")}`,
      `tests=${result.test_results.map((t) => `${t.command}:${t.passed}`).join(";")}`,
    ],
  );
  evidence.metadata.capability = "engineering.worker";
  evidence.metadata.node_id = `work:${work.work_id}`;
  evidence.spec.checks = [
    {
      dod_id: "implementation",
      result: result.validation?.implementation_valid ? "pass" : "fail",
      details: result.phase,
    },
    {
      dod_id: "tests",
      result: result.validation?.tests_valid ? "pass" : "fail",
      details: result.test_results.map((t) => t.command).join(","),
    },
    {
      dod_id: "validation",
      result: result.validation?.completion_decision === "COMPLETE" ? "pass" : "fail",
      details: result.validation?.completion_decision ?? "n/a",
    },
  ];
  evidence.spec.outputs = result.files_changed.map((ref) => ({
    ref,
    schema: "FileWriteResult",
    validated: result.ok,
  }));
  return evidence;
}
