import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Evidence, ExecuteResult, GraphNode } from "../types/index.js";
import type { SkillJob, SkillJobResult } from "./job-store.js";

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
    evidence = loadEvidenceFile(result.evidence_path);
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
