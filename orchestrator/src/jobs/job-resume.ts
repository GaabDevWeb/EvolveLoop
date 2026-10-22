import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { Evidence, ExecuteResult, GraphNode } from "../types/index.js";
import { readSanitizedEvidence } from "../evidence/evidence-bus.js";
import type { SkillJob, SkillJobResult } from "./job-store.js";

export function loadEvidenceFile(path: string, jobsDir?: string): Evidence {
  let abs = resolve(path);
  if (!existsSync(abs) && jobsDir && !isAbsolute(path)) {
    abs = resolve(join(jobsDir, path));
  }
  if (!existsSync(abs)) {
    throw new Error(`Evidence file not found: ${abs}`);
  }
  return readSanitizedEvidence(abs);
}

export function jobResultToExecuteResult(
  job: SkillJob,
  result: SkillJobResult,
  node: GraphNode,
  jobsDir?: string,
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

  if (!result.evidence_path) {
    return {
      run_id: job.run_id,
      success: false,
      provider_id: job.provider_id,
      duration_ms: 0,
      error: { code: "EVIDENCE_MISSING", message: "External job completed without evidence_path" },
    };
  }

  let evidence: Evidence;
  try {
    evidence = loadEvidenceFile(result.evidence_path, jobsDir);
  } catch (err) {
    return {
      run_id: job.run_id,
      success: false,
      provider_id: job.provider_id,
      duration_ms: 0,
      error: {
        code: "EVIDENCE_UNREADABLE",
        message: err instanceof Error ? err.message : "Evidence file could not be read",
      },
    };
  }
  if (evidence.metadata.run_id !== job.run_id || evidence.metadata.node_id !== node.id) {
    return {
      run_id: job.run_id,
      success: false,
      provider_id: job.provider_id,
      duration_ms: 0,
      error: { code: "LINEAGE_MISMATCH", message: "Evidence run_id or node_id does not match the job" },
    };
  }

  return {
    run_id: job.run_id,
    success: true,
    provider_id: job.provider_id,
    duration_ms: 0,
    evidence,
  };
}
