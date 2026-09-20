import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ExecuteRequest, ExecuteResult, ProviderManifest, ProviderRuntime } from "../types/index.js";
import { buildSuccessEvidence } from "../evidence/validator.js";
import { recordSkillLifecycle } from "../telemetry/skill-telemetry.js";
import type { EventBus } from "../events/event-bus.js";

/** Executes a capability — pluggable bridge (shell, subagent, job file, autonomous handler). */
export interface SkillExecutor {
  readonly kind?: "external" | "autonomous" | "callback";
  execute(request: ExecuteRequest, skillPath: string, manifest: ProviderManifest): Promise<ExecuteResult>;
  cancel?(runId: string): Promise<void>;
}

/** Writes job JSON for external Cursor agent pickup — EXTERNAL_EXECUTOR mode. */
export class JobFileExecutor implements SkillExecutor {
  readonly kind = "external" as const;
  constructor(private jobsDir: string) {}

  async execute(request: ExecuteRequest, skillPath: string, manifest: ProviderManifest): Promise<ExecuteResult> {
    const jobPath = resolve(this.jobsDir, `${request.run_id}.json`);
    mkdirSync(dirname(jobPath), { recursive: true });

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
      constraints: request.node?.constraints,
      status: "pending",
      execution_id: request.run_id,
    };

    writeFileSync(jobPath, JSON.stringify(job, null, 2));

    return {
      run_id: request.run_id,
      success: false,
      error: {
        code: "JOB_PENDING",
        message: `Skill job written to ${jobPath} — awaiting EXTERNAL executor`,
      },
      duration_ms: 0,
      provider_id: manifest.metadata.name,
      executor_id: "external",
    };
  }
}

/** In-process executor for tests — returns success with evidence. */
export class CallbackSkillExecutor implements SkillExecutor {
  readonly kind = "callback" as const;
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

  async cancel(runId: string): Promise<void> {
    await this.executor.cancel?.(runId);
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

/** Build evidence from shell command result — for testing gate. */
export function evidenceFromShellResult(
  request: ExecuteRequest,
  providerId: string,
  exitCode: number,
  command: string,
): ExecuteResult {
  const success = exitCode === 0;
  const evidence = buildSuccessEvidence(
    request.node,
    request.run_id,
    providerId,
    0,
  );

  if (!success) {
    evidence.spec.status = "failed";
    evidence.spec.verdict = request.node.type === "gate" ? "rejected" : null;
  }

  evidence.spec.checks = request.definition_of_done.map((d) => ({
    dod_id: d.id,
    result: success ? "pass" : "fail",
    verification: d.verification,
    command,
    exit_code: exitCode,
  }));

  return {
    run_id: request.run_id,
    success,
    evidence: success ? evidence : undefined,
    error: success ? undefined : { code: "TEST_FAILED", message: `Exit code ${exitCode}` },
    duration_ms: 0,
    provider_id: providerId,
  };
}
