/**
 * Minimal extractive condenser (PM-008 / E-004, ADR-0013 question 8).
 *
 * Deterministic line filter. It keeps requirements, decisions, restrictions,
 * evidence, next steps, path citations, negations, and commands. Other prose
 * drops. It does not summarize and it does not open reinject: the contract in
 * compaction-contract.ts stays fail-closed. The flag EVOLVELOOP_COMPACTION
 * defaults OFF. Callers that pass `enabled` explicitly are the measurement.
 */

import { isExtractiveCompactionEnabled } from "../v22/feature-flags.js";

export const EXTRACTIVE_CONDENSER_ID = "extractive-deterministic-1";

export interface CondenseRequest {
  text: string;
  /** Substrings that must survive on their own line (anchors, restrictions). */
  mustKeep: readonly string[];
}

export interface CondenseResult {
  condenser: typeof EXTRACTIVE_CONDENSER_ID;
  applied: boolean;
  flag: "OFF" | "ON";
  after_text: string;
  lines_before: number;
  lines_kept: number;
  lines_dropped: number;
  missing_must_keep: string[];
}

const LABELED =
  /^(?:#{1,6}\s+)?(?:requirement|requisito|decision|decis[aã]o|restriction|restri[cç][aã]o|evidence|evid[eê]ncia|next_action|pr[oó]ximo passo|resume|run_id|node_id|capability|reason|graph_node|satisfied_job_run_id)\b/i;

const NEGATION_OR_STANDING =
  /\b(?:n[aã]o|nunca|never|must not|do not|don't|reinject_allowed|NOT_IMPLEMENTED)\b/i;

const COMMAND = /^(?:\$ |npm |npx |git |pytest |bash )/;

const PATH_HEADER = /^--- path:.+ ---$/;

const PATH_CITATION = /(?:docs|orchestrator|profiles|\.cursor|mcp)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/;

export function lineKeptByCondenser(line: string, mustKeep: readonly string[]): boolean {
  if (mustKeep.some((needle) => needle.length > 0 && line.includes(needle))) return true;
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  if (PATH_HEADER.test(trimmed)) return true;
  if (LABELED.test(trimmed)) return true;
  if (NEGATION_OR_STANDING.test(line)) return true;
  if (COMMAND.test(trimmed)) return true;
  if (PATH_CITATION.test(line)) return true;
  return false;
}

export function condenseExtractive(request: CondenseRequest, enabled = isExtractiveCompactionEnabled()): CondenseResult {
  const lines = request.text.split("\n");
  if (!enabled) {
    return {
      condenser: EXTRACTIVE_CONDENSER_ID,
      applied: false,
      flag: "OFF",
      after_text: request.text,
      lines_before: lines.length,
      lines_kept: lines.length,
      lines_dropped: 0,
      missing_must_keep: [],
    };
  }
  const kept = lines.filter((line) => lineKeptByCondenser(line, request.mustKeep));
  const after = kept.join("\n");
  const missing = request.mustKeep.filter((needle) => needle.length > 0 && !after.includes(needle));
  return {
    condenser: EXTRACTIVE_CONDENSER_ID,
    applied: true,
    flag: "ON",
    after_text: after,
    lines_before: lines.length,
    lines_kept: kept.length,
    lines_dropped: lines.length - kept.length,
    missing_must_keep: missing,
  };
}
