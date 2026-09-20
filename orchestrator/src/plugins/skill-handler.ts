/**
 * Autonomous skill handler protocol.
 *
 * Skills that only ship SKILL.md (LLM instructions) have no programmatic backend
 * unless they declare `spec.plugin.autonomous`. Cursor SDK is optional/future —
 * not assumed present.
 */

import type { DoDCheck, Evidence, ExecuteRequest, IRInput } from "../types/index.js";

export interface AutonomousPluginConfig {
  type: "node-module";
  /** Module path relative to provider directory (directory containing provider.yaml). */
  module: string;
  /** Optional export name (default: "execute"). */
  export?: string;
}

export interface AutonomousSkillContext {
  execution_id: string;
  run_id: string;
  job_id?: string;
  capability: string;
  skill_path: string;
  provider_id: string;
  node_id: string;
  briefing: string;
  inputs: Record<string, string>;
  definition_of_done: DoDCheck[];
  authorized_workspace: string;
  policy: ExecuteRequest["policy"];
  evidence_location?: string;
  signal?: AbortSignal;
  attempt?: number;
}

export interface AutonomousSkillHandlerResult {
  success: boolean;
  /** Required on success — executor will not invent success without evidence. */
  evidence?: Evidence;
  error?: { code: string; message: string };
  side_effects?: {
    files_created?: string[];
    files_modified?: string[];
    commands_run?: string[];
  };
  /** Free-form payload for debugging — not a substitute for evidence. */
  detail?: unknown;
}

export type AutonomousSkillHandler = (
  ctx: AutonomousSkillContext,
) => Promise<AutonomousSkillHandlerResult> | AutonomousSkillHandlerResult;

export function inputsFromRequest(request: ExecuteRequest): Record<string, string> {
  const out: Record<string, string> = {};
  const constraints = request.node?.constraints;
  if (constraints && typeof constraints === "object") {
    for (const [k, v] of Object.entries(constraints)) {
      if (v !== undefined && v !== null) out[k] = String(v);
    }
  }
  for (const input of request.inputs ?? []) {
    const ir = input as IRInput;
    if (ir.ref && !(ir.ref in out)) out[ir.ref] = "";
  }
  return out;
}
