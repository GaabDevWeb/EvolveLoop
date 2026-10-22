/**
 * Token counting aligned with V22-BENCH harness (`bench_harness.load_tokenizer`).
 * Optional tiktoken via `python3 orchestrator/scripts/bench_tokenizer_probe.py` (bench env only).
 */

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BENCH_TOKENIZER_PROXY = "PROXY:whitespace_split";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROBE = join(__dirname, "../../scripts/bench_tokenizer_probe.py");

let resolvedLabel: string | null = null;

function probeLabel(): string {
  if (resolvedLabel) return resolvedLabel;
  try {
    resolvedLabel = execFileSync("python3", [PROBE, "--label"], { encoding: "utf-8" }).trim();
  } catch {
    resolvedLabel = BENCH_TOKENIZER_PROXY;
  }
  return resolvedLabel;
}

/** Same as harness: tiktoken cl100k_base when available, else whitespace split. */
export function countBenchTokens(text: string): number {
  return countBenchTokensBatch([text])[0] ?? 0;
}

export function countBenchTokensBatch(texts: string[]): number[] {
  const normalized = texts.map((t) => t.trim());
  if (normalized.every((t) => !t)) return normalized.map(() => 0);
  try {
    const payload = normalized.map((t) => JSON.stringify(t)).join("\n");
    const out = execFileSync("python3", [PROBE, "--batch"], {
      input: payload,
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
    if (!out) return normalized.map((t) => (t ? t.split(/\s+/).filter(Boolean).length : 0));
    return out.split("\n").map((line) => Number.parseInt(line, 10));
  } catch {
    return normalized.map((t) => (t ? t.split(/\s+/).filter(Boolean).length : 0));
  }
}

export function benchTokenizerLabel(): string {
  return probeLabel();
}
