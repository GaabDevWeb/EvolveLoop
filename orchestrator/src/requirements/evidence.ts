/**
 * Evidence helpers for requirements extraction / validation (planning-shaped payload).
 */

import { buildPlanningEvidence } from "../evidence/builders.js";
import type { Evidence } from "../types/index.js";
import type { RequirementsSpec, RequirementsValidationResult } from "./types.js";

export function buildRequirementsEvidence(
  runId: string,
  spec: RequirementsSpec,
  validation: RequirementsValidationResult,
): Evidence {
  const assumptions = [
    ...spec.assumptions.map((a) => a.statement),
    ...validation.warnings.map((w) => w.message),
  ];
  const unresolved = [
    ...validation.conflicts.map((c) => c.conflict_id),
    ...spec.open_questions.filter((q) => q.priority === "BLOCKING").map((q) => q.question_id),
  ];

  const evidence = buildPlanningEvidence(
    runId,
    {
      type: "planning",
      decomposition_confidence:
        validation.readiness === "READY"
          ? 0.9
          : validation.readiness === "READY_WITH_ASSUMPTIONS"
            ? 0.7
            : 0.3,
      unresolved_dependencies: unresolved,
      critical_path: spec.requirements
        .filter((r) => r.priority === "MUST" || r.priority === "MUST_NOT")
        .map((r) => r.id),
      out_of_scope: spec.out_of_scope.map((o) => o.statement),
    },
    assumptions,
  );

  evidence.metadata.capability = "requirements.extract";
  evidence.metadata.node_id = `requirements:${spec.requirements_id}@${spec.version}`;
  evidence.spec.checks = [
    {
      dod_id: "schema",
      result: validation.errors.some((e) => e.code === "SCHEMA") ? "fail" : "pass",
      details: "RequirementsSpec schema",
    },
    {
      dod_id: "conflicts",
      result: validation.conflicts.length === 0 ? "pass" : "fail",
      details: "No unresolved conflicts",
    },
    {
      dod_id: "readiness",
      result:
        validation.readiness === "READY" || validation.readiness === "READY_WITH_ASSUMPTIONS"
          ? "pass"
          : "fail",
      details: `readiness=${validation.readiness}`,
    },
  ];
  evidence.spec.outputs = [
    {
      ref: spec.artifact_id ?? `requirements://${spec.requirements_id}@${spec.version}`,
      schema: "RequirementsSpec",
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
