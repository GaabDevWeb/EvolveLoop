/**
 * B0-style retrieval for V22-BENCH real corpus — applies runtime budget when enabled.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { applyContextBudget, sliceFromFile, type ContextBudgetLimits } from "./index.js";
import { countTokens } from "./tokenizer.js";
import {
  rankRetrievalPaths,
  selectTopRankedPaths,
  type RetrievalRankingContext,
} from "./retrieval-ranking.js";

export interface BenchAnchor {
  path: string;
  line: number;
  substring: string;
}

export interface BenchTask {
  id: string;
  query: string;
  rg_patterns: string[];
  anchors: BenchAnchor[];
  /** Optional objective paths (not anchors) for ranking boost */
  cited_paths?: string[];
}

const B0_CAP = 45;
const RG_GLOBS = [
  "!node_modules",
  "!.git",
  "!dist",
  "!**/.venv",
  "!agent-setup/.venv",
  "!docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/**",
];

export function runRg(repoRoot: string, pattern: string): string[] {
  const cmd = ["rg", "-l", pattern, repoRoot, "--glob", RG_GLOBS[0]];
  for (const g of RG_GLOBS.slice(1)) cmd.push("--glob", g);
  const proc = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 });
  const rel: string[] = [];
  for (const ln of (proc.stdout ?? "").split("\n")) {
    const trimmed = ln.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith(repoRoot)) {
      rel.push(trimmed.slice(repoRoot.length + 1));
    } else {
      rel.push(trimmed);
    }
  }
  return [...new Set(rel)].sort();
}

function readRel(repoRoot: string, rel: string): string {
  try {
    return readFileSync(join(repoRoot, rel), "utf-8");
  } catch {
    return "";
  }
}

export function anchorRecall(
  repoRoot: string,
  pathsRead: string[],
  anchors: BenchAnchor[],
): { recall: number; notes: string[] } {
  const notes: string[] = [];
  let hit = 0;
  for (const a of anchors) {
    if (!pathsRead.includes(a.path)) {
      notes.push(`miss path not read: ${a.path}`);
      continue;
    }
    const lines = readRel(repoRoot, a.path).split("\n");
    if (a.line < 1 || a.line > lines.length) {
      notes.push(`miss line OOB: ${a.path}:${a.line}`);
      continue;
    }
    if (lines[a.line - 1].includes(a.substring)) {
      hit += 1;
    } else {
      notes.push(`miss substring @ ${a.path}:${a.line}`);
    }
  }
  const total = anchors.length || 1;
  return { recall: hit / total, notes };
}

export interface BenchRetrievalResult {
  task_id: string;
  arm: "B0_OFFICIAL" | "B0_BUDGET";
  paths_read: string[];
  input_tokens: number;
  recall: number;
  recall_notes: string[];
  tokenizer: string;
}

function collectRgHits(repoRoot: string, task: BenchTask): string[] {
  const hits: string[] = [];
  for (const pat of task.rg_patterns) {
    hits.push(...runRg(repoRoot, pat));
  }
  return [...new Set(hits)];
}

function rankingContext(task: BenchTask): RetrievalRankingContext {
  return {
    query: task.query,
    rg_patterns: task.rg_patterns,
    cited_paths: task.cited_paths,
  };
}

export function runB0Retrieval(
  repoRoot: string,
  task: BenchTask,
  options?: { budget?: ContextBudgetLimits; ownerId?: string },
): BenchRetrievalResult {
  const hits = collectRgHits(repoRoot, task);
  const orderedLex = [...hits].sort();

  if (!options?.budget) {
    const paths: string[] = [];
    for (const rel of orderedLex) {
      if (rel.startsWith("secrets/")) continue;
      paths.push(rel);
      if (paths.length >= B0_CAP) break;
    }
    const chunks = paths.map((p) => `--- ${p} ---\n${readRel(repoRoot, p)}`);
    const context = chunks.join("\n");
    const { recall, notes } = anchorRecall(repoRoot, paths, task.anchors);
    const m = countTokens(context);
    return {
      task_id: task.id,
      arm: "B0_OFFICIAL",
      paths_read: paths,
      input_tokens: m.tokens,
      recall,
      recall_notes: notes,
      tokenizer: m.tokenizer,
    };
  }

  const ranked = rankRetrievalPaths(hits, (p) => readRel(repoRoot, p), rankingContext(task));
  const topPaths = selectTopRankedPaths(
    ranked,
    (p) => countTokens(readRel(repoRoot, p)).tokens,
    options.budget.max_paths ?? 15,
  );
  const scoreByPath = new Map(ranked.map((r) => [r.path, r.score]));
  const slices = topPaths.map((path) =>
    sliceFromFile(path, readRel(repoRoot, path), "generic", scoreByPath.get(path) ?? 0),
  );

  const budgeted = applyContextBudget(slices, {
    ownerId: options.ownerId ?? `bench:${task.id}`,
    limits: options.budget,
  });

  const { recall, notes } = anchorRecall(repoRoot, budgeted.paths_read, task.anchors);
  return {
    task_id: task.id,
    arm: "B0_BUDGET",
    paths_read: budgeted.paths_read,
    input_tokens: budgeted.telemetry.tokens_measured,
    recall,
    recall_notes: notes,
    tokenizer: budgeted.telemetry.tokenizer,
  };
}
