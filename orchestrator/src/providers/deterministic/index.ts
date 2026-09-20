/**
 * DeterministicProvider — local Node handlers (no LLM).
 * Handlers live in sibling modules; this file wires capability → handler + authority.
 */

import type {
  ExecuteRequest,
  ExecuteResult,
  ProviderManifest,
  ProviderRuntime,
} from "../../types/index.js";
import { buildAuthorityEvidence, buildWorkerEvidence } from "../../evidence/builders.js";
import {
  authorize,
  type AuthorityContext,
} from "../../authority/capability-authority.js";
import { PathEscapeError } from "./paths.js";
import { requestInputs } from "./inputs.js";
import * as fsHandlers from "./filesystem.js";
import { shellExecute } from "./shell.js";
import * as gitHandlers from "./git.js";
import * as systemHandlers from "./system.js";
import { projectInspect } from "./project.js";
import { knowledgeInspect, knowledgeSearch } from "./knowledge.js";

export interface DeterministicProviderOptions {
  workspaceRoot: string;
  authority?: AuthorityContext;
  id?: string;
}

export type DeterministicHandler = (
  request: ExecuteRequest,
  ctx: { workspaceRoot: string; authority: AuthorityContext },
) => Promise<unknown> | unknown;

function parseTimeoutMs(timeout?: string): number | undefined {
  if (!timeout) return undefined;
  const m = timeout.match(/^(\d+)(m|h|s|ms)?$/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (m[2] === "h") return n * 3600_000;
  if (m[2] === "m") return n * 60_000;
  if (m[2] === "ms") return n;
  return n * 1000;
}

const DEFAULT_HANDLERS: Record<string, DeterministicHandler> = {
  "filesystem.read": (req, ctx) => {
    const inputs = requestInputs(req);
    return fsHandlers.filesystemRead(ctx.workspaceRoot, inputs.path ?? inputs.file ?? ".");
  },
  "filesystem.write": (req, ctx) => {
    const inputs = requestInputs(req);
    const path = inputs.path ?? inputs.file;
    if (!path) throw Object.assign(new Error("missing path"), { code: "MALFORMED_INPUT" });
    return fsHandlers.filesystemWrite(ctx.workspaceRoot, path, inputs.content ?? inputs.body ?? "");
  },
  "filesystem.list": (req, ctx) => {
    const inputs = requestInputs(req);
    return fsHandlers.filesystemList(ctx.workspaceRoot, inputs.path ?? ".");
  },
  "filesystem.search": (req, ctx) => {
    const inputs = requestInputs(req);
    const pattern = inputs.pattern ?? inputs.query ?? inputs.q;
    if (!pattern) throw Object.assign(new Error("missing pattern"), { code: "MALFORMED_INPUT" });
    return fsHandlers.filesystemSearch(ctx.workspaceRoot, pattern, inputs.path ?? ".");
  },
  /**
   * SE-05: test execution via allowlisted command only (not arbitrary shell).
   * Agent cannot invoke this — Worker/Runtime only.
   */
  "test.run": async (req, ctx) => {
    const inputs = requestInputs(req);
    const command = inputs.command ?? inputs.cmd ?? "npm test";
    const allowed = (inputs.allowed_commands ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const allowlist = allowed.length
      ? allowed
      : ["npm test", "npm run test", "npx vitest run", "node --test"];
    if (!allowlist.includes(command) && !allowlist.some((a) => command.startsWith(a + " "))) {
      throw Object.assign(new Error(`test command not allowlisted: ${command}`), {
        code: "TEST_COMMAND_DENIED",
      });
    }
    return shellExecute({
      command,
      cwd: inputs.cwd,
      timeoutMs: req.policy.timeout_ms ?? parseTimeoutMs(inputs.timeout) ?? 60_000,
      workspaceRoot: ctx.workspaceRoot,
    });
  },
  "shell.execute": async (req, ctx) => {
    const inputs = requestInputs(req);
    const command = inputs.command ?? inputs.cmd;
    if (!command) throw Object.assign(new Error("missing command"), { code: "MALFORMED_INPUT" });
    return shellExecute({
      command,
      cwd: inputs.cwd,
      timeoutMs: req.policy.timeout_ms ?? parseTimeoutMs(inputs.timeout) ?? 30_000,
      workspaceRoot: ctx.workspaceRoot,
    });
  },
  "git.status": (req, ctx) => gitHandlers.gitStatus(ctx.workspaceRoot, requestInputs(req).cwd),
  "git.diff": (req, ctx) => {
    const inputs = requestInputs(req);
    return gitHandlers.gitDiff(ctx.workspaceRoot, inputs.cwd, inputs.staged === "true");
  },
  "git.log": (req, ctx) => {
    const inputs = requestInputs(req);
    const limit = inputs.limit ? parseInt(inputs.limit, 10) : 10;
    return gitHandlers.gitLog(ctx.workspaceRoot, inputs.cwd, limit);
  },
  "git.inspect": (req, ctx) => gitHandlers.gitInspect(ctx.workspaceRoot, requestInputs(req).cwd),
  "repository.inspect": (req, ctx) => gitHandlers.gitInspect(ctx.workspaceRoot, requestInputs(req).cwd),
  "system.cpu": () => systemHandlers.systemCpu(),
  "system.memory": () => systemHandlers.systemMemory(),
  "system.disk": (req) => systemHandlers.systemDisk(requestInputs(req).path ?? "/"),
  "system.processes": (req) => {
    const limit = requestInputs(req).limit ? parseInt(requestInputs(req).limit, 10) : 10;
    return systemHandlers.systemProcesses(limit);
  },
  "system.inspect": () => systemHandlers.systemInspect(),
  "project.inspect": (req, ctx) => projectInspect(ctx.workspaceRoot, requestInputs(req).path ?? "."),
  "knowledge.search": (req) => {
    const inputs = requestInputs(req);
    const query = inputs.query ?? inputs.q;
    if (!query) throw Object.assign(new Error("missing query"), { code: "MALFORMED_INPUT" });
    return knowledgeSearch(query);
  },
  "knowledge.inspect": (req) => knowledgeInspect(requestInputs(req).query ?? requestInputs(req).q ?? ""),
};

function capabilityPermissions(capability: string): {
  filesystem?: "none" | "read" | "write";
  network?: boolean;
  shell?: boolean;
} {
  if (capability === "filesystem.write") {
    return { filesystem: "write", shell: false, network: false };
  }
  if (capability === "test.run") return { filesystem: "read", shell: true, network: false };
  if (capability.startsWith("filesystem.")) return { filesystem: "read", shell: false, network: false };
  if (capability === "shell.execute") return { filesystem: "write", shell: true, network: false };
  if (capability.startsWith("knowledge.")) return { filesystem: "none", shell: false, network: false };
  return { filesystem: "read", shell: false, network: false };
}

export class DeterministicProvider implements ProviderRuntime {
  readonly id: string;
  private workspaceRoot: string;
  private authorityContext: AuthorityContext;
  private handlers: Map<string, DeterministicHandler>;
  private cancelled = new Set<string>();

  constructor(
    manifest: ProviderManifest | { metadata: { name: string } },
    options: DeterministicProviderOptions,
  ) {
    this.id = options.id ?? manifest.metadata.name;
    this.workspaceRoot = options.workspaceRoot;
    this.authorityContext = {
      workspaceRoot: options.workspaceRoot,
      ...options.authority,
    };
    this.handlers = new Map(Object.entries(DEFAULT_HANDLERS));
  }

  static fromManifest(
    manifest: ProviderManifest,
    options: DeterministicProviderOptions & { authority?: AuthorityContext },
  ): DeterministicProvider {
    return new DeterministicProvider(manifest, {
      workspaceRoot: options.workspaceRoot,
      authority: options.authority,
      id: options.id ?? manifest.metadata.name,
    });
  }

  supports(mode?: string): boolean {
    return !mode || mode === "default" || mode === "deterministic";
  }

  async cancel(runId: string): Promise<void> {
    this.cancelled.add(runId);
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    const start = Date.now();
    const handler = this.handlers.get(request.capability);
    if (!handler) {
      return {
        run_id: request.run_id,
        success: false,
        error: {
          code: "UNSUPPORTED_CAPABILITY",
          message: `No deterministic handler for ${request.capability}`,
        },
        duration_ms: Date.now() - start,
        provider_id: this.id,
      };
    }

    const authCtx: AuthorityContext = {
      ...this.authorityContext,
      ...request.authority_context,
      workspaceRoot: this.workspaceRoot,
    };
    const inputs = requestInputs(request);

    const auth = authorize({
      capability: request.capability,
      permissions: capabilityPermissions(request.capability),
      side_effects:
        request.capability === "filesystem.write" ||
        request.capability === "shell.execute" ||
        request.capability === "test.run",
      deterministic: true,
      requires_confirmation:
        request.capability === "shell.execute" ||
        request.capability === "filesystem.write" ||
        request.capability === "test.run",
      targetPath: inputs.path ?? inputs.file ?? inputs.cwd,
      context: authCtx,
    });

    if (auth.decision === "deny") {
      return fail(request, this.id, start, "AUTHORITY_DENIED", auth.reason, auth);
    }
    if (auth.decision === "confirm") {
      return fail(request, this.id, start, "CONFIRMATION_REQUIRED", auth.reason, auth);
    }

    try {
      if (this.cancelled.has(request.run_id)) {
        return fail(request, this.id, start, "CANCELLED", "Run cancelled");
      }

      const result = await handler(request, {
        workspaceRoot: this.workspaceRoot,
        authority: authCtx,
      });
      const duration = Date.now() - start;
      const evidence = buildWorkerEvidence(request.node, request.run_id, this.id, duration, {
        commands_run:
          request.capability === "shell.execute" &&
          result &&
          typeof result === "object" &&
          "command" in result
            ? [String((result as { command: string }).command)]
            : [],
        files_created:
          request.capability === "filesystem.write" &&
          result &&
          typeof result === "object" &&
          "path" in result
            ? [String((result as { path: string }).path)]
            : [],
      });

      if (evidence.spec.payload && typeof evidence.spec.payload === "object") {
        (evidence.spec.payload as { result?: unknown; authority?: unknown }).result = result;
        (evidence.spec.payload as { authority?: unknown }).authority = auth.evidence;
      }
      (evidence.spec as { normalized?: unknown }).normalized = result;

      return {
        run_id: request.run_id,
        success: true,
        evidence,
        duration_ms: duration,
        provider_id: this.id,
        executor_id: "deterministic",
      };
    } catch (err) {
      if (err instanceof PathEscapeError) {
        return fail(request, this.id, start, err.code, err.message);
      }
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "DETERMINISTIC_ERROR";
      return fail(
        request,
        this.id,
        start,
        code,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

function fail(
  request: ExecuteRequest,
  providerId: string,
  start: number,
  code: string,
  message: string,
  auth?: ReturnType<typeof authorize>,
): ExecuteResult {
  return {
    run_id: request.run_id,
    success: false,
    error: { code, message },
    duration_ms: Date.now() - start,
    provider_id: providerId,
    evidence: auth
      ? buildAuthorityEvidence(request.node_id, request.run_id, request.capability, {
          decision: auth.decision,
          reason: auth.reason,
          handler_error: code,
        })
      : undefined,
  };
}

export function createDeterministicProvider(
  nameOrOpts: string | DeterministicProviderOptions,
  workspaceRoot?: string,
  authority?: AuthorityContext,
): DeterministicProvider {
  if (typeof nameOrOpts === "string") {
    return new DeterministicProvider(
      { metadata: { name: nameOrOpts } },
      { workspaceRoot: workspaceRoot ?? ".", authority },
    );
  }
  return new DeterministicProvider(
    { metadata: { name: nameOrOpts.id ?? "deterministic" } },
    nameOrOpts,
  );
}

export { DEFAULT_HANDLERS };
