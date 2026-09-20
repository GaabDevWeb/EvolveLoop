#!/usr/bin/env node
/**
 * Job pickup / worker CLI.
 *
 * Usage:
 *   run-jobs list|show|pickup|invoke|complete|worker|status --jobs-dir ./jobs ...
 *
 * worker:
 *   run-jobs worker --jobs-dir ./jobs --workspace <root> [--max-jobs N] [--idle-exit-polls N]
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { JobStore } from "../jobs/job-store.js";
import { invokePickup } from "../jobs/job-pickup.js";
import { SkillWorker } from "../jobs/skill-worker.js";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = { command: argv[2] ?? "list" };
  for (let i = 3; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith("--")) {
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key.slice(2)] = val;
        i++;
      } else {
        args[key.slice(2)] = "true";
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const jobsDir = resolve(args["jobs-dir"] ?? "./jobs");
  const store = new JobStore(jobsDir);

  if (args.command === "list") {
    const pending = store.listPending();
    const claimable = store.listClaimable();
    console.log(
      JSON.stringify(
        { jobs_dir: jobsDir, pending: pending.length, claimable: claimable.length, jobs: pending },
        null,
        2,
      ),
    );
    return;
  }

  if (args.command === "status") {
    const claimable = store.listClaimable();
    console.log(
      JSON.stringify(
        {
          jobs_dir: jobsDir,
          pending: store.listPending().length,
          claimable: claimable.length,
          claimed: store.listByStatus("claimed").length,
          running: store.listByStatus("running").length,
          completed: store.listByStatus("completed").length,
          failed: store.listByStatus("failed").length,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.command === "show") {
    const runId = args["run-id"];
    if (!runId) {
      console.error("Required: --run-id");
      process.exit(1);
    }
    const job = store.readJob(runId);
    if (!job) {
      console.error(`Job not found: ${runId}`);
      process.exit(1);
    }
    console.log(JSON.stringify({ jobs_dir: jobsDir, job, result: store.readResult(runId) }, null, 2));
    return;
  }

  if (args.command === "pickup") {
    const runId = args["run-id"];
    const job = runId ? store.readJob(runId) : store.listPending()[0];
    if (!job) {
      console.log(JSON.stringify({ status: "idle", pending: 0, jobs_dir: jobsDir }, null, 2));
      return;
    }
    if (job.status !== "pending") {
      console.error(`Job ${job.run_id} is not pending (status: ${job.status})`);
      process.exit(1);
    }
    const pickup = {
      status: "ready",
      jobs_dir: jobsDir,
      run_id: job.run_id,
      skill_path: job.skill_path,
      capability: job.capability,
      provider_id: job.provider_id,
      briefing: job.briefing,
      definition_of_done: job.definition_of_done,
      executor_mode: "external",
      agent_instructions: [
        `1. Read skill: ${job.skill_path}`,
        `2. Execute briefing below; produce evidence per DoD`,
        `3. Complete job: npm run run-jobs -- complete --jobs-dir ${jobsDir} --run-id ${job.run_id} --success --evidence <path-to-evidence.json>`,
      ],
    };
    console.log(JSON.stringify(pickup, null, 2));
    return;
  }

  if (args.command === "invoke") {
    const promptDir = resolve(args["prompt-dir"] ?? ".cursor/pickup");
    const plan = invokePickup({
      jobsDir,
      promptDir,
      runId: args["run-id"],
    });
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (args.command === "complete") {
    const runId = args["run-id"];
    if (!runId) {
      console.error("Required: --run-id");
      process.exit(1);
    }
    if (args.success === "true") {
      if (!args.evidence) {
        console.error("Required: --evidence <path-to-evidence.json> when --success");
        process.exit(1);
      }
      const evidencePath = resolve(args.evidence);
      if (!existsSync(evidencePath)) {
        console.error(`artifact_missing: ${evidencePath}`);
        process.exit(1);
      }
    }
    store.completeJob(runId, {
      success: args.success === "true",
      evidence_path: args.evidence,
      error: args.error,
    });
    const out: Record<string, unknown> = {
      run_id: runId,
      status: "completed",
      resume_hint: `npm run run-engine -- --ir <plan.ir.yaml> --jobs-dir ${jobsDir} --resume --feature-id <feature_id>`,
    };
    if (args["resume-engine"] === "true" && args.ir) {
      out.resume_command = `npm run run-engine -- --ir ${resolve(args.ir)} --jobs-dir ${jobsDir} --resume --feature-id ${args["feature-id"] ?? ""}`;
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (args.command === "worker") {
    const workspace = resolve(args.workspace ?? process.cwd());
    const ac = new AbortController();
    const onSig = () => {
      console.error("[worker] shutdown signal — releasing in-flight claims");
      ac.abort();
    };
    process.on("SIGTERM", onSig);
    process.on("SIGINT", onSig);

    const worker = new SkillWorker({
      jobsDir,
      workspaceRoot: workspace,
      workerId: args["worker-id"],
      pollIntervalMs: args["poll-ms"] ? parseInt(args["poll-ms"], 10) : 200,
      concurrency: args.concurrency ? parseInt(args.concurrency, 10) : 1,
      maxJobs: args["max-jobs"] ? parseInt(args["max-jobs"], 10) : undefined,
      leaseMs: args["lease-ms"] ? parseInt(args["lease-ms"], 10) : 60_000,
      idleExitPolls: args["idle-exit-polls"]
        ? parseInt(args["idle-exit-polls"], 10)
        : undefined,
      signal: ac.signal,
    });

    ac.signal.addEventListener("abort", () => worker.requestStop());

    const stats = await worker.run();
    console.log(JSON.stringify({ status: "stopped", stats }, null, 2));
    process.off("SIGTERM", onSig);
    process.off("SIGINT", onSig);
    return;
  }

  console.error(
    "Usage: run-jobs list|show|pickup|invoke|complete|worker|status --jobs-dir <path> [--workspace path] [--run-id <id>] [--success] [--evidence <path>]",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
