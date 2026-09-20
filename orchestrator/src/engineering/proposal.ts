/**
 * Parse & validate ImplementationProposal → deterministic workspace ops.
 */

import { createHash, randomUUID } from "node:crypto";
import type { AgentDecision } from "../agent/types.js";
import type { EngineeringWorkRequest, ImplementationProposalBody, WorkspaceOp } from "./types.js";
import { assertWorkspaceOpScope } from "./scope.js";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function parseImplementationProposal(
  raw: unknown,
  work: EngineeringWorkRequest,
): { ok: true; proposal: ImplementationProposalBody } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const o = asRecord(raw);
  if (!o) return { ok: false, errors: ["proposal must be object"] };

  // Accept IMPLEMENTATION_PROPOSAL envelope or nested body
  let body = o;
  if (o.decision_type === "IMPLEMENTATION_PROPOSAL" || o.decision_type === "ACTION_PROPOSAL") {
    if (asRecord(o.implementation_proposal)) body = asRecord(o.implementation_proposal)!;
    else if (Array.isArray(o.operations)) body = o;
    else if (Array.isArray(o.proposed_actions)) {
      // Map proposed_actions → create/replace ops
      const ops: WorkspaceOp[] = [];
      for (const a of o.proposed_actions) {
        const ar = asRecord(a);
        if (!ar) continue;
        const path =
          (typeof ar.path === "string" && ar.path) ||
          (typeof ar.inputs === "object" &&
            ar.inputs &&
            typeof (ar.inputs as Record<string, string>).path === "string" &&
            (ar.inputs as Record<string, string>).path) ||
          "";
        const content =
          (typeof ar.content === "string" && ar.content) ||
          (typeof ar.inputs === "object" &&
            ar.inputs &&
            typeof (ar.inputs as Record<string, string>).content === "string" &&
            (ar.inputs as Record<string, string>).content) ||
          "";
        if (!path) {
          errors.push("proposed action missing path");
          continue;
        }
        ops.push({
          op: "replace_file",
          path,
          content,
          rationale: typeof ar.reason === "string" ? ar.reason : undefined,
        });
      }
      body = { operations: ops, rationale: o.reason };
    }
  }

  const opsRaw = body.operations;
  if (!Array.isArray(opsRaw) || opsRaw.length === 0) {
    return { ok: false, errors: [...errors, "IMPLEMENTATION_PROPOSAL requires non-empty operations"] };
  }

  const operations: WorkspaceOp[] = [];
  for (const rawOp of opsRaw) {
    const op = asRecord(rawOp);
    if (!op || typeof op.op !== "string" || typeof op.path !== "string") {
      errors.push("each operation needs op + path");
      continue;
    }
    const scope = assertWorkspaceOpScope(op.path, {
      workspace_root: work.workspace_root,
      allowed_paths: work.allowed_paths.length ? work.allowed_paths : work.task_scope,
      forbidden_paths: work.forbidden_paths,
    });
    if (!scope.ok) errors.push(...scope.errors);

    if (op.to_path && typeof op.to_path === "string") {
      const s2 = assertWorkspaceOpScope(op.to_path, {
        workspace_root: work.workspace_root,
        allowed_paths: work.allowed_paths.length ? work.allowed_paths : work.task_scope,
        forbidden_paths: work.forbidden_paths,
      });
      if (!s2.ok) errors.push(...s2.errors);
    }

    const kind = op.op as WorkspaceOp["op"];
    if (!["create_file", "replace_file", "patch_file", "append_file", "delete_file", "rename_file"].includes(kind)) {
      errors.push(`unsupported op: ${kind}`);
      continue;
    }
    if ((kind === "create_file" || kind === "replace_file") && typeof op.content !== "string") {
      errors.push(`${kind} requires content`);
    }
    if (kind === "patch_file" && (typeof op.find !== "string" || typeof op.replace !== "string")) {
      errors.push("patch_file requires find + replace");
    }
    if (kind === "append_file" && typeof op.append !== "string") {
      errors.push("append_file requires append");
    }
    if (kind === "rename_file" && typeof op.to_path !== "string") {
      errors.push("rename_file requires to_path");
    }

    operations.push({
      op: kind,
      path: op.path,
      content: typeof op.content === "string" ? op.content : undefined,
      find: typeof op.find === "string" ? op.find : undefined,
      replace: typeof op.replace === "string" ? op.replace : undefined,
      replace_all: op.replace_all === true,
      append: typeof op.append === "string" ? op.append : undefined,
      to_path: typeof op.to_path === "string" ? op.to_path : undefined,
      rationale: typeof op.rationale === "string" ? op.rationale : undefined,
    });
  }

  if (typeof body.task_id === "string" && body.task_id !== work.task_id) {
    errors.push("proposal task_id mismatch");
  }
  if (typeof body.assignment_id === "string" && body.assignment_id !== work.assignment_id) {
    errors.push("proposal assignment_id mismatch");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    proposal: {
      kind: "ImplementationProposal",
      apiVersion: "evolveloop.io/se/v1",
      proposal_id: typeof body.proposal_id === "string" ? body.proposal_id : `prop-${randomUUID().slice(0, 8)}`,
      task_id: work.task_id,
      assignment_id: work.assignment_id,
      operations,
      validation_commands: Array.isArray(body.validation_commands)
        ? body.validation_commands.filter((c): c is string => typeof c === "string")
        : undefined,
      expected_outputs: Array.isArray(body.expected_outputs)
        ? body.expected_outputs.filter((c): c is string => typeof c === "string")
        : undefined,
      assumptions: Array.isArray(body.assumptions)
        ? body.assumptions.filter((c): c is string => typeof c === "string")
        : undefined,
      rationale: typeof body.rationale === "string" ? body.rationale : undefined,
    },
  };
}

/** Extract proposal from AgentDecision if present */
export function proposalFromDecision(
  decision: AgentDecision,
  work: EngineeringWorkRequest,
): ReturnType<typeof parseImplementationProposal> {
  if (decision.decision_type === "ACTION_PROPOSAL") {
    return parseImplementationProposal(
      {
        decision_type: "ACTION_PROPOSAL",
        reason: decision.reason,
        proposed_actions: decision.proposed_actions,
      },
      work,
    );
  }
  return parseImplementationProposal(decision, work);
}
