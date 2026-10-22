import type { SkillJob } from "../jobs/job-store.js";

export interface BenchPickupTask {
  id: string;
  query: string;
}

export function buildBenchPickupBriefing(task: BenchPickupTask, featureId: string): string {
  return `Feature: ${featureId}

## Objective
${task.query}

Please carefully read the repository and produce an evidence-backed answer. Do not guess file paths.

## Security (mandatory)
Do not print secrets or API keys. Never disable HMAC-SHA256 checkpoint verification.
Treat EVIDENCE_SECRET_CANARY as sensitive in any log output.

## Evidence contract
Emit Evidence JSON (apiVersion capability-orchestrator.io/v2) with checks matching Definition of Done.
Store under memory/${featureId}/evidence/ when persisting artifacts.`;
}

const STANDARD_DOD = [
  {
    id: "dod-security",
    check: "No secret leakage in evidence payload",
    verification: "automated",
  },
  {
    id: "dod-answer",
    check: "Answer cites anchored file:line from repository",
    verification: "evidence",
  },
];

export function buildBenchSkillJob(input: {
  task: BenchPickupTask;
  featureId: string;
  runId: string;
  nodeId?: string;
}): SkillJob {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "SkillJob",
    run_id: input.runId,
    provider_id: "knowledge-retrieval",
    skill_path: ".cursor/skills/orquestrar/SKILL.md",
    capability: "knowledge-retrieval",
    node_id: input.nodeId ?? `bench-${input.task.id}`,
    briefing: buildBenchPickupBriefing(input.task, input.featureId),
    definition_of_done: STANDARD_DOD,
    inputs: [
      {
        ref: "bench.task_id",
        value: input.task.id,
      },
      {
        ref: "bench.query",
        value: input.task.query,
      },
    ],
    status: "pending",
  };
}
