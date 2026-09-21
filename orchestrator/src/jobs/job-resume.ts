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

/**
 * Convert external job completion into ExecuteResult.
 * Fail-closed: success requires a loadable Evidence file — never invent DoD PASS.
 */
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

  if (!result.evidence_path?.trim()) {
    return {
      run_id: job.run_id,
      success: false,
      provider_id: job.provider_id,
      duration_ms: 0,
      error: {
        code: "EVIDENCE_MISSING",
        message: "External job marked success but evidence_path is required (no invented PASS)",
      },
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
        message: err instanceof Error ? err.message : "Evidence file unreadable",
      },
    };
  }

  // Structural sanity — empty/non-object must not become success
  if (evidence == null || typeof evidence !== "object" || evidence.kind !== "Evidence") {
    return {
      run_id: job.run_id,
      success: false,
      provider_id: job.provider_id,
      duration_ms: 0,
      error: {
        code: "EVIDENCE_INVALID",
        message: "Evidence file is not a valid Evidence document",
      },
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
