import { readdirSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  copySanitizedEvidenceToJobsDir,
  relativeJobsEvidencePath,
  writeSanitizedJsonFile,
} from "../evidence/evidence-bus.js";

import type { GateBundleFields, ContextRetrievalEntry } from "../context/types.js";

export interface SkillJob {
  apiVersion: string;
  kind: "SkillJob";
  run_id: string;
  provider_id: string;
  skill_path: string;
  capability: string;
  node_id: string;
  briefing: string;
  definition_of_done: unknown[];
  inputs: unknown[];
  status: "pending" | "completed" | "failed";
  /** PDA spawn — ADR-0013 / V22-GOAL-006 */
  feature_id?: string;
  gate_bundle?: GateBundleFields;
  context_retrieval?: ContextRetrievalEntry[];
  evidence_paths?: string[];
  spawn_metadata?: Record<string, unknown>;
}

export interface SkillJobResult {
  run_id: string;
  success: boolean;
  evidence_path?: string;
  error?: string;
  completed_at: string;
}

export class JobStore {
  constructor(private jobsDir: string) {}

  listPending(): SkillJob[] {
    if (!existsSync(this.jobsDir)) return [];
    return readdirSync(this.jobsDir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".result.json"))
      .map((f) => this.readJob(f.replace(/\.json$/, "")))
      .filter((j): j is SkillJob => j !== null && j.status === "pending");
  }

  readJob(runId: string): SkillJob | null {
    const path = join(this.jobsDir, `${runId}.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8")) as SkillJob;
  }

  readResult(runId: string): SkillJobResult | null {
    const path = join(this.jobsDir, `${runId}.result.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8")) as SkillJobResult;
  }

  hasCompletedResult(runId: string): boolean {
    const job = this.readJob(runId);
    const result = this.readResult(runId);
    return !!job && !!result && (job.status === "completed" || job.status === "failed");
  }

  completeJob(runId: string, result: Omit<SkillJobResult, "run_id" | "completed_at">): void {
    const job = this.readJob(runId);
    if (!job) throw new Error(`Job not found: ${runId}`);

    job.status = result.success ? "completed" : "failed";
    writeSanitizedJsonFile(join(this.jobsDir, `${runId}.json`), job);

    let evidence_path = result.evidence_path;
    if (result.success && evidence_path && existsSync(resolve(evidence_path))) {
      copySanitizedEvidenceToJobsDir(this.jobsDir, runId, evidence_path);
      evidence_path = relativeJobsEvidencePath(runId);
    }

    const full: SkillJobResult = {
      run_id: runId,
      completed_at: new Date().toISOString(),
      ...result,
      evidence_path,
    };
    writeSanitizedJsonFile(join(this.jobsDir, `${runId}.result.json`), full);
  }

  deleteResult(runId: string): void {
    const path = join(this.jobsDir, `${runId}.result.json`);
    if (existsSync(path)) unlinkSync(path);
  }

  /** Reopen a completed/failed job so external executor can submit new evidence (e.g. after LINEAGE_MISMATCH). */
  reopenJob(runId: string): SkillJob {
    const job = this.readJob(runId);
    if (!job) throw new Error(`Job not found: ${runId}`);
    if (job.status === "pending") {
      throw new Error(
        `REOPEN_NOT_ALLOWED: job ${runId} is already pending; reopen only applies to completed or failed jobs`,
      );
    }
    this.deleteResult(runId);
    job.status = "pending";
    writeSanitizedJsonFile(join(this.jobsDir, `${runId}.json`), job);
    return job;
  }
}
