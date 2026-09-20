import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { EvolutionRequest } from "../types.js";

/**
 * Handoff to existing Architecture Evolution Pipeline.
 * Writes Evolution Request artifact — does NOT execute Prototype Gate or mutate runtime.
 */
export function submitEvolutionRequest(
  request: EvolutionRequest,
  outDir: string,
): { path: string; submitted: boolean } {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${request.id}.json`);
  writeFileSync(path, JSON.stringify(request, null, 2), "utf-8");
  return {
    path,
    submitted: request.requested_action === "SUBMIT_TO_PROTOTYPE_GATE",
  };
}

export function evolutionRequestExists(outDir: string, id: string): boolean {
  return existsSync(join(outDir, `${id}.json`));
}

/** Integration note for docs/architecture/evolution consumers */
export const PIPELINE_HANDOFF_CONTRACT = {
  next_stage: "Prototype Gate",
  forbids: [
    "direct_agent_creation",
    "direct_runtime_mutation",
    "direct_skill_edit",
    "direct_policy_edit",
  ],
  requires: ["need_link", "root_cause", "candidate", "evidence", "scope", "eval_strategy"],
} as const;
