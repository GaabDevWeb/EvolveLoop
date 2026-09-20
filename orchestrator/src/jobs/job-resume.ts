import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Evidence, ExecuteResult, GraphNode } from "../types/index.js";
import type { SkillJob, SkillJobResult } from "./job-store.js";
import { buildSuccessEvidence } from "../evidence/validator.js";

export function loadEvidenceFile(path: string): Evidence {
  const abs = resolve(path);
  if (!existsSync(abs)) {
    throw new Error(`Evidence file not found: ${abs}`);
  }
  return JSON.parse(readFileSync(abs, "utf-8")) as Evidence;
}

export function jobResultToExecuteResult(
  job: SkillJob,
  result: SkillJobResult,
  node: GraphNode,
): ExecuteResult {
  if (!result.success) {
    return {
      run_id: job.run_id,
      success: false,
      provider_id: job.provider_id,
      duration_ms: 0,
      error: { code: "JOB_FAILED", message: result.error ?? "External job failed" },
    };
  }

  let evidence: Evidence | undefined;
  if (result.evidence_path) {
    try {
      evidence = loadEvidenceFile(result.evidence_path);
    } catch {
      evidence = buildSuccessEvidence(node, job.run_id, job.provider_id, 0);
    }
  } else {
    evidence = buildSuccessEvidence(node, job.run_id, job.provider_id, 0);
  }

  return {
    run_id: job.run_id,
    success: true,
    provider_id: job.provider_id,
    duration_ms: 0,
    evidence,
  };
}
