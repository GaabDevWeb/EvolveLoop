/**
 * Composition seam audit — documents SE-01..06 handoffs without inventing systems.
 */

import type { CompositionSeamAudit } from "./types.js";

export function auditCompositionSeams(): CompositionSeamAudit {
  const seams: CompositionSeamAudit["seams"] = [
    {
      from: "Brief/PRD",
      to: "RequirementsSpec",
      status: "OK",
      note: "runRequirementsFromText / extractAndBuild",
    },
    {
      from: "RequirementsSpec",
      to: "ArchitectureSpec",
      status: "OK",
      note: "runArchitectureFromRequirements binds requirements_reference",
    },
    {
      from: "Requirements+Architecture",
      to: "EngineeringTaskGraph",
      status: "OK",
      note: "runTaskGraphFromSpecs; gate_allows_execution_planning",
    },
    {
      from: "EngineeringTaskGraph",
      to: "Supervisor/AgentAssignment",
      status: "OK",
      note: "Supervisor.bindTaskGraph + createDelegation/claim",
    },
    {
      from: "Delegation",
      to: "AgentExecutor/Decision",
      status: "OK",
      note: "executeDelegation → ReasoningProvider",
    },
    {
      from: "Decision",
      to: "EngineeringWorker",
      status: "OK",
      note: "Composition maps IMPLEMENTATION_PROPOSAL → Worker.run (not Agent→Provider)",
    },
    {
      from: "Worker",
      to: "Tests+Review+Validation",
      status: "OK",
      note: "test.run + EngineeringReviewer + buildValidationResult",
    },
    {
      from: "Task completion",
      to: "Project completion",
      status: "OK",
      note: "SoftwareEngineeringProject aggregates required tasks",
    },
    {
      from: "Review REPLAN",
      to: "A04 lineage",
      status: "OK",
      note: "createNextTaskGraphVersion / replaceTask — Supervisor does not mutate baselines arbitrarily",
    },
  ];
  return {
    seams,
    gaps: seams.filter((s) => s.status === "GAP").map((s) => s.note),
  };
}
