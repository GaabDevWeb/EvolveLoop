/**
 * npm run v22:vendor-measure
 * Reads CURSOR_API_KEY or OPENROUTER_API_KEY from the environment and never prints them.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { redactSecrets } from "../evidence/secret-redaction.js";
import { repoRootFromModule } from "./p0-baseline-harness.js";
import { publicError, runVendorMeasure, type VendorProvider } from "./vendor-measure.js";

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function numberOption(name: string): number | undefined {
  const raw = option(name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`invalid ${name}`);
  return value;
}

const providerRaw = option("--provider") ?? "cursor-agent";
if (providerRaw !== "cursor-agent" && providerRaw !== "openrouter") {
  throw new Error("provider must be cursor-agent or openrouter");
}
const provider = providerRaw as VendorProvider;
const keyName = provider === "cursor-agent" ? "CURSOR_API_KEY" : "OPENROUTER_API_KEY";
const apiKey = process.env[keyName];

try {
  const report = await runVendorMeasure({
    provider,
    dryRun: flag("--dry-run"),
    n: numberOption("--n"),
    model: option("--model"),
    maxOutputTokens: numberOption("--max-output-tokens"),
    inputUsdPerMtok: numberOption("--input-usd-per-mtok"),
    outputUsdPerMtok: numberOption("--output-usd-per-mtok"),
    apiKey,
    contextSufficient: flag("--context-sufficient"),
    bin: process.env.CURSOR_AGENT_BIN,
    env: process.env,
  });
  const reportName =
    provider === "cursor-agent"
      ? flag("--context-sufficient")
        ? "p0-vendor-cursor-agent-context-sufficient.json"
        : "p0-vendor-cursor-agent-live.json"
      : "p0-vendor-report.json";
  const out = path.join(repoRootFromModule(), "docs/v22/baseline/raw", reportName);
  mkdirSync(path.dirname(out), { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(out, redactSecrets(body, { extraCanaries: apiKey ? [apiKey] : [] }));
  process.stdout.write(`${report.status} ${report.provider} estimate_usd=${String(report.estimate_usd)} calls=${report.calls}\n`);
  if (report.status === "ABORTED_ESTIMATE" || report.status === "ABORTED_BUDGET" || report.status === "ABORTED_MISSING_PRICE" || report.status === "ABORTED_MISSING_COST" || report.status === "ABORTED_MISSING_KEY") {
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(`${publicError(error, apiKey ? [apiKey] : [])}\n`);
  process.exitCode = 1;
}
