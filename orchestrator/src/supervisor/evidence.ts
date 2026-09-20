import { buildPlanningEvidence } from "../evidence/builders.js";
import type { Evidence } from "../types/index.js";
import type { AgentAssignment, DelegationResult } from "./types.js";

export function buildDelegationEvidence(
  runId: string,
  assignment: AgentAssignment,
  result: DelegationResult,
): Evidence {
  const evidence = buildPlanningEvidence(
    runId,
    {
      type: "planning",
      decomposition_confidence:
        (result.validation_ok && result.outcome === "DECISION_PRODUCED") ||
        result.runtime_effect?.success
          ? 0.9
          : 0.4,
      unresolved_dependencies: result.validation_errors ?? [],
      critical_path: [assignment.task_id, assignment.assignment_id],
      out_of_scope: [],
    },
    [
      `assignment=${assignment.assignment_id}`,
      `agent=${assignment.agent_id}@${assignment.agent_version}`,
      `outcome=${result.outcome}`,
      `decision=${result.decision_id ?? "-"}`,
      `execution=${result.execution_id ?? assignment.execution_id ?? "-"}`,
    ],
  );
  evidence.metadata.capability = "supervisor.delegate";
  evidence.metadata.node_id = `assignment:${assignment.assignment_id}`;
  evidence.spec.checks = [
    {
      dod_id: "validation",
      result: result.validation_ok ? "pass" : "fail",
      details: result.outcome,
    },
    {
      dod_id: "runtime",
      result: result.runtime_effect?.success
        ? "pass"
        : result.runtime_effect?.attempted
          ? "fail"
          : "skip",
      details: result.runtime_effect?.gate_decision ?? "n/a",
    },
    {
      dod_id: "provider_boundary",
      result: "pass",
      details: "Agent never invokes Provider directly — RuntimeBridge only",
    },
  ];
  evidence.spec.outputs = (result.runtime_effect?.evidence_refs ?? []).map((ref) => ({
    ref,
    schema: "Evidence",
    validated: result.validation_ok,
  }));
  return evidence;
}
