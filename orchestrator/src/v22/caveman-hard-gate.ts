/**
 * V22-CAVEMAN-HG-1 — Caveman output hard gate.
 *
 * The vendored skill is upstream bytes (see vendor/juliusbrussee-caveman/PIN.json).
 * This module only points at it and states the EvolveLoop exceptions.
 * It does not rewrite the skill and it does not lossy-compress worker prompts.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const CAVEMAN_SKILL_REL = "vendor/juliusbrussee-caveman/skills/caveman/SKILL.md";
export const CAVEMAN_UPSTREAM_COMMIT = "d262ab3882952a59312ff3537cd86d894523c5ab";
export const CAVEMAN_OPT_OUT = "EVOLVELOOP_BREVITY_CAVEMAN=off";
export const CAVEMAN_GATE_HEADING = "## Caveman output hard gate";
export const CAVEMAN_EXCEPTION_LINE =
  "code, commands, paths, evidence, SHAs, commit messages, user docs, task reports (structured fields), security content";

const SKILL_URL = new URL(`../../../${CAVEMAN_SKILL_REL}`, import.meta.url);

let cachedSection: string | undefined;

export function cavemanSkillPath(): string {
  return fileURLToPath(SKILL_URL);
}

export function readVendoredCavemanSkill(): string {
  return readFileSync(cavemanSkillPath(), "utf8");
}

/** Upstream SKILL.md plus the EvolveLoop exception overlay. Skill bytes stay intact. */
export function renderCavemanHardGateSection(): string {
  if (cachedSection) return cachedSection;
  const skill = readVendoredCavemanSkill();
  if (!skill.includes("name: caveman") || !skill.includes("Only fluff die.")) {
    throw new Error("vendored caveman SKILL.md failed the integrity marker check");
  }
  cachedSection = [
    CAVEMAN_GATE_HEADING,
    "",
    "Mode: caveman. Default ON for every EvolveLoop agent and worker.",
    `Opt-out: ${CAVEMAN_OPT_OUT} (also 0, false, no). Unset means ON.`,
    "Follow the vendored skill below. Do not rewrite it. Do not switch to ultracave, megacave, or caveman-compress.",
    `Skill: \`${CAVEMAN_SKILL_REL}\``,
    `Upstream: https://github.com/juliusbrussee/caveman @ ${CAVEMAN_UPSTREAM_COMMIT} (v4.0.1)`,
    "",
    "Exceptions — never compress or alter:",
    CAVEMAN_EXCEPTION_LINE,
    "Security warnings and irreversible confirmations stay full sentences.",
    "Structured task-report fields keep their labels and their verbatim values.",
    "",
    skill.endsWith("\n") ? skill : `${skill}\n`,
  ].join("\n");
  return cachedSection;
}

const BRIEFING_ANCHOR = "## Briefing\n\n";

/** Insert the gate before the briefing so Definition of Done and inputs stay byte-identical. */
export function injectCavemanHardGate(prompt: string, enabled: boolean): string {
  if (!enabled) return prompt;
  const block = renderCavemanHardGateSection();
  const at = prompt.indexOf(BRIEFING_ANCHOR);
  if (at === -1) return `${prompt.trimEnd()}\n\n${block}`;
  return `${prompt.slice(0, at)}${block}\n${prompt.slice(at)}`;
}
