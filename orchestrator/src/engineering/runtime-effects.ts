/**
 * Apply workspace ops via A03 evaluatePreExecute + DeterministicProvider.
 * Agent never calls Provider; Worker is the only materializer.
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { evaluatePreExecute } from "../gates/runtime-gates.js";
import { createDeterministicProvider } from "../providers/deterministic/index.js";
import type { ExecuteRequest, GraphNode } from "../types/index.js";
import type { EngineeringWorkRequest, EffectFingerprint, WorkspaceOp } from "./types.js";
import { contentHash } from "./proposal.js";
import { assertWorkspaceOpScope, normalizeRel } from "./scope.js";

export interface AppliedEffect {
  op: WorkspaceOp;
  fingerprint: EffectFingerprint;
  capability: string;
  provider_id: string;
  evidence_ref?: string;
}

export interface ApplyOpsResult {
  ok: boolean;
  effects: AppliedEffect[];
  gate_decision?: string;
  error_code?: string;
  error_message?: string;
  skipped_idempotent: string[];
}

function mkNode(id: string, capability: string, inputs: Record<string, string>): GraphNode {
  return {
    id,
    capability,
    type: "worker",
    dependencies: [],
    definition_of_done: [],
    status: "pending",
    retry_count: 0,
    constraints: inputs,
  };
}

function resolveContent(workspaceRoot: string, op: WorkspaceOp): { path: string; content: string } | { error: string } {
  const path = normalizeRel(op.path);
  const abs = join(workspaceRoot, path);

  if (op.op === "create_file" || op.op === "replace_file") {
    return { path, content: op.content ?? "" };
  }
  if (op.op === "append_file") {
    const prev = existsSync(abs) ? readFileSync(abs, "utf-8") : "";
    return { path, content: prev + (op.append ?? "") };
  }
  if (op.op === "patch_file") {
    if (!existsSync(abs)) return { error: `patch target missing: ${path}` };
    let prev = readFileSync(abs, "utf-8");
    const find = op.find ?? "";
    if (!prev.includes(find)) return { error: `patch find not found in ${path}` };
    if (op.replace_all) prev = prev.split(find).join(op.replace ?? "");
    else prev = prev.replace(find, op.replace ?? "");
    return { path, content: prev };
  }
  if (op.op === "delete_file") {
    return { path, content: "" };
  }
  if (op.op === "rename_file") {
    return { path, content: "" };
  }
  return { error: `unsupported op ${op.op}` };
}

export async function applyWorkspaceOps(
  work: EngineeringWorkRequest,
  ops: WorkspaceOp[],
  options: {
    prior_effects?: EffectFingerprint[];
    denied_capabilities?: string[];
    allow_write?: boolean;
    allow_shell?: boolean;
  } = {},
): Promise<ApplyOpsResult> {
  const provider = createDeterministicProvider({
    id: "engineering-deterministic",
    workspaceRoot: work.workspace_root,
    authority: {
      workspaceRoot: work.workspace_root,
      allowWrite: options.allow_write !== false,
      allowShell: options.allow_shell === true,
      allowNetwork: false,
      confirmed: true,
    },
  });

  const effects: AppliedEffect[] = [];
  const skipped: string[] = [];
  const prior = new Map((options.prior_effects ?? []).map((e) => [`${e.op}:${e.path}:${e.content_hash}`, e]));

  for (const op of ops) {
    const scope = assertWorkspaceOpScope(op.path, {
      workspace_root: work.workspace_root,
      allowed_paths: work.allowed_paths.length ? work.allowed_paths : work.task_scope,
      forbidden_paths: work.forbidden_paths,
    });
    if (!scope.ok) {
      return {
        ok: false,
        effects,
        skipped_idempotent: skipped,
        gate_decision: "DENY",
        error_code: "SCOPE_VIOLATION",
        error_message: scope.errors.join("; "),
      };
    }

    if (!work.allowed_capabilities.includes("filesystem.write") && op.op !== "delete_file") {
      // delete also needs write-like authority
      if (!work.allowed_capabilities.includes("*")) {
        return {
          ok: false,
          effects,
          skipped_idempotent: skipped,
          gate_decision: "DENY",
          error_code: "CAPABILITY_NOT_ALLOWED",
          error_message: "filesystem.write not in WorkRequest allowed_capabilities",
        };
      }
    }

    if (op.op === "rename_file") {
      const from = join(work.workspace_root, normalizeRel(op.path));
      const toRel = normalizeRel(op.to_path ?? "");
      const toScope = assertWorkspaceOpScope(toRel, {
        workspace_root: work.workspace_root,
        allowed_paths: work.allowed_paths.length ? work.allowed_paths : work.task_scope,
        forbidden_paths: work.forbidden_paths,
      });
      if (!toScope.ok) {
        return {
          ok: false,
          effects,
          skipped_idempotent: skipped,
          error_code: "SCOPE_VIOLATION",
          error_message: toScope.errors.join("; "),
          gate_decision: "DENY",
        };
      }
      const node = mkNode(`eng-rename-${randomUUID().slice(0, 6)}`, "filesystem.write", {
        path: toRel,
      });
      const gate = evaluatePreExecute({
        node,
        provider: provider as never,
        authority: {
          workspaceRoot: work.workspace_root,
          allowWrite: true,
          confirmed: true,
        },
        gateContext: { denied_capabilities: options.denied_capabilities ?? [] },
        plan_hash: `eng-${work.work_id}`,
        confirmed_for_plan_hash: `eng-${work.work_id}`,
        run_id: work.correlation.run_id,
        execution_id: work.correlation.execution_id,
        policy_id: work.policy_id,
      });
      if (gate.decision !== "ALLOW") {
        return {
          ok: false,
          effects,
          skipped_idempotent: skipped,
          gate_decision: gate.decision,
          error_code: gate.decision === "CONFIRMATION_REQUIRED" ? "CONFIRMATION_REQUIRED" : "POLICY_BLOCKED",
          error_message: gate.reason,
        };
      }
      renameSync(from, join(work.workspace_root, toRel));
      const fp: EffectFingerprint = {
        path: toRel,
        op: "rename_file",
        content_hash: contentHash(`${op.path}->${toRel}`),
        applied_at: new Date().toISOString(),
        execution_id: work.correlation.execution_id,
      };
      effects.push({
        op,
        fingerprint: fp,
        capability: "filesystem.write",
        provider_id: provider.id,
      });
      continue;
    }

    if (op.op === "delete_file") {
      const path = normalizeRel(op.path);
      const abs = join(work.workspace_root, path);
      const node = mkNode(`eng-del-${randomUUID().slice(0, 6)}`, "filesystem.write", { path });
      const gate = evaluatePreExecute({
        node,
        provider: provider as never,
        authority: { workspaceRoot: work.workspace_root, allowWrite: true, confirmed: true },
        gateContext: { denied_capabilities: options.denied_capabilities ?? [] },
        plan_hash: `eng-${work.work_id}`,
        confirmed_for_plan_hash: `eng-${work.work_id}`,
        run_id: work.correlation.run_id,
        execution_id: work.correlation.execution_id,
        policy_id: work.policy_id,
      });
      if (gate.decision !== "ALLOW") {
        return {
          ok: false,
          effects,
          skipped_idempotent: skipped,
          gate_decision: gate.decision,
          error_code: "POLICY_BLOCKED",
          error_message: gate.reason,
        };
      }
      if (existsSync(abs)) unlinkSync(abs);
      const fp: EffectFingerprint = {
        path,
        op: "delete_file",
        content_hash: contentHash("deleted"),
        applied_at: new Date().toISOString(),
        execution_id: work.correlation.execution_id,
      };
      effects.push({
        op,
        fingerprint: fp,
        capability: "filesystem.write",
        provider_id: provider.id,
      });
      continue;
    }

    const resolved = resolveContent(work.workspace_root, op);
    if ("error" in resolved) {
      return {
        ok: false,
        effects,
        skipped_idempotent: skipped,
        error_code: "IMPLEMENTATION_INVALID",
        error_message: resolved.error,
      };
    }

    const fpKey = `${op.op}:${resolved.path}:${contentHash(resolved.content)}`;
    if (prior.has(fpKey)) {
      skipped.push(resolved.path);
      continue;
    }
    // Idempotency: same path+content already on disk
    const abs = join(work.workspace_root, resolved.path);
    if (existsSync(abs) && readFileSync(abs, "utf-8") === resolved.content) {
      skipped.push(resolved.path);
      const fp: EffectFingerprint = {
        path: resolved.path,
        op: op.op,
        content_hash: contentHash(resolved.content),
        applied_at: new Date().toISOString(),
        execution_id: work.correlation.execution_id,
      };
      effects.push({
        op,
        fingerprint: fp,
        capability: "filesystem.write",
        provider_id: provider.id,
      });
      continue;
    }

    const node = mkNode(`eng-write-${randomUUID().slice(0, 6)}`, "filesystem.write", {
      path: resolved.path,
    });
    const gate = evaluatePreExecute({
      node,
      provider: provider as never,
      authority: {
        workspaceRoot: work.workspace_root,
        allowWrite: options.allow_write !== false,
        confirmed: true,
      },
      gateContext: { denied_capabilities: options.denied_capabilities ?? [] },
      plan_hash: `eng-${work.work_id}`,
      confirmed_for_plan_hash: `eng-${work.work_id}`,
      run_id: work.correlation.run_id,
      execution_id: work.correlation.execution_id,
      policy_id: work.policy_id,
    });

    if (gate.decision === "CONFIRMATION_REQUIRED") {
      return {
        ok: false,
        effects,
        skipped_idempotent: skipped,
        gate_decision: "CONFIRMATION_REQUIRED",
        error_code: "CONFIRMATION_REQUIRED",
        error_message: gate.reason,
      };
    }
    if (gate.decision !== "ALLOW") {
      return {
        ok: false,
        effects,
        skipped_idempotent: skipped,
        gate_decision: gate.decision,
        error_code: "POLICY_BLOCKED",
        error_message: gate.reason,
      };
    }

    const execReq: ExecuteRequest = {
      run_id: work.correlation.run_id,
      node_id: node.id,
      capability: "filesystem.write",
      inputs: [],
      definition_of_done: [],
      policy: { retries_remaining: 0, timeout_ms: work.budgets.timeout_ms },
      memory_scope: "engineering",
      knowledge_hits: [],
      briefing: `SE-05 apply ${op.op} ${resolved.path}`,
      node,
      authority_context: {
        workspaceRoot: work.workspace_root,
        allowWrite: true,
        confirmed: true,
      },
    };

    node.constraints = { path: resolved.path, content: resolved.content };

    const result = await provider.execute(execReq);
    if (!result.success) {
      return {
        ok: false,
        effects,
        skipped_idempotent: skipped,
        error_code: result.error?.code ?? "PROVIDER_FAILURE",
        error_message: result.error?.message ?? "filesystem.write failed",
        gate_decision: "ALLOW",
      };
    }

    const fp: EffectFingerprint = {
      path: resolved.path,
      op: op.op,
      content_hash: contentHash(resolved.content),
      applied_at: new Date().toISOString(),
      execution_id: work.correlation.execution_id,
    };
    effects.push({
      op,
      fingerprint: fp,
      capability: "filesystem.write",
      provider_id: provider.id,
      evidence_ref: result.evidence?.id,
    });
    prior.set(fpKey, fp);
  }

  return { ok: true, effects, skipped_idempotent: skipped, gate_decision: "ALLOW" };
}
