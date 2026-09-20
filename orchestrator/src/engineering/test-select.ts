/**
 * Deterministic test command selection — no ML.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EngineeringWorkRequest, ImplementationProposalBody } from "./types.js";

const DEFAULT_ALLOWLIST = [
  /^npm test$/,
  /^npm run test$/,
  /^npm run test:unit$/,
  /^npx vitest run$/,
  /^npx vitest run /,
  /^node --test /,
  /^node --test$/,
];

export function isAllowedTestCommand(command: string, extra: RegExp[] = []): boolean {
  const cmd = command.trim();
  return [...DEFAULT_ALLOWLIST, ...extra].some((re) => re.test(cmd));
}

export function selectValidationCommands(
  work: EngineeringWorkRequest,
  proposal?: ImplementationProposalBody,
): string[] {
  if (proposal?.validation_commands?.length) {
    return proposal.validation_commands.filter((c) => isAllowedTestCommand(c));
  }
  if (work.validation_commands?.length) {
    return work.validation_commands.filter((c) => isAllowedTestCommand(c));
  }

  const pkgPath = join(work.workspace_root, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
        scripts?: Record<string, string>;
      };
      if (pkg.scripts?.test) return ["npm test"];
      if (pkg.scripts?.["test:unit"]) return ["npm run test:unit"];
    } catch {
      /* ignore */
    }
  }
  return ["npm test"];
}
