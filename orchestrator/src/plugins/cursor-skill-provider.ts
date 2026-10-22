import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Evidence, EvidenceCheck, ExecuteRequest, ExecuteResult, ProviderManifest, ProviderRuntime } from "../types/index.js";
import { unverifiedDodChecks } from "../evidence/builders.js";
import { recordSkillLifecycle } from "../telemetry/skill-telemetry.js";
import type { EventBus } from "../events/event-bus.js";
import {
  extractContextRetrievalFromRequest,
  extractGateBundleFromRequest,
} from "../jobs/spawn-pickup-context.js";

/** Executes a capability — pluggable bridge (shell, subagent, job file). */
export interface SkillExecutor {
  execute(request: ExecuteRequest, skillPath: string, manifest: ProviderManifest): Promise<ExecuteResult>;
}

/** Writes job JSON for external Cursor agent pickup — Phase C handoff. */
export class JobFileExecutor implements SkillExecutor {
  constructor(private jobsDir: string) {}

  async execute(request: ExecuteRequest, skillPath: string, manifest: ProviderManifest): Promise<ExecuteResult> {
    const jobPath = resolve(this.jobsDir, `${request.run_id}.json`);
    mkdirSync(dirname(jobPath), { recursive: true });

    const featureId = request.memory_scope;
    const job = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "SkillJob",
      run_id: request.run_id,
      provider_id: manifest.metadata.name,
      skill_path: skillPath,
      capability: request.capability,
      node_id: request.node_id,
      briefing: request.briefing,
      definition_of_done: request.definition_of_done,
      inputs: request.inputs,
      status: "pending",
      feature_id: featureId,
      gate_bundle: extractGateBundleFromRequest(request, manifest, featureId),
      context_retrieval: extractContextRetrievalFromRequest(request),
      spawn_metadata: request.node.metadata ?? {},
    };

    writeFileSync(jobPath, JSON.stringify(job, null, 2));

    return {
      run_id: request.run_id,
      success: false,
      error: {
        code: "JOB_PENDING",
        message: `Skill job written to ${jobPath} — awaiting external executor`,
      },
      duration_ms: 0,
      provider_id: manifest.metadata.name,
    };
  }
}

/** In-process executor for tests — returns success with evidence. */
export class CallbackSkillExecutor implements SkillExecutor {
  constructor(
    private fn: (request: ExecuteRequest, skillPath: string) => Promise<ExecuteResult>,
  ) {}

  async execute(request: ExecuteRequest, skillPath: string): Promise<ExecuteResult> {
    return this.fn(request, skillPath);
  }
}

export interface CursorSkillProviderOptions {
  /** Optional observe-only telemetry (EventBus +/or JSONL dir). Never affects execute outcome. */
  telemetryBus?: EventBus;
  telemetryEventsDir?: string;
}

/** Provider that loads SKILL.md and delegates to SkillExecutor — plugin type cursor-skill. */
export class CursorSkillProvider implements ProviderRuntime {
  readonly id: string;
  private skillPath: string;
  private manifest: ProviderManifest;
  private telemetryBus?: EventBus;
  private telemetryEventsDir?: string;

  constructor(
    manifest: ProviderManifest,
    private executor: SkillExecutor,
    workspaceRoot: string,
    options?: CursorSkillProviderOptions,
  ) {
    this.id = manifest.metadata.name;
    this.manifest = manifest;
    const entry = manifest.spec.plugin.entrypoint;
    this.skillPath = resolve(workspaceRoot, entry);
    this.telemetryBus = options?.telemetryBus;
    this.telemetryEventsDir = options?.telemetryEventsDir;
  }

  supports(_mode?: string): boolean {
    return true;
  }

  async cancel(_runId: string): Promise<void> {
    /* noop — external executor handles cancellation */
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    const start = Date.now();
    const tel = { bus: this.telemetryBus, eventsDir: this.telemetryEventsDir };
    try {
      readFileSync(this.skillPath, "utf-8");
      recordSkillLifecycle(tel, {
        event_type: "LOADED",
        skill_id: this.id,
        skill_version: this.manifest.metadata.version,
        execution_id: request.run_id,
        feature_id: request.node?.id,
        source: "CursorSkillProvider",
        provider: this.id,
        context: request.capability,
      });
    } catch {
      recordSkillLifecycle(tel, {
        event_type: "FAILED",
        skill_id: this.id,
        execution_id: request.run_id,
        source: "CursorSkillProvider",
        success: false,
        failure_reason: "SKILL_NOT_FOUND",
      });
      return {
        run_id: request.run_id,
        success: false,
        error: { code: "SKILL_NOT_FOUND", message: `SKILL.md not found: ${this.skillPath}` },
        duration_ms: Date.now() - start,
        provider_id: this.id,
      };
    }

    const result = await this.executor.execute(request, this.skillPath, this.manifest);
    const duration_ms = result.duration_ms || Date.now() - start;
    recordSkillLifecycle(tel, {
      event_type: result.success === false && result.error?.code === "JOB_PENDING" ? "ACTIVATED" : "EXECUTED",
      skill_id: this.id,
      skill_version: this.manifest.metadata.version,
      execution_id: request.run_id,
      source: "CursorSkillProvider",
      provider: this.id,
      context: request.capability,
      success: result.success || result.error?.code === "JOB_PENDING",
      failure_reason: result.error?.code,
      duration_ms,
    });
    return { ...result, duration_ms };
  }

  getSkillPath(): string {
    return this.skillPath;
  }
}

type ShellObservation = {
  exitCode?: unknown;
  exit_code?: unknown;
  timedOut?: unknown;
  timed_out?: unknown;
  command?: unknown;
};

function shellEvidence(
  request: ExecuteRequest,
  providerId: string,
  checks: EvidenceCheck[],
  status: Evidence["spec"]["status"],
  verdict: Evidence["spec"]["verdict"],
): Evidence {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "Evidence",
    metadata: {
      node_id: request.node.id,
      run_id: request.run_id,
      emitter: request.node.type === "gate" ? "gate" : "worker",
      provider_id: providerId,
      capability: request.capability,
      submitted_at: new Date().toISOString(),
    },
    spec: {
      status,
      confidence: status === "complete" ? 0.9 : 0.2,
      coverage: 0,
      assumptions: [],
      checks,
      verdict: verdict ?? null,
    },
  };
}

function readShellObservation(
  exitCodeOrResult: unknown,
  commandArg: string,
): { exitCode: number | null; timedOut: boolean; command: string } | { malformed: true } {
  if (typeof exitCodeOrResult === "number") {
    if (!Number.isInteger(exitCodeOrResult)) return { malformed: true };
    return { exitCode: exitCodeOrResult, timedOut: false, command: commandArg };
  }
  if (exitCodeOrResult == null || typeof exitCodeOrResult !== "object" || Array.isArray(exitCodeOrResult)) {
    return { malformed: true };
  }
  const raw = exitCodeOrResult as ShellObservation;
  const timedOut = raw.timedOut === true || raw.timed_out === true;
  const exitRaw = raw.exitCode !== undefined ? raw.exitCode : raw.exit_code;
  const command = typeof raw.command === "string" ? raw.command : commandArg;
  if (timedOut) {
    const exitCode = typeof exitRaw === "number" && Number.isInteger(exitRaw) ? exitRaw : null;
    return { exitCode, timedOut: true, command };
  }
  if (typeof exitRaw !== "number" || !Number.isInteger(exitRaw)) return { malformed: true };
  return { exitCode: exitRaw, timedOut: false, command };
}

/** Build an execution result from a shell observation. Exit 0 does not prove DoD. */
export function evidenceFromShellResult(
  request: ExecuteRequest,
  providerId: string,
  exitCodeOrResult: unknown,
  command = "",
): ExecuteResult {
  const observed = readShellObservation(exitCodeOrResult, command);
  if ("malformed" in observed) {
    return {
      run_id: request.run_id,
      success: false,
      provider_id: providerId,
      duration_ms: 0,
      error: { code: "MALFORMED_SHELL_RESULT", message: "Shell result is missing or not an integer exit code" },
      evidence: shellEvidence(request, providerId, unverifiedDodChecks(request.definition_of_done), "failed", null),
    };
  }

  const failChecks = request.definition_of_done.map((dod) => ({
    dod_id: dod.id,
    result: "fail" as const,
    verification: dod.verification,
    command: observed.command,
    ...(observed.exitCode === null ? {} : { exit_code: observed.exitCode }),
    details: observed.timedOut ? "timeout" : "nonzero_exit",
  }));

  if (observed.timedOut) {
    return {
      run_id: request.run_id,
      success: false,
      provider_id: providerId,
      duration_ms: 0,
      error: { code: "EXECUTOR_TIMEOUT", message: "Shell command timed out" },
      evidence: shellEvidence(
        request,
        providerId,
        failChecks,
        "failed",
        request.node.type === "gate" ? "rejected" : null,
      ),
    };
  }

  if (observed.exitCode !== 0) {
    return {
      run_id: request.run_id,
      success: false,
      provider_id: providerId,
      duration_ms: 0,
      error: { code: "NONZERO_EXIT", message: `Exit code ${observed.exitCode}` },
      evidence: shellEvidence(
        request,
        providerId,
        failChecks,
        "failed",
        request.node.type === "gate" ? "rejected" : null,
      ),
    };
  }

  const checks = unverifiedDodChecks(request.definition_of_done).map((check) => ({
    ...check,
    command: observed.command,
    exit_code: 0,
  }));
  const evidence = shellEvidence(request, providerId, checks, checks.length === 0 ? "complete" : "partial", null);
  return {
    run_id: request.run_id,
    success: true,
    provider_id: providerId,
    duration_ms: 0,
    evidence,
  };
}
