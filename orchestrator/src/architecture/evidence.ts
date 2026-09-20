import { buildPlanningEvidence } from "../evidence/builders.js";
import type { Evidence } from "../types/index.js";
import type { ArchitectureSpec, ArchitectureValidationResult } from "./types.js";

export function buildArchitectureEvidence(
  runId: string,
  spec: ArchitectureSpec,
  validation: ArchitectureValidationResult,
): Evidence {
  const assumptions = [
    ...spec.assumptions.map((a) => a.statement),
    ...validation.warnings.map((w) => w.message),
  ];
  const unresolved = [
    ...validation.unmapped_must,
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
      critical_path: spec.components.map((c) => c.id),
      out_of_scope: [],
    },
    assumptions,
  );

  evidence.metadata.capability = "architecture.design";
  evidence.metadata.node_id = `architecture:${spec.architecture_id}@${spec.version}`;
  evidence.spec.checks = [
    {
      dod_id: "schema",
      result: validation.errors.some((e) => e.code === "SCHEMA") ? "fail" : "pass",
      details: "ArchitectureSpec schema",
    },
    {
      dod_id: "requirements_binding",
      result: validation.errors.some((e) => e.code.includes("REQUIREMENTS")) ? "fail" : "pass",
      details: `${spec.requirements_reference.requirements_id}@${spec.requirements_reference.requirements_version}`,
    },
    {
      dod_id: "traceability",
      result: validation.unmapped_must.length === 0 ? "pass" : "fail",
      details: `unmapped_must=${validation.unmapped_must.length}`,
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
      ref: spec.artifact_id ?? `architecture://${spec.architecture_id}@${spec.version}`,
      schema: "ArchitectureSpec",
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
