import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

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
    writeFileSync(join(this.jobsDir, `${runId}.json`), JSON.stringify(job, null, 2));

    const full: SkillJobResult = {
      run_id: runId,
      completed_at: new Date().toISOString(),
      ...result,
    };
    writeFileSync(join(this.jobsDir, `${runId}.result.json`), JSON.stringify(full, null, 2));
  }

  deleteResult(runId: string): void {
    const path = join(this.jobsDir, `${runId}.result.json`);
    if (existsSync(path)) unlinkSync(path);
  }
}
