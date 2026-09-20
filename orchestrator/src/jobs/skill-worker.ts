/**
 * Skill worker loop — claim → execute → persist.
 * Bounded: poll interval, concurrency, max jobs, graceful shutdown.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import type { ExecuteRequest, GraphNode, ProviderManifest } from "../types/index.js";
import { loadYamlFile } from "../registry/manifest-loader.js";
import { JobStore, type SkillJob } from "./job-store.js";
import { AutonomousSkillExecutor } from "../plugins/autonomous-skill-executor.js";
import { EventBus } from "../events/event-bus.js";
import { jobResultToExecuteResult } from "./job-resume.js";

export interface SkillWorkerOptions {
  jobsDir: string;
  workspaceRoot: string;
  workerId?: string;
  pollIntervalMs?: number;
  concurrency?: number;
  maxJobs?: number;
  leaseMs?: number;
  /** Resolve provider.yaml for a job (default: walk from skill_path). */
  resolveManifest?: (job: SkillJob) => ProviderManifest | null;
  eventBus?: EventBus;
  /** Stop after idle polls when set (tests). */
  idleExitPolls?: number;
  signal?: AbortSignal;
}

export interface SkillWorkerStats {
  worker_id: string;
  claimed: number;
  completed: number;
  failed: number;
  skipped: number;
  running: boolean;
}

function defaultResolveManifest(job: SkillJob): ProviderManifest | null {
  // skill_path .../SKILL.md → look for ../../providers/<name>/provider.yaml is fragile.
  // Prefer sibling provider.yaml next to skill, or providers/<provider_id>/provider.yaml from CWD.
  const skillDir = dirname(job.skill_path);
  const candidates = [
    join(skillDir, "provider.yaml"),
    join(skillDir, "..", "provider.yaml"),
    join(process.cwd(), "providers", job.provider_id, "provider.yaml"),
    join(process.cwd(), "orchestrator", "providers", job.provider_id, "provider.yaml"),
  ];
  for (const p of candidates) {
    try {
      return loadYamlFile<ProviderManifest>(p);
    } catch {
      /* try next */
    }
  }
  return null;
}

export class SkillWorker {
  private store: JobStore;
  private executor: AutonomousSkillExecutor;
  private workerId: string;
  private pollIntervalMs: number;
  private concurrency: number;
  private maxJobs: number;
  private leaseMs: number;
  private resolveManifest: (job: SkillJob) => ProviderManifest | null;
  private eventBus?: EventBus;
  private idleExitPolls?: number;
  private signal?: AbortSignal;
  private active = new Set<string>();
  private stopping = false;
  private stats: SkillWorkerStats;

  constructor(private options: SkillWorkerOptions) {
    this.store = new JobStore(resolve(options.jobsDir));
    this.workerId = options.workerId ?? `worker-${process.pid}`;
    this.pollIntervalMs = options.pollIntervalMs ?? 200;
    this.concurrency = Math.max(1, options.concurrency ?? 1);
    this.maxJobs = options.maxJobs ?? Number.POSITIVE_INFINITY;
    this.leaseMs = options.leaseMs ?? 60_000;
    this.resolveManifest = options.resolveManifest ?? defaultResolveManifest;
    this.eventBus = options.eventBus;
    this.idleExitPolls = options.idleExitPolls;
    this.signal = options.signal;
    this.executor = new AutonomousSkillExecutor({
      workspaceRoot: options.workspaceRoot,
      resolveProviderDir: (manifest) => {
        // module paths are relative to provider.yaml directory — resolved in executor via skill dir override below
        const entry = manifest.spec.plugin.entrypoint;
        const skillAbs = resolve(options.workspaceRoot, entry);
        return dirname(dirname(skillAbs)); // weak default; bootstrap passes better
      },
    });
    this.stats = {
      worker_id: this.workerId,
      claimed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      running: false,
    };
  }

  getStats(): SkillWorkerStats {
    return { ...this.stats };
  }

  requestStop(): void {
    this.stopping = true;
  }

  async run(): Promise<SkillWorkerStats> {
    this.stats.running = true;
    let idlePolls = 0;
    let processed = 0;

    while (!this.stopping && !this.signal?.aborted && processed < this.maxJobs) {
      if (this.active.size >= this.concurrency) {
        await sleep(this.pollIntervalMs);
        continue;
      }

      const claimable = this.store.listClaimable();
      if (claimable.length === 0) {
        idlePolls++;
        if (this.idleExitPolls !== undefined && idlePolls >= this.idleExitPolls) break;
        await sleep(this.pollIntervalMs);
        continue;
      }
      idlePolls = 0;

      const next = claimable.find((j) => !this.active.has(j.run_id));
      if (!next) {
        await sleep(this.pollIntervalMs);
        continue;
      }

      const claim = this.store.claimJob(next.run_id, {
        workerId: this.workerId,
        leaseMs: this.leaseMs,
      });
      if (!claim.ok || !claim.job) {
        this.stats.skipped++;
        continue;
      }

      this.stats.claimed++;
      this.active.add(claim.job.run_id);
      processed++;

      // Sequential within slot for simplicity when concurrency=1; fire-and-await for tests
      await this.processClaimed(claim.job);
      this.active.delete(claim.job.run_id);
    }

    // Drain: do not mark success without proof — release active claims as pending for recovery
    for (const runId of [...this.active]) {
      this.store.releaseClaim(runId, this.workerId, "pending");
      this.active.delete(runId);
    }

    this.stats.running = false;
    return this.getStats();
  }

  private async processClaimed(job: SkillJob): Promise<void> {
    this.store.markRunning(job.run_id, this.workerId);
    this.eventBus?.emit("NodeStarted", job.run_id, "skill-worker", {
      run_id: job.run_id,
      worker_id: this.workerId,
      capability: job.capability,
      provider_id: job.provider_id,
      attempt: job.attempt,
    });

    const manifest = this.resolveManifest(job);
    if (!manifest) {
      this.failJob(job, "EXECUTOR_UNAVAILABLE", "Provider manifest not found for job");
      return;
    }

    const node: GraphNode = {
      id: job.node_id,
      capability: job.capability,
      type: "worker",
      status: "running",
      dependencies: [],
      definition_of_done: (job.definition_of_done ?? []) as GraphNode["definition_of_done"],
      constraints: job.constraints,
      retry_count: (job.attempt ?? 1) - 1,
    };

    const request: ExecuteRequest = {
      run_id: job.run_id,
      node_id: job.node_id,
      capability: job.capability,
      inputs: (job.inputs ?? []) as ExecuteRequest["inputs"],
      definition_of_done: node.definition_of_done,
      policy: { retries_remaining: 0 },
      memory_scope: "job",
      knowledge_hits: [],
      briefing: job.briefing,
      node,
    };

    const exec = new AutonomousSkillExecutor({
      workspaceRoot: this.options.workspaceRoot,
      resolveProviderDir: () => dirname(job.skill_path),
    });

    const started = Date.now();
    const result = await exec.execute(request, job.skill_path, manifest);
    const duration = Date.now() - started;

    if (result.success && result.evidence) {
      const evidenceDir = join(this.options.jobsDir, "evidence");
      mkdirSync(evidenceDir, { recursive: true });
      const evidencePath = join(evidenceDir, `${job.run_id}.json`);
      writeFileSync(evidencePath, JSON.stringify(result.evidence, null, 2));
      this.store.completeJob(job.run_id, {
        success: true,
        evidence_path: evidencePath,
        worker_id: this.workerId,
        attempt: job.attempt,
      });
      this.stats.completed++;
      this.eventBus?.emit("NodeCompleted", job.run_id, "skill-worker", {
        run_id: job.run_id,
        worker_id: this.workerId,
        duration_ms: duration,
        attempt: job.attempt,
      });
    } else {
      this.failJob(
        job,
        result.error?.code ?? "EXECUTOR_FAILED",
        result.error?.message ?? "Autonomous execution failed",
      );
    }

    void jobResultToExecuteResult;
  }

  private failJob(job: SkillJob, code: string, message: string): void {
    this.store.completeJob(job.run_id, {
      success: false,
      error: `${code}: ${message}`,
      worker_id: this.workerId,
      attempt: job.attempt,
    });
    this.stats.failed++;
    this.eventBus?.emit("NodeFailed", job.run_id, "skill-worker", {
      run_id: job.run_id,
      worker_id: this.workerId,
      error: { code, message },
      attempt: job.attempt,
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
