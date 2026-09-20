/**
 * SkillJob lifecycle + claim/lease semantics (local filesystem).
 *
 * Delivery semantics: **at-least-once**.
 * - Duplicate claim of an active lease is rejected.
 * - Expired lease may be reclaimed → handler may run twice if prior worker died after side effects.
 * - Completion write is last-writer-wins on result file; engine consumes first successful poll.
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  renameSync,
  openSync,
  closeSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";

export type SkillJobStatus =
  | "pending"
  | "claimed"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

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
  status: SkillJobStatus;
  /** Flat execution inputs (from IR node constraints) for autonomous workers */
  constraints?: Record<string, unknown>;
  /** Optional correlation */
  execution_id?: string;
  intent_id?: string;
  /** Claim / lease */
  claimed_at?: string;
  worker_id?: string;
  attempt?: number;
  lease_until?: string;
  started_at?: string;
  finished_at?: string;
}

export interface SkillJobResult {
  run_id: string;
  success: boolean;
  evidence_path?: string;
  error?: string;
  completed_at: string;
  worker_id?: string;
  attempt?: number;
}

export interface ClaimOptions {
  workerId: string;
  leaseMs?: number;
  now?: () => number;
}

export interface ClaimResult {
  ok: boolean;
  job?: SkillJob;
  reason?: "not_found" | "not_claimable" | "race_lost" | "completed";
}

const DEFAULT_LEASE_MS = 60_000;

function lockPath(jobsDir: string, runId: string): string {
  return join(jobsDir, `${runId}.lock`);
}

function jobPath(jobsDir: string, runId: string): string {
  return join(jobsDir, `${runId}.json`);
}

function resultPath(jobsDir: string, runId: string): string {
  return join(jobsDir, `${runId}.result.json`);
}

function isLeaseExpired(job: SkillJob, nowMs: number): boolean {
  if (!job.lease_until) return true;
  return Date.parse(job.lease_until) <= nowMs;
}

function isTerminal(status: SkillJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export class JobStore {
  constructor(private jobsDir: string) {
    mkdirSync(jobsDir, { recursive: true });
  }

  listPending(): SkillJob[] {
    return this.listByStatus("pending");
  }

  /** Jobs that are pending or have an expired claim/lease. */
  listClaimable(nowMs = Date.now()): SkillJob[] {
    if (!existsSync(this.jobsDir)) return [];
    return readdirSync(this.jobsDir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".result.json"))
      .map((f) => this.readJob(f.replace(/\.json$/, "")))
      .filter((j): j is SkillJob => {
        if (!j) return false;
        if (isTerminal(j.status)) return false;
        if (j.status === "pending") return true;
        if ((j.status === "claimed" || j.status === "running") && isLeaseExpired(j, nowMs)) {
          return true;
        }
        return false;
      });
  }

  listByStatus(status: SkillJobStatus): SkillJob[] {
    if (!existsSync(this.jobsDir)) return [];
    return readdirSync(this.jobsDir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".result.json"))
      .map((f) => this.readJob(f.replace(/\.json$/, "")))
      .filter((j): j is SkillJob => j !== null && j.status === status);
  }

  readJob(runId: string): SkillJob | null {
    const path = jobPath(this.jobsDir, runId);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8")) as SkillJob;
  }

  writeJob(job: SkillJob): void {
    writeFileSync(jobPath(this.jobsDir, job.run_id), JSON.stringify(job, null, 2));
  }

  readResult(runId: string): SkillJobResult | null {
    const path = resultPath(this.jobsDir, runId);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8")) as SkillJobResult;
  }

  hasCompletedResult(runId: string): boolean {
    const job = this.readJob(runId);
    const result = this.readResult(runId);
    return !!job && !!result && (job.status === "completed" || job.status === "failed");
  }

  /**
   * Atomic claim via exclusive lock file (`wx`).
   * Expired locks/leases may be stolen.
   */
  claimJob(runId: string, options: ClaimOptions): ClaimResult {
    const nowMs = options.now?.() ?? Date.now();
    const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
    const job = this.readJob(runId);
    if (!job) return { ok: false, reason: "not_found" };
    if (isTerminal(job.status)) return { ok: false, reason: "completed" };

    const claimable =
      job.status === "pending" ||
      ((job.status === "claimed" || job.status === "running") && isLeaseExpired(job, nowMs));
    if (!claimable) return { ok: false, reason: "not_claimable" };

    const lock = lockPath(this.jobsDir, runId);
    if (existsSync(lock)) {
      try {
        const prev = JSON.parse(readFileSync(lock, "utf-8")) as {
          worker_id: string;
          lease_until: string;
        };
        if (Date.parse(prev.lease_until) > nowMs) {
          return { ok: false, reason: "race_lost" };
        }
        unlinkSync(lock);
      } catch {
        try {
          unlinkSync(lock);
        } catch {
          /* ignore */
        }
      }
    }

    const leaseUntil = new Date(nowMs + leaseMs).toISOString();
    try {
      const fd = openSync(lock, "wx");
      writeFileSync(
        fd,
        JSON.stringify(
          {
            worker_id: options.workerId,
            claimed_at: new Date(nowMs).toISOString(),
            lease_until: leaseUntil,
            run_id: runId,
          },
          null,
          2,
        ),
      );
      closeSync(fd);
    } catch {
      return { ok: false, reason: "race_lost" };
    }

    // Re-read after lock — another writer may have completed
    const fresh = this.readJob(runId);
    if (!fresh || isTerminal(fresh.status)) {
      try {
        unlinkSync(lock);
      } catch {
        /* ignore */
      }
      return { ok: false, reason: "completed" };
    }

    const attempt = (fresh.attempt ?? 0) + 1;
    const claimed: SkillJob = {
      ...fresh,
      status: "claimed",
      claimed_at: new Date(nowMs).toISOString(),
      worker_id: options.workerId,
      attempt,
      lease_until: leaseUntil,
    };
    this.writeJob(claimed);
    return { ok: true, job: claimed };
  }

  markRunning(runId: string, workerId: string): SkillJob | null {
    const job = this.readJob(runId);
    if (!job || job.worker_id !== workerId) return null;
    if (job.status !== "claimed" && job.status !== "running") return null;
    const next: SkillJob = {
      ...job,
      status: "running",
      started_at: job.started_at ?? new Date().toISOString(),
    };
    this.writeJob(next);
    return next;
  }

  /** Renew lease while still running (same worker). */
  renewLease(runId: string, workerId: string, leaseMs = DEFAULT_LEASE_MS): boolean {
    const job = this.readJob(runId);
    if (!job || job.worker_id !== workerId) return false;
    if (job.status !== "claimed" && job.status !== "running") return false;
    const leaseUntil = new Date(Date.now() + leaseMs).toISOString();
    this.writeJob({ ...job, lease_until: leaseUntil });
    const lock = lockPath(this.jobsDir, runId);
    if (existsSync(lock)) {
      writeFileSync(
        lock,
        JSON.stringify({ worker_id: workerId, lease_until: leaseUntil, run_id: runId }, null, 2),
      );
    }
    return true;
  }

  completeJob(runId: string, result: Omit<SkillJobResult, "run_id" | "completed_at">): void {
    const job = this.readJob(runId);
    if (!job) throw new Error(`Job not found: ${runId}`);

    const finished: SkillJob = {
      ...job,
      status: result.success ? "completed" : "failed",
      finished_at: new Date().toISOString(),
    };
    // Atomic-ish: write temp then rename job file
    const tmp = jobPath(this.jobsDir, runId) + `.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify(finished, null, 2));
    renameSync(tmp, jobPath(this.jobsDir, runId));

    const full: SkillJobResult = {
      run_id: runId,
      completed_at: new Date().toISOString(),
      worker_id: result.worker_id ?? job.worker_id,
      attempt: result.attempt ?? job.attempt,
      ...result,
    };
    writeFileSync(resultPath(this.jobsDir, runId), JSON.stringify(full, null, 2));

    try {
      unlinkSync(lockPath(this.jobsDir, runId));
    } catch {
      /* ignore */
    }
  }

  releaseClaim(runId: string, workerId: string, toStatus: "pending" | "cancelled" = "pending"): void {
    const job = this.readJob(runId);
    if (!job || job.worker_id !== workerId) return;
    if (isTerminal(job.status)) return;
    this.writeJob({
      ...job,
      status: toStatus,
      worker_id: undefined,
      claimed_at: undefined,
      lease_until: undefined,
    });
    try {
      unlinkSync(lockPath(this.jobsDir, runId));
    } catch {
      /* ignore */
    }
  }

  deleteResult(runId: string): void {
    const path = resultPath(this.jobsDir, runId);
    if (existsSync(path)) unlinkSync(path);
  }
}
