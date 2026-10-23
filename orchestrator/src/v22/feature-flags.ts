/**
 * V22 P2 experiment flags — default OFF; no behavior change when unset.
 */

function envOn(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/** V22-GOAL-008 — optional Graphify CLI experiment (not KnowledgeBackendId). */
export function isGraphifyExperimentEnabled(): boolean {
  return envOn("EVOLVELOOP_GRAPHIFY");
}

/** V22-GOAL-009 — Caveman-style brevity for host prompts/reports (not core contracts). */
export function isCavemanBrevityEnabled(): boolean {
  return envOn("EVOLVELOOP_BREVITY_CAVEMAN");
}

/** V22-GOAL-010 — stable prefix + cache key on HTTP LLM adapter. */
export function isPromptCacheEnabled(): boolean {
  return envOn("EVOLVELOOP_PROMPT_CACHE");
}

/** V22-GAP-P0-6 — extractive condenser. Default OFF. Does not enable reinject. */
export function isExtractiveCompactionEnabled(): boolean {
  return envOn("EVOLVELOOP_COMPACTION");
}
