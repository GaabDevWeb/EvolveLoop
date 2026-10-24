/**
 * npm run v22:caveman-measure
 * Reads CURSOR_API_KEY from the environment and never prints it.
 *
 * Live comparison (run outside CI, N=5, six frozen tasks, cursor-agent):
 *   cd orchestrator && CURSOR_API_KEY="$CURSOR_API_KEY" npm run v22:caveman-measure -- --provider cursor-agent --n 5
 *
 * Dry-run, no key and no spend:
 *   cd orchestrator && npm run v22:caveman-measure -- --provider cursor-agent --dry-run --n 5
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { redactSecrets } from "../evidence/secret-redaction.js";
import { repoRootFromModule } from "./p0-baseline-harness.js";
import { cavemanMeasurePublicError, runCavemanOutputMeasure } from "./caveman-output-measure.js";

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const provider = option("--provider") ?? "cursor-agent";
if (provider !== "cursor-agent") {
  throw new Error("provider must be cursor-agent");
}

const rawN = option("--n");
const n = rawN === undefined ? undefined : Number(rawN);
if (rawN !== undefined && !Number.isFinite(n)) throw new Error("invalid --n");

const apiKey = process.env.CURSOR_API_KEY;
const out = option("--out") ?? path.join(repoRootFromModule(), "docs/v22/baseline/raw/caveman-hg-report.json");

try {
  const report = await runCavemanOutputMeasure({
    dryRun: flag("--dry-run"),
    n,
    apiKey,
    bin: process.env.CURSOR_AGENT_BIN,
    env: process.env,
  });
  mkdirSync(path.dirname(out), { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(out, redactSecrets(body, { extraCanaries: apiKey ? [apiKey] : [] }));
  process.stdout.write(
    `${report.status} ${report.provider} tasks=${report.tasks.length} n=${report.n} calls=${report.calls} out=${out}\n`,
  );
  if (report.status === "ABORTED_MISSING_KEY") process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${cavemanMeasurePublicError(error, apiKey ? [apiKey] : [])}\n`);
  process.exitCode = 1;
}
