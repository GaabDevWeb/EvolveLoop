/**
 * V22-GAP-P0-1 — six baseline tasks on the official monorepo corpus.
 *
 * B0 reads broad rg hits (45-path cap). V2.2 is the real pickup/handoff
 * prompt plus wiki/path retrieval under the canonical 22000-token budget.
 * Tiktoken is required. Generative output, vendor cache, cost, and Ollama
 * hybrid stay NOT_MEASURED. Compaction stays UNAVAILABLE.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  assertReinjectAllowed,
  getCompactionReinjectContract,
} from "../context/compaction-contract.js";
import { rankRetrievalPaths, selectTopRankedPaths, tokenizeForRanking } from "../context/retrieval-ranking.js";
import { requireTiktokenCounts } from "../context/tokenizer.js";
import { applyTruthFence, codeOverridesWiki } from "../knowledge/truth-source/fence.js";
import type { TruthSourcedItem } from "../knowledge/truth-source/types.js";
import { buildPickupPrompt } from "../jobs/job-pickup.js";
import type { SkillJob } from "../jobs/job-store.js";
import { preparePickupSpawnContext } from "../jobs/spawn-pickup-context.js";
import { buildBenchSkillJob } from "./bench-pickup-fixture.js";

export const P0_TASK_IDS = [
  "curta",
  "projeto_grande",
  "retomada",
  "delegada",
  "fontes_conflitantes",
  "restricoes_compactacao_handoff",
] as const;

export type P0TaskId = (typeof P0_TASK_IDS)[number];

export const CANONICAL_MAX_PATHS = 45;
export const CANONICAL_MAX_INPUT_TOKENS = 22_000;
export const CANONICAL_SCORER = "v22-anchor-scorer-1.0.0";

const REQUIRED_FIELDS = [
  "input_tokens",
  "output_tokens",
  "cache_read_tokens",
  "cache_write_tokens",
  "cost",
  "latency_ms",
  "reread_count",
  "n",
  "dispersion",
  "model_id",
  "tree_sha",
  "limitation",
] as const;

export interface AnchorSpec {
  path: string;
  line: number;
  substring: string;
}

export interface ConflictSpec {
  topic_key: string;
  code_path: string;
  wiki_path: string;
  stale_marker: string;
}

export interface FrozenTask {
  id: P0TaskId;
  brief_name: string;
  source_task: string;
  query: string;
  b0_patterns: string[];
  anchors: AnchorSpec[];
  restrictions: string[];
  resume_marker?: string;
  conflict?: ConflictSpec;
  security_restriction?: string;
  handoff: boolean;
}

interface TasksDocument {
  schema_id: string;
  task_id: string;
  n_min: number;
  required_fields: string[];
  fixed_values: Record<string, string>;
  limitation: string;
  tasks: FrozenTask[];
}

export type MetricStatus = "PASS" | "LIMITED" | "NOT_MEASURED" | "UNAVAILABLE";

export interface Dispersion {
  statistic: "sample_stddev";
  value: number;
  n: number;
  expectation: "zero_expected_deterministic" | "retrieval_io_jitter";
  status: MetricStatus;
}

export interface QualityCheck {
  id: string;
  pass: boolean;
  note?: string;
}

export interface ArmRun {
  repetition: number;
  input_tokens: number;
  retrieval_input_tokens: number;
  latency_ms: number;
  reread_count: number;
  paths_read: string[];
  quality: number;
  quality_checks: QualityCheck[];
  verifier_pass: boolean;
  rejected_source_refs?: string[];
}

export interface ArmReport {
  arm: "B0" | "V2.2";
  role: "V2" | "V2.2";
  evidence_class: "OFFICIAL_BASELINE" | "PROJECT_WIKI_PICKUP_BUDGET";
  input_tokens: number;
  input_tokens_status: MetricStatus;
  retrieval_input_tokens: number;
  output_tokens: "NOT_MEASURED";
  output_tokens_status: "NOT_MEASURED";
  cache_read_tokens: "NOT_MEASURED";
  cache_read_tokens_status: "NOT_MEASURED";
  cache_write_tokens: "NOT_MEASURED";
  cache_write_tokens_status: "NOT_MEASURED";
  cost: "NOT_MEASURED";
  cost_status: "NOT_MEASURED";
  latency_ms: number;
  latency_ms_status: "LIMITED";
  latency_kind: "retrieval";
  model_latency_ms: "NOT_MEASURED";
  model_latency_ms_status: "NOT_MEASURED";
  reread_count: number;
  reread_count_status: MetricStatus;
  n: number;
  n_status: "PASS";
  dispersion: {
    input_tokens: Dispersion;
    output_tokens: "NOT_MEASURED";
    cache_read_tokens: "NOT_MEASURED";
    cache_write_tokens: "NOT_MEASURED";
    cost: "NOT_MEASURED";
    latency_ms: Dispersion;
    reread_count: Dispersion;
    model: "NOT_MEASURED";
  };
  model_id: "deterministic-provider";
  tree_sha: string;
  limitation: string;
  tokenizer: "tiktoken:cl100k_base";
  quality: number;
  quality_status: MetricStatus;
  verifier_pass: boolean;
  paths_read: string[];
  runs: ArmRun[];
}

export interface CompactionContractEvidence {
  status: "UNAVAILABLE";
  fidelity: "UNAVAILABLE";
  compaction_tokens: "UNAVAILABLE";
  contract_status: "NOT_IMPLEMENTED";
  reinject_allowed: false;
  reinject_probe_allowed: false;
  reinject_probe_reason: string;
  fidelity_probe_reason: string;
  source: "orchestrator/src/context/compaction-contract.ts";
  cited_test: string;
}

export interface TaskReport {
  id: P0TaskId;
  brief_name: string;
  source_task: string;
  compaction: "UNAVAILABLE";
  compaction_tokens: "UNAVAILABLE";
  compaction_fidelity: "UNAVAILABLE";
  generative_token_reduction: "NOT_MEASURED";
  product_percent_gate: "NOT_MEASURED";
  ollama_hybrid: "NOT_MEASURED";
  quality_b0: number;
  quality_v22: number;
  quality_v22_gte_b0: boolean;
  raw_input_delta: number;
  savings_counted: boolean;
  deterministic_context_savings_status: "PASS" | "LIMITED" | "NOT_MEASURED";
  deterministic_context_evidence_class: "MEASURED_DETERMINISTIC_CONTEXT";
  savings_rule: "docs/v22/GOALS-OFFICIAL.md#5.3";
  compaction_contract?: CompactionContractEvidence;
  arms: { B0: ArmReport; "V2.2": ArmReport };
}

export interface P0BaselineReport {
  schema_id: "v22-p0-baseline-report-1";
  task_id: "V22-GAP-P0-1";
  evidence_class: "MEASURED_DETERMINISTIC_CONTEXT";
  generative_token_reduction: "NOT_MEASURED";
  product_percent_gate: "NOT_MEASURED";
  compaction: "UNAVAILABLE";
  ollama_hybrid: "NOT_MEASURED";
  model_id: "deterministic-provider";
  tokenizer: "tiktoken:cl100k_base";
  tree_sha: string;
  n: number;
  limitation: string;
  tasks_sha256: string;
  norm: "docs/v22/GOALS-OFFICIAL.md";
  metrics_schema: "docs/v22/baseline/metrics.schema.json";
  tasks_file: "docs/v22/baseline/tasks.json";
  canonical_scorer: typeof CANONICAL_SCORER;
  canonical_max_paths: typeof CANONICAL_MAX_PATHS;
  canonical_max_input_tokens: typeof CANONICAL_MAX_INPUT_TOKENS;
  dispersion_declaration: "zero_expected_deterministic_for_input_tokens";
  measured_at: string;
  compaction_contract: CompactionContractEvidence;
  tasks: TaskReport[];
}

export function savingsStatus(
  qualityV22: number,
  qualityB0: number,
  inputDelta: number,
): "PASS" | "LIMITED" | "NOT_MEASURED" {
  if (qualityV22 < qualityB0) return "NOT_MEASURED";
  if (inputDelta < 0) return "PASS";
  return "LIMITED";
}

export function repoRootFromModule(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function asStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be a string array`);
  }
  return value as string[];
}

function asPositiveInt(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function parseAnchor(value: unknown, label: string): AnchorSpec {
  const row = asRecord(value, label);
  return {
    path: asString(row.path, `${label}.path`),
    line: asPositiveInt(row.line, `${label}.line`),
    substring: asString(row.substring, `${label}.substring`),
  };
}

function parseTask(value: unknown, index: number): FrozenTask {
  const row = asRecord(value, `tasks[${index}]`);
  const id = asString(row.id, `tasks[${index}].id`);
  if (!P0_TASK_IDS.includes(id as P0TaskId)) throw new Error(`unknown baseline task id: ${id}`);
  const anchorsRaw = row.anchors;
  if (!Array.isArray(anchorsRaw) || anchorsRaw.length === 0) {
    throw new Error(`tasks[${index}].anchors must be a non-empty array`);
  }
  let conflict: ConflictSpec | undefined;
  if (row.conflict !== undefined) {
    const c = asRecord(row.conflict, `tasks[${index}].conflict`);
    conflict = {
      topic_key: asString(c.topic_key, "conflict.topic_key"),
      code_path: asString(c.code_path, "conflict.code_path"),
      wiki_path: asString(c.wiki_path, "conflict.wiki_path"),
      stale_marker: asString(c.stale_marker, "conflict.stale_marker"),
    };
  }
  return {
    id: id as P0TaskId,
    brief_name: asString(row.brief_name, `tasks[${index}].brief_name`),
    source_task: asString(row.source_task, `tasks[${index}].source_task`),
    query: asString(row.query, `tasks[${index}].query`),
    b0_patterns: asStringList(row.b0_patterns, `tasks[${index}].b0_patterns`),
    anchors: anchorsRaw.map((anchor, anchorIndex) => parseAnchor(anchor, `tasks[${index}].anchors[${anchorIndex}]`)),
    restrictions: asStringList(row.restrictions ?? [], `tasks[${index}].restrictions`),
    resume_marker: row.resume_marker === undefined ? undefined : asString(row.resume_marker, "resume_marker"),
    conflict,
    security_restriction:
      row.security_restriction === undefined
        ? undefined
        : asString(row.security_restriction, "security_restriction"),
    handoff: row.handoff === true,
  };
}

export function loadFrozenTasks(repoRoot = repoRootFromModule()): {
  document: TasksDocument;
  tasks: FrozenTask[];
  tasksPath: string;
  tasksSha256: string;
} {
  const tasksPath = path.join(repoRoot, "docs/v22/baseline/tasks.json");
  const raw = readFileSync(tasksPath, "utf-8");
  const parsed = asRecord(JSON.parse(raw) as unknown, "tasks.json");
  if (parsed.schema_id !== "v22-p0-baseline-tasks-1") throw new Error("tasks.json schema_id mismatch");
  if (parsed.corpus !== "evolveloop-monorepo") throw new Error("tasks.json corpus must be the official monorepo");
  const budget = asRecord(parsed.canonical_budget, "canonical_budget");
  if (budget.max_input_tokens !== CANONICAL_MAX_INPUT_TOKENS || budget.max_paths !== CANONICAL_MAX_PATHS) {
    throw new Error("tasks.json canonical budget does not match the scorer cap of 45 paths / 22000 tokens");
  }
  const required = asStringList(parsed.required_fields, "required_fields");
  for (const field of REQUIRED_FIELDS) {
    if (!required.includes(field)) throw new Error(`tasks.json missing required field ${field}`);
  }
  const fixed = asRecord(parsed.fixed_values, "fixed_values");
  const fixedValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(fixed)) fixedValues[key] = asString(value, `fixed_values.${key}`);
  for (const key of [
    "output_tokens",
    "cache_read_tokens",
    "cache_write_tokens",
    "cost",
    "model_id",
    "compaction",
    "generative_token_reduction",
    "product_percent_gate",
    "ollama_hybrid",
  ]) {
    if (!(key in fixedValues)) throw new Error(`fixed_values.${key} missing`);
  }
  if (!Array.isArray(parsed.tasks)) throw new Error("tasks must be an array");
  const tasks = parsed.tasks.map((task, index) => parseTask(task, index));
  const ids = tasks.map((task) => task.id);
  if (ids.length !== P0_TASK_IDS.length || P0_TASK_IDS.some((id) => !ids.includes(id))) {
    throw new Error(`tasks.json must contain exactly ${P0_TASK_IDS.join(", ")}`);
  }
  return {
    document: {
      schema_id: "v22-p0-baseline-tasks-1",
      task_id: "V22-GAP-P0-1",
      n_min: asPositiveInt(parsed.n_min, "n_min"),
      required_fields: required,
      fixed_values: fixedValues,
      limitation: asString(parsed.limitation, "limitation"),
      tasks,
    },
    tasks,
    tasksPath,
    tasksSha256: createHash("sha256").update(raw, "utf8").digest("hex"),
  };
}

function readTreeSha(repoRoot: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf-8" });
  const sha = result.stdout?.trim() ?? "";
  if (result.status !== 0 || !/^[0-9a-f]{40}$/.test(sha)) return "NOT_MEASURED";
  return sha;
}

function readCompactionContract(): CompactionContractEvidence {
  const contract = getCompactionReinjectContract();
  if (contract.status !== "NOT_IMPLEMENTED" || contract.reinject_allowed !== false) {
    throw new Error(
      "P0 baseline refuses to invent compaction numbers, and the contract is no longer NOT_IMPLEMENTED with reinject disabled.",
    );
  }
  const passed = assertReinjectAllowed(true);
  const missing = assertReinjectAllowed(false);
  if (passed.allowed || missing.allowed) {
    throw new Error("compaction reinject probe returned allowed; refusing to publish a token number");
  }
  return {
    status: "UNAVAILABLE",
    fidelity: "UNAVAILABLE",
    compaction_tokens: "UNAVAILABLE",
    contract_status: contract.status,
    reinject_allowed: false,
    reinject_probe_allowed: false,
    reinject_probe_reason: passed.reason,
    fidelity_probe_reason: missing.reason,
    source: "orchestrator/src/context/compaction-contract.ts",
    cited_test:
      "orchestrator/tests/unit/context-ownership.test.ts — AC: contrato compaction/reinject fail-closed",
  };
}

function normPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

class CorpusCache {
  private text = new Map<string, string>();

  constructor(private root: string) {}

  read(rel: string): string {
    const key = normPath(rel);
    const cached = this.text.get(key);
    if (cached !== undefined) return cached;
    const abs = path.join(this.root, key);
    let body = "";
    try {
      if (existsSync(abs) && statSync(abs).isFile() && statSync(abs).size <= 1_000_000) {
        body = readFileSync(abs, "utf-8");
      }
    } catch {
      body = "";
    }
    this.text.set(key, body);
    return body;
  }
}

function isMeasurementArtifact(rel: string): boolean {
  const key = normPath(rel);
  return (
    key.startsWith("docs/v22/baseline/") ||
    key === "orchestrator/src/v22/p0-baseline-harness.ts" ||
    key === "orchestrator/tests/unit/v22-p0-baseline.test.ts"
  );
}

const RG_GLOBS = [
  "!node_modules",
  "!.git",
  "!dist",
  "!**/.venv",
  "!agent-setup/.venv",
  "!docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/**",
];

function assertRgAvailable(): void {
  const probe = spawnSync("rg", ["--version"], { encoding: "utf-8" });
  if (probe.error || probe.status !== 0) {
    throw new Error(
      `P0 baseline requires rg and will not publish an empty read: ${probe.error?.message || probe.stderr?.trim() || "rg --version failed"}`,
    );
  }
}

function rgList(root: string, pattern: string): string[] {
  const args = ["-l", pattern, root];
  for (const glob of RG_GLOBS) args.push("--glob", glob);
  const proc = spawnSync("rg", args, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  if (proc.error || (proc.status !== 0 && proc.status !== 1)) {
    throw new Error(
      `rg failed for ${JSON.stringify(pattern)} under ${root}: ${proc.error?.message || proc.stderr?.trim() || `status ${proc.status}`}`,
    );
  }
  const rel: string[] = [];
  for (const line of (proc.stdout ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith(root)) rel.push(trimmed.slice(root.length + 1));
    else rel.push(trimmed);
  }
  return rel;
}

function rgHits(root: string, patterns: string[]): string[] {
  const hits: string[] = [];
  for (const pattern of patterns) {
    if (!pattern.trim()) continue;
    hits.push(...rgList(root, pattern));
  }
  return [...new Set(hits.map(normPath))]
    .filter((rel) => !rel.startsWith("secrets/") && !isMeasurementArtifact(rel))
    .sort();
}

function queryPatterns(query: string): string[] {
  const terms = tokenizeForRanking(query).filter((term) => term.length >= 4);
  return [...new Set(terms)].slice(0, 6);
}

function wikiPages(root: string): string[] {
  const dirs = [
    path.join(root, ".ai/pages"),
    path.join(
      root,
      "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/fixtures/evolveloop-project-knowledge/.ai/pages",
    ),
  ];
  const out: string[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      const rel = normPath(path.relative(root, path.join(dir, name)));
      if (!isMeasurementArtifact(rel)) out.push(rel);
    }
  }
  return out;
}

function sourcePaths(text: string): string[] {
  const paths: string[] = [];
  let inBlock = false;
  for (const line of text.split("\n")) {
    if (line.trim() === "source_paths:") {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (line.trim().startsWith("- ")) paths.push(line.trim().slice(2).trim());
    else if (line.trim() && !line.startsWith(" ")) inBlock = false;
  }
  return paths;
}

function anchorCheck(cache: CorpusCache, assembled: string, pathsRead: string[], anchor: AnchorSpec): QualityCheck {
  const pathRead = pathsRead.includes(anchor.path);
  const fileText = cache.read(anchor.path);
  const inFile = Boolean(anchor.substring) && fileText.includes(anchor.substring);
  const inContext = Boolean(anchor.substring) && assembled.includes(anchor.substring);
  const lines = fileText.split("\n");
  const lineOk = anchor.line >= 1 && anchor.line <= lines.length && lines[anchor.line - 1]?.includes(anchor.substring);
  let note: string | undefined;
  if (!pathRead) note = "miss path not read";
  else if (!inFile) note = "miss evidence in file";
  else if (!inContext) note = "anchor absent from assembled context";
  else if (!lineOk) note = `anchor line drift (file evidence): ${anchor.path}:${anchor.line}`;
  return { id: `anchor:${anchor.path}`, pass: pathRead && inFile && inContext, note };
}

function qualityChecks(task: FrozenTask, cache: CorpusCache, text: string, pathsRead: string[]): QualityCheck[] {
  const checks: QualityCheck[] = task.anchors.map((anchor) => anchorCheck(cache, text, pathsRead, anchor));
  for (const restriction of task.restrictions) {
    checks.push({
      id: `restriction:${restriction.slice(0, 48)}`,
      pass: text.includes(restriction),
      note: text.includes(restriction) ? undefined : "missing restriction",
    });
  }
  if (task.resume_marker) {
    checks.push({
      id: "resume",
      pass: text.includes(task.resume_marker),
      note: text.includes(task.resume_marker) ? undefined : "resume marker absent",
    });
  }
  if (task.conflict) {
    const signaled = text.includes("truth_fence code_authority_over_wiki");
    checks.push({
      id: "conflict_signaled",
      pass: signaled,
      note: signaled ? undefined : "fence did not signal code over wiki",
    });
    checks.push({
      id: "stale_absent",
      pass: !text.includes(task.conflict.stale_marker),
      note: text.includes(task.conflict.stale_marker) ? "stale marker still in context" : undefined,
    });
  }
  return checks;
}

function qualityScore(checks: QualityCheck[]): number {
  if (checks.length === 0) return 0;
  return checks.filter((check) => check.pass).length / checks.length;
}

function qualityStatus(score: number): MetricStatus {
  if (score >= 1) return "PASS";
  if (score > 0) return "LIMITED";
  return "LIMITED";
}

interface Packed {
  text: string;
  paths: string[];
  rereadCount: number;
  retrievalTokens: number;
  rejected: string[];
}

function packFiles(cache: CorpusCache, paths: string[]): { text: string; rereadCount: number } {
  const seen = new Set<string>();
  let rereadCount = 0;
  const parts: string[] = [];
  for (const rel of paths) {
    const key = normPath(rel);
    if (seen.has(key)) rereadCount += 1;
    else seen.add(key);
    parts.push(`--- ${key} ---\n${cache.read(key)}`);
  }
  return { text: parts.join("\n"), rereadCount };
}

function countOne(text: string): number {
  return requireTiktokenCounts([text])[0] ?? 0;
}

function applyConflictFence(
  task: FrozenTask,
  cache: CorpusCache,
  hits: string[],
): { drop: Set<string>; rejected: string[]; note: string } {
  const drop = new Set<string>();
  if (!task.conflict) return { drop, rejected: [], note: "" };
  const codePath = normPath(task.conflict.code_path);
  const wikiPath = normPath(task.conflict.wiki_path);
  if (!hits.includes(codePath) || !hits.includes(wikiPath)) {
    return { drop, rejected: [], note: "conflict pair was not in the retrieval hit list" };
  }
  const items: TruthSourcedItem[] = [
    {
      topic_key: task.conflict.topic_key,
      tier: "code",
      provenance: { source_ref: codePath },
      excerpt: cache.read(codePath).slice(0, 500),
    },
    {
      topic_key: task.conflict.topic_key,
      tier: "ai",
      ai_status: "atual",
      provenance: { source_ref: wikiPath },
      excerpt: cache.read(wikiPath).slice(0, 500),
    },
  ];
  const fence = applyTruthFence(items);
  const overridden = codeOverridesWiki(
    items.filter((item) => item.tier === "code"),
    items.filter((item) => item.tier !== "code"),
  );
  const rejected = new Set<string>();
  for (const item of fence.rejected) {
    if (item.provenance.source_ref) rejected.add(item.provenance.source_ref);
  }
  for (const item of overridden) {
    if (item.superseded && item.provenance.source_ref) {
      rejected.add(item.provenance.source_ref);
      drop.add(item.provenance.source_ref);
    }
  }
  return {
    drop,
    rejected: [...rejected],
    note: overridden.some((item) => item.superseded) ? "code_authority_over_wiki" : "",
  };
}

/** Tokens kept free inside the 22000 cap for DoD, gate bundle, and security slices. */
const PICKUP_PROTECTED_HEADROOM = 800;

function budgetPaths(
  cache: CorpusCache,
  ranked: Array<{ path: string; score: number }>,
  reservedTokens: number,
): string[] {
  const pool = ranked.slice(0, CANONICAL_MAX_PATHS * 4);
  const bodies = pool.map((item) => cache.read(item.path));
  const counts = requireTiktokenCounts(bodies);
  const tokens = new Map(pool.map((item, index) => [item.path, counts[index] ?? 0]));
  const selected = selectTopRankedPaths(ranked, (rel) => tokens.get(rel) ?? 1, CANONICAL_MAX_PATHS);
  const kept: string[] = [];
  let used = reservedTokens;
  for (const rel of selected) {
    const next = tokens.get(rel) ?? countOne(cache.read(rel));
    const separator = 8;
    if (kept.length >= CANONICAL_MAX_PATHS) break;
    if (used + next + separator > CANONICAL_MAX_INPUT_TOKENS) continue;
    kept.push(rel);
    used += next + separator;
  }
  return kept;
}

function assembleB0(task: FrozenTask, cache: CorpusCache, root: string): Packed {
  const hits = rgHits(root, task.b0_patterns).slice(0, CANONICAL_MAX_PATHS);
  if (hits.length === 0) {
    throw new Error(`${task.id}: B0 rg returned no files for ${task.b0_patterns.join(", ")} under ${root}`);
  }
  const packed = packFiles(cache, hits);
  return {
    text: packed.text,
    paths: hits,
    rereadCount: packed.rereadCount,
    retrievalTokens: countOne(packed.text),
    rejected: [],
  };
}

function extractBudgetedContext(block: string): string {
  const marker = "### Context (budgeted retrieval)\n\n";
  const start = block.indexOf(marker);
  if (start === -1) return block.trim();
  let inner = block.slice(start + marker.length);
  if (inner.endsWith("\n")) inner = inner.slice(0, -1);
  return inner;
}

function pathsFromBudgeted(inner: string): string[] {
  const paths: string[] = [];
  for (const match of inner.matchAll(/^--- path:(.+) ---$/gm)) {
    const rel = match[1]?.trim();
    if (rel && !rel.startsWith("spawn://")) paths.push(normPath(rel));
  }
  return [...new Set(paths)];
}

function assembleV22(task: FrozenTask, cache: CorpusCache, root: string, jobsDir: string): Packed {
  const patterns = queryPatterns(task.query);
  const hits = new Set(rgHits(root, patterns));
  for (const page of wikiPages(root)) {
    const text = cache.read(page);
    const hay = text.toLowerCase();
    if (patterns.some((pattern) => hay.includes(pattern.toLowerCase()))) {
      hits.add(page);
      for (const source of sourcePaths(text)) {
        if (existsSync(path.join(root, source))) hits.add(normPath(source));
      }
    }
  }
  const hitList = [...hits].sort();
  const fence = applyConflictFence(task, cache, hitList);
  const candidates = hitList.filter((rel) => !fence.drop.has(rel));
  const ranked = rankRetrievalPaths(candidates, (rel) => cache.read(rel), { query: task.query });
  const fenceBody = fence.note ? `truth_fence ${fence.note}\nrejected: ${fence.rejected.join(", ")}` : "";
  const fenceTokens = fenceBody ? countOne(fenceBody) + 8 : 0;
  const paths = budgetPaths(cache, ranked, fenceTokens + PICKUP_PROTECTED_HEADROOM);
  const retrieval: NonNullable<SkillJob["context_retrieval"]> = paths.map((rel) => ({
    path: rel,
    content: cache.read(rel),
    kind: rel.includes(".ai/") ? "knowledge" : "generic",
    priority: 10,
  }));
  if (fenceBody) {
    retrieval.unshift({
      path: "spawn://truth-fence",
      content: fenceBody,
      kind: "evidence",
      priority: 1000,
    });
  }
  const job: SkillJob = {
    ...buildBenchSkillJob({
      task: { id: task.id, query: task.query },
      featureId: `p0-${task.id}`,
      runId: `p0-${task.id}`,
      nodeId: `p0-${task.id}`,
    }),
    feature_id: `p0-${task.id}`,
    gate_bundle: {
      parent_cycle_id: `p0-${task.id}`,
      spawn_depth: 1,
      max_spawn_depth: 3,
      role: "exec",
      context_budget: {
        max_paths: CANONICAL_MAX_PATHS,
        max_pages: 8,
        max_tokens: CANONICAL_MAX_INPUT_TOKENS,
      },
    },
    context_retrieval: retrieval,
    spawn_metadata: task.security_restriction
      ? { security_restrictions: task.security_restriction }
      : undefined,
  };
  const spawn = preparePickupSpawnContext(job, jobsDir, { featureId: job.feature_id ?? job.node_id });
  if (!spawn.validation_ok || !spawn.budgeted_context_block) {
    throw new Error(`${task.id}: pickup context was not assembled (${spawn.validation_reason ?? "empty budget"})`);
  }
  const prompt = task.handoff
    ? buildPickupPrompt(job, jobsDir, undefined, { caveman: false, spawnContext: spawn })
    : extractBudgetedContext(spawn.budgeted_context_block);
  const inner = extractBudgetedContext(spawn.budgeted_context_block);
  const retrievalTokens = countOne(inner);
  if (retrievalTokens > CANONICAL_MAX_INPUT_TOKENS) {
    throw new Error(`${task.id}: V2.2 retrieval block exceeded the canonical ${CANONICAL_MAX_INPUT_TOKENS} token budget`);
  }
  return {
    text: prompt,
    paths: pathsFromBudgeted(inner),
    rereadCount: 0,
    retrievalTokens,
    rejected: fence.rejected,
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStddev(values: number[], expectation: Dispersion["expectation"]): Dispersion {
  const center = mean(values);
  const square = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  const value = Math.sqrt(square / (values.length - 1));
  return {
    statistic: "sample_stddev",
    value,
    n: values.length,
    expectation,
    status: "PASS",
  };
}

function armReport(
  arm: "B0" | "V2.2",
  runs: ArmRun[],
  treeSha: string,
  limitation: string,
): ArmReport {
  const input = runs.map((run) => run.input_tokens);
  const latency = runs.map((run) => run.latency_ms);
  const rereads = runs.map((run) => run.reread_count);
  const inputMean = mean(input);
  const inputStatus: MetricStatus = inputMean >= 200 ? "PASS" : "LIMITED";
  const quality = mean(runs.map((run) => run.quality));
  return {
    arm,
    role: arm === "B0" ? "V2" : "V2.2",
    evidence_class: arm === "B0" ? "OFFICIAL_BASELINE" : "PROJECT_WIKI_PICKUP_BUDGET",
    input_tokens: inputMean,
    input_tokens_status: inputStatus,
    retrieval_input_tokens: mean(runs.map((run) => run.retrieval_input_tokens)),
    output_tokens: "NOT_MEASURED",
    output_tokens_status: "NOT_MEASURED",
    cache_read_tokens: "NOT_MEASURED",
    cache_read_tokens_status: "NOT_MEASURED",
    cache_write_tokens: "NOT_MEASURED",
    cache_write_tokens_status: "NOT_MEASURED",
    cost: "NOT_MEASURED",
    cost_status: "NOT_MEASURED",
    latency_ms: mean(latency),
    latency_ms_status: "LIMITED",
    latency_kind: "retrieval",
    model_latency_ms: "NOT_MEASURED",
    model_latency_ms_status: "NOT_MEASURED",
    reread_count: mean(rereads),
    reread_count_status: "PASS",
    n: runs.length,
    n_status: "PASS",
    dispersion: {
      input_tokens: sampleStddev(input, "zero_expected_deterministic"),
      output_tokens: "NOT_MEASURED",
      cache_read_tokens: "NOT_MEASURED",
      cache_write_tokens: "NOT_MEASURED",
      cost: "NOT_MEASURED",
      latency_ms: sampleStddev(latency, "retrieval_io_jitter"),
      reread_count: sampleStddev(rereads, "zero_expected_deterministic"),
      model: "NOT_MEASURED",
    },
    model_id: "deterministic-provider",
    tree_sha: treeSha,
    limitation,
    tokenizer: "tiktoken:cl100k_base",
    quality,
    quality_status: qualityStatus(quality),
    verifier_pass: runs.every((run) => run.verifier_pass),
    paths_read: runs[0]?.paths_read ?? [],
    runs,
  };
}

async function runArm(
  arm: "B0" | "V2.2",
  task: FrozenTask,
  root: string,
  repetition: number,
): Promise<ArmRun> {
  const graphifyBefore = process.env.EVOLVELOOP_GRAPHIFY;
  const cache = new CorpusCache(root);
  const jobsDir = path.join(tmpdir(), "v22-p0-baseline", task.id, arm);
  await mkdir(jobsDir, { recursive: true });
  const started = performance.now();
  try {
    const packed = arm === "B0" ? assembleB0(task, cache, root) : assembleV22(task, cache, root, jobsDir);
    const latencyMs = performance.now() - started;
    if (process.env.EVOLVELOOP_GRAPHIFY !== graphifyBefore) {
      throw new Error("harness mutated EVOLVELOOP_GRAPHIFY");
    }
    const inputTokens = countOne(packed.text);
    const checks = qualityChecks(task, cache, packed.text, packed.paths);
    const quality = qualityScore(checks);
    if (!Number.isFinite(inputTokens) || inputTokens < 0) {
      throw new Error(`${task.id}: tiktoken did not return a measured input count`);
    }
    return {
      repetition,
      input_tokens: inputTokens,
      retrieval_input_tokens: packed.retrievalTokens,
      latency_ms: latencyMs,
      reread_count: packed.rereadCount,
      paths_read: packed.paths,
      quality,
      quality_checks: checks,
      verifier_pass: quality >= 1,
      rejected_source_refs: packed.rejected,
    };
  } finally {
    await rm(jobsDir, { recursive: true, force: true });
  }
}

export async function runP0Baseline(options?: { n?: number; repoRoot?: string }): Promise<P0BaselineReport> {
  const repoRoot = options?.repoRoot ?? repoRootFromModule();
  const loaded = loadFrozenTasks(repoRoot);
  const n = options?.n ?? loaded.document.n_min;
  if (!Number.isInteger(n) || n < Math.max(3, loaded.document.n_min)) {
    throw new Error(`n must be an integer >= ${Math.max(3, loaded.document.n_min)}`);
  }
  assertRgAvailable();
  requireTiktokenCounts(["p0-baseline-tiktoken-probe"]);
  const corpusProbe = rgHits(repoRoot, ["cleanOutput"]);
  if (!corpusProbe.includes("orchestrator/src/capabilities/results.ts")) {
    throw new Error(`P0 corpus probe missed results.ts under ${repoRoot} (rg hits: ${corpusProbe.length})`);
  }
  const compaction = readCompactionContract();
  const treeSha = readTreeSha(repoRoot);
  const taskReports: TaskReport[] = [];

  for (const task of loaded.tasks) {
    const b0Runs: ArmRun[] = [];
    const v22Runs: ArmRun[] = [];
    for (let repetition = 1; repetition <= n; repetition += 1) {
      b0Runs.push(await runArm("B0", task, repoRoot, repetition));
      v22Runs.push(await runArm("V2.2", task, repoRoot, repetition));
    }
    const b0 = armReport("B0", b0Runs, treeSha, loaded.document.limitation);
    const v22 = armReport("V2.2", v22Runs, treeSha, loaded.document.limitation);
    if (b0.dispersion.input_tokens.value !== 0 || v22.dispersion.input_tokens.value !== 0) {
      throw new Error(`${task.id}: input token dispersion was not 0 on a deterministic corpus`);
    }
    const delta = v22.input_tokens - b0.input_tokens;
    const counted = v22.quality >= b0.quality;
    taskReports.push({
      id: task.id,
      brief_name: task.brief_name,
      source_task: task.source_task,
      compaction: "UNAVAILABLE",
      compaction_tokens: "UNAVAILABLE",
      compaction_fidelity: "UNAVAILABLE",
      generative_token_reduction: "NOT_MEASURED",
      product_percent_gate: "NOT_MEASURED",
      ollama_hybrid: "NOT_MEASURED",
      quality_b0: b0.quality,
      quality_v22: v22.quality,
      quality_v22_gte_b0: counted,
      raw_input_delta: delta,
      savings_counted: counted,
      deterministic_context_savings_status: savingsStatus(v22.quality, b0.quality, delta),
      deterministic_context_evidence_class: "MEASURED_DETERMINISTIC_CONTEXT",
      savings_rule: "docs/v22/GOALS-OFFICIAL.md#5.3",
      compaction_contract: task.id === "restricoes_compactacao_handoff" ? compaction : undefined,
      arms: { B0: b0, "V2.2": v22 },
    });
  }

  return {
    schema_id: "v22-p0-baseline-report-1",
    task_id: "V22-GAP-P0-1",
    evidence_class: "MEASURED_DETERMINISTIC_CONTEXT",
    generative_token_reduction: "NOT_MEASURED",
    product_percent_gate: "NOT_MEASURED",
    compaction: "UNAVAILABLE",
    ollama_hybrid: "NOT_MEASURED",
    model_id: "deterministic-provider",
    tokenizer: "tiktoken:cl100k_base",
    tree_sha: treeSha,
    n,
    limitation: loaded.document.limitation,
    tasks_sha256: loaded.tasksSha256,
    norm: "docs/v22/GOALS-OFFICIAL.md",
    metrics_schema: "docs/v22/baseline/metrics.schema.json",
    tasks_file: "docs/v22/baseline/tasks.json",
    canonical_scorer: CANONICAL_SCORER,
    canonical_max_paths: CANONICAL_MAX_PATHS,
    canonical_max_input_tokens: CANONICAL_MAX_INPUT_TOKENS,
    dispersion_declaration: "zero_expected_deterministic_for_input_tokens",
    measured_at: new Date().toISOString(),
    compaction_contract: compaction,
    tasks: taskReports,
  };
}
