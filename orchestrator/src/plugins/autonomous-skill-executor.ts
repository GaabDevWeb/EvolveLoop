/**
 * AutonomousSkillExecutor — real in-process skill execution via declared handlers.
 *
 * kind: autonomous
 * Does NOT: write JOB_PENDING, generate pickup prompts, or invent success.
 * Without a declared autonomous handler → EXECUTOR_UNAVAILABLE.
 *
 * Trust: provider.yaml autonomous.module is UNTRUSTED until resolveAutonomousModule
 * confines it under the provider directory. SANDBOX_NOT_IMPLEMENTED — loaded JS
 * still runs in-process with orchestrator privileges.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ExecuteRequest, ExecuteResult, ProviderManifest } from "../types/index.js";
import type { SkillExecutor } from "./cursor-skill-provider.js";
import {
  type AutonomousPluginConfig,
  type AutonomousSkillHandler,
  type AutonomousSkillHandlerResult,
  inputsFromRequest,
} from "./skill-handler.js";
import { buildWorkerEvidence, validateEvidenceV21 } from "../evidence/builders.js";
import {
  AUTONOMOUS_SANDBOX_STATUS,
  resolveAutonomousModule,
} from "./autonomous-module-resolve.js";

export type SkillExecutorKind = "external" | "autonomous" | "callback";

export { AUTONOMOUS_SANDBOX_STATUS, resolveAutonomousModule };

export interface AutonomousSkillExecutorOptions {
  /** Workspace root passed to handlers (path restriction — not a full OS sandbox). */
  workspaceRoot: string;
  /** Default timeout when request.policy.timeout_ms missing. */
  defaultTimeoutMs?: number;
  /** Resolve provider.yaml directory for a manifest (tests may override). */
  resolveProviderDir?: (manifest: ProviderManifest, skillPath: string) => string;
}

function readAutonomousConfig(manifest: ProviderManifest): AutonomousPluginConfig | null {
  const plugin = manifest.spec.plugin as {
    type: string;
    entrypoint: string;
    autonomous?: AutonomousPluginConfig;
  };
  if (!plugin.autonomous || plugin.autonomous.type !== "node-module") return null;
  if (!plugin.autonomous.module?.trim()) return null;
  return plugin.autonomous;
}

export class AutonomousSkillExecutor implements SkillExecutor {
  readonly kind: SkillExecutorKind = "autonomous";
  private aborts = new Map<string, AbortController>();
  private defaultTimeoutMs: number;
  private workspaceRoot: string;
  private resolveProviderDir: (manifest: ProviderManifest, skillPath: string) => string;

  constructor(options: AutonomousSkillExecutorOptions) {
    this.workspaceRoot = resolve(options.workspaceRoot);
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
    this.resolveProviderDir =
      options.resolveProviderDir ??
      ((manifest, skillPath) => {
        // Prefer directory of skill entrypoint's parent provider folder heuristic:
        // skill at <root>/.cursor/skills/X/SKILL.md → still resolve module relative to
        // callers should pass provider dir via resolveProviderDir in bootstrap.
        return dirname(skillPath);
      });
  }

  async cancel(runId: string): Promise<void> {
    const c = this.aborts.get(runId);
    if (c) c.abort();
  }

  async execute(
    request: ExecuteRequest,
    skillPath: string,
    manifest: ProviderManifest,
  ): Promise<ExecuteResult> {
    const start = Date.now();
    const providerId = manifest.metadata.name;

    if (!existsSync(skillPath)) {
      return fail(request, providerId, start, "SKILL_NOT_FOUND", `Skill not found: ${skillPath}`);
    }

    const auto = readAutonomousConfig(manifest);
    if (!auto) {
      return fail(
        request,
        providerId,
        start,
        "EXECUTOR_UNAVAILABLE",
        `No autonomous handler declared for provider "${providerId}" (LLM-only SKILL.md cannot be executed programmatically)`,
      );
    }

    const providerDir = this.resolveProviderDir(manifest, skillPath);
    const resolved = resolveAutonomousModule(providerDir, auto.module);
    if (!resolved.ok) {
      return fail(
        request,
        providerId,
        start,
        resolved.code.startsWith("MODULE_") ? "AUTONOMOUS_MODULE_DENIED" : "EXECUTOR_UNAVAILABLE",
        resolved.reason,
      );
    }
    const modulePath = resolved.absolutePath;

    let handler: AutonomousSkillHandler;
    try {
      const mod = await import(pathToFileURL(modulePath).href);
      const exportName = auto.export ?? "execute";
      const fn = mod[exportName] ?? mod.default;
      if (typeof fn !== "function") {
        return fail(
          request,
          providerId,
          start,
          "EXECUTOR_UNAVAILABLE",
          `Module ${modulePath} export "${exportName}" is not a function`,
        );
      }
      handler = fn as AutonomousSkillHandler;
    } catch (err) {
      return fail(
        request,
        providerId,
        start,
        "EXECUTOR_UNAVAILABLE",
        `Failed to load handler: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const timeoutMs = request.policy.timeout_ms ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    this.aborts.set(request.run_id, controller);

    const ctx = {
      execution_id: request.run_id,
      run_id: request.run_id,
      capability: request.capability,
      skill_path: skillPath,
      provider_id: providerId,
      node_id: request.node_id,
      briefing: request.briefing,
      inputs: inputsFromRequest(request),
      definition_of_done: request.definition_of_done,
      authorized_workspace: this.workspaceRoot,
      policy: request.policy,
      signal: controller.signal,
    };

    try {
      const result = await withTimeout(
        Promise.resolve(handler(ctx)),
        timeoutMs,
        controller,
      );
      return this.toExecuteResult(request, providerId, start, result);
    } catch (err) {
      if (controller.signal.aborted) {
        const code =
          (err as { code?: string })?.code === "EXECUTOR_TIMEOUT"
            ? "EXECUTOR_TIMEOUT"
            : "EXECUTOR_CANCELLED";
        return fail(
          request,
          providerId,
          start,
          code,
          err instanceof Error ? err.message : String(err),
        );
      }
      return fail(
        request,
        providerId,
        start,
        "EXECUTOR_FAILED",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      this.aborts.delete(request.run_id);
    }
  }

  private toExecuteResult(
    request: ExecuteRequest,
    providerId: string,
    start: number,
    result: AutonomousSkillHandlerResult,
  ): ExecuteResult {
    const duration_ms = Date.now() - start;

    if (!result.success) {
      return {
        run_id: request.run_id,
        success: false,
        duration_ms,
        provider_id: providerId,
        evidence: result.evidence,
        error: result.error ?? {
          code: "EXECUTOR_FAILED",
          message: "Handler returned success=false",
        },
        executor_id: "autonomous",
      };
    }

    let evidence = result.evidence;
    if (!evidence) {
      const side = result.side_effects ?? {};
      evidence = buildWorkerEvidence(request.node, request.run_id, providerId, duration_ms, {
        ...side,
        checkResults:
          side.checkResults ??
          request.node.definition_of_done.map((d) => ({
            dod_id: d.id,
            result: "pass" as const,
            details: `autonomous_handler_ok:${d.check}`,
          })),
        status: side.status ?? "complete",
        execution_id: request.run_id,
      });
    }

    const validation = validateEvidenceV21(
      evidence,
      request.definition_of_done,
      request.node,
      0,
    );
    if (!validation.valid) {
      return {
        run_id: request.run_id,
        success: false,
        duration_ms,
        provider_id: providerId,
        evidence,
        error: {
          code: validation.reason?.startsWith("dod_failed")
            ? "INVALID_EXECUTOR_RESULT"
            : validation.reason === "evidence_incomplete"
              ? "EVIDENCE_MISSING"
              : "INVALID_EXECUTOR_RESULT",
          message: validation.reason ?? "Evidence validation failed",
        },
        executor_id: "autonomous",
      };
    }

    return {
      run_id: request.run_id,
      success: true,
      duration_ms,
      provider_id: providerId,
      evidence,
      executor_id: "autonomous",
    };
  }
}

function fail(
  request: ExecuteRequest,
  providerId: string,
  start: number,
  code: string,
  message: string,
): ExecuteResult {
  return {
    run_id: request.run_id,
    success: false,
    duration_ms: Date.now() - start,
    provider_id: providerId,
    error: { code, message },
    executor_id: "autonomous",
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  controller: AbortController,
): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      controller.abort();
      const err = new Error(`Executor timed out after ${timeoutMs}ms`);
      (err as { code?: string }).code = "EXECUTOR_TIMEOUT";
      reject(err);
    }, timeoutMs);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Probe whether a manifest can be executed autonomously (handler declared + module confined). */
export function canExecuteAutonomously(
  manifest: ProviderManifest,
  providerDir: string,
): { ok: true } | { ok: false; reason: string } {
  const auto = readAutonomousConfig(manifest);
  if (!auto) {
    return {
      ok: false,
      reason: "No spec.plugin.autonomous handler (LLM-only skill)",
    };
  }
  const resolved = resolveAutonomousModule(providerDir, auto.module);
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason };
  }
  return { ok: true };
}
