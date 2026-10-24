/**
 * V22 P2 experiment flags. Graphify, prompt cache, and compaction stay OFF
 * when unset. The Caveman output gate is the exception: default ON.
 */

const CAVEMAN_OFF = new Set(["0", "false", "off", "no"]);

function envOn(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/** V22-GOAL-008 — optional Graphify CLI experiment (not KnowledgeBackendId). */
export function isGraphifyExperimentEnabled(): boolean {
  return envOn("EVOLVELOOP_GRAPHIFY");
}

/**
 * V22-CAVEMAN-HG-1 — Caveman output hard gate.
 * Default ON. Opt-out: `EVOLVELOOP_BREVITY_CAVEMAN=off` (also `0`, `false`, `no`).
 * Does not, by itself, lossy-compress briefings.
 */
export function isCavemanOutputGateEnabled(): boolean {
  const raw = process.env.EVOLVELOOP_BREVITY_CAVEMAN;
  if (raw === undefined) return true;
  const v = raw.trim().toLowerCase();
  if (v === "") return true;
  return !CAVEMAN_OFF.has(v);
}

/** Explicit `on|true|1|yes`. Attaches the historical GOAL-009/010 bench. Unset does not. */
export function isCavemanBrevityExplicitlyOn(): boolean {
  return envOn("EVOLVELOOP_BREVITY_CAVEMAN");
}

/** Same switch as `isCavemanOutputGateEnabled`. Name kept for existing imports. */
export function isCavemanBrevityEnabled(): boolean {
  return isCavemanOutputGateEnabled();
}

/** V22-GOAL-010 — stable prefix + cache key on HTTP LLM adapter. */
export function isPromptCacheEnabled(): boolean {
  return envOn("EVOLVELOOP_PROMPT_CACHE");
}

/** V22-GAP-P0-6 — extractive condenser. Default OFF. Does not enable reinject. */
export function isExtractiveCompactionEnabled(): boolean {
  return envOn("EVOLVELOOP_COMPACTION");
}
