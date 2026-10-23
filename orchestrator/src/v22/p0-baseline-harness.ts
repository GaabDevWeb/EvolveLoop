/**
 * V22-GAP-P0-1 — six frozen tasks, B0 (V2) vs V2.2.
 *
 * Uses DeterministicProvider only. Generative output, vendor cache, and cost
 * stay NOT_MEASURED. Compaction stays UNAVAILABLE: this module does not
 * compact, summarize, or reinject.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyContextBudget, sliceFromFile } from "../context/budget.js";
import {
  assertReinjectAllowed,
  getCompactionReinjectContract,
} from "../context/compaction-contract.js";
import type { ContextSlice, ContextSliceKind } from "../context/types.js";
import { countTokens, type TokenizerLabel } from "../context/tokenizer.js";
import { applyTruthFence, codeOverridesWiki } from "../knowledge/truth-source/fence.js";
import type { TruthSourcedItem, TruthSourceTier } from "../knowledge/truth-source/types.js";
import { createDeterministicProvider } from "../providers/deterministic/index.js";
import type { ExecuteRequest, ExecuteResult, GraphNode } from "../types/index.js";

export const P0_TASK_IDS = [
  "curta",
  "projeto_grande",
  "retomada",
  "delegada",
  "fontes_conflitantes",
  "restricoes_compactacao_handoff",
] as const;

export type P0TaskId = (typeof P0_TASK_IDS)[number];

const SLICE_KINDS = new Set<ContextSliceKind>([
  "acceptance_criteria",
  "security_restriction",
  "evidence",
  "gate_bundle",
  "knowledge",
  "memory",
  "checkpoint",
  "working",
  "generic",
]);

const TIERS = new Set<TruthSourceTier>(["code", "ai", "vault", "inferred"]);

export interface FrozenFile {
  path: string;
  content: string;
  priority: number;
  kind: ContextSliceKind;
  tier?: TruthSourceTier;
  topic_key?: string;
  ai_status?: "atual" | "obsoleto" | "draft" | "unknown";
}

export interface FrozenTask {
  id: P0TaskId;
  brief_name: string;
  query: string;
  anchor_path: string;
  budget: { max_paths: number; max_pages: number; max_tokens: number };
  use_truth_fence: boolean;
  must_include: string[];
  v22_must_exclude: string[];
  b0_must_exclude: string[];
  files: FrozenFile[];
}

interface NoiseSpec {
  count: number;
  path_template: string;
  content_template: string;
  priority: number;
  kind?: ContextSliceKind;
}

interface HandoffSpec {
  path: string;
  content: string;
  kind: ContextSliceKind;
  priority: number;
}

interface TaskCard extends FrozenTask {
  noise?: NoiseSpec;
  handoff?: HandoffSpec;
}

export interface TasksDocument {
  schema_id: string;
  task_id: string;
  n_min: number;
  required_fields: string[];
  fixed_values: Record<string, string>;
  limitation: string;
  tasks: TaskCard[];
}

export interface ArmRun {
  repetition: number;
  input_tokens: number;
  latency_ms: number;
  reread_count: number;
  paths_read: string[];
  markers_present: string[];
  verifier_pass: boolean;
  rejected_source_refs?: string[];
}

export interface Dispersion {
  statistic: "sample_stddev";
  value: number;
  n: number;
}

export interface ArmReport {
  arm: "B0" | "V2.2";
  role: "V2" | "V2.2";
  input_tokens: number;
  output_tokens: "NOT_MEASURED";
  cache_read_tokens: "NOT_MEASURED";
  cache_write_tokens: "NOT_MEASURED";
  cost: "NOT_MEASURED";
  latency_ms: number;
  reread_count: number;
  n: number;
  dispersion: {
    input_tokens: Dispersion;
    output_tokens: "NOT_MEASURED";
    cache_read_tokens: "NOT_MEASURED";
    cache_write_tokens: "NOT_MEASURED";
    cost: "NOT_MEASURED";
    latency_ms: Dispersion;
    reread_count: Dispersion;
  };
  model_id: "deterministic-provider";
  tree_sha: string;
  limitation: string;
  tokenizer: TokenizerLabel;
  evidence_class: "MEASURED_DETERMINISTIC_CONTEXT";
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
  compaction: "UNAVAILABLE";
  compaction_tokens: "UNAVAILABLE";
  compaction_fidelity: "UNAVAILABLE";
  generative_token_reduction: "NOT_MEASURED";
  product_percent_gate: "NOT_MEASURED";
  deterministic_context_input_delta: number;
  deterministic_context_evidence_class: "MEASURED_DETERMINISTIC_CONTEXT";
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
  model_id: "deterministic-provider";
  tokenizer: TokenizerLabel;
  tree_sha: string;
  n: number;
  limitation: string;
  tasks_sha256: string;
  norm: "docs/v22/GOALS-OFFICIAL.md";
  metrics_schema: "docs/v22/baseline/metrics.schema.json";
  tasks_file: "docs/v22/baseline/tasks.json";
  measured_at: string;
  compaction_contract: CompactionContractEvidence;
  tasks: TaskReport[];
}

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
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function asStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be a string array`);
  }
  return value as string[];
}

function asKind(value: unknown, label: string): ContextSliceKind {
  if (typeof value !== "string" || !SLICE_KINDS.has(value as ContextSliceKind)) {
    throw new Error(`${label} is not a context slice kind`);
  }
  return value as ContextSliceKind;
}

function asPositiveInt(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function parseFile(value: unknown, label: string): FrozenFile {
  const row = asRecord(value, label);
  const tier = row.tier;
  if (tier !== undefined && (typeof tier !== "string" || !TIERS.has(tier as TruthSourceTier))) {
    throw new Error(`${label}.tier is invalid`);
  }
  const ai = row.ai_status;
  if (
    ai !== undefined &&
    ai !== "atual" &&
    ai !== "obsoleto" &&
    ai !== "draft" &&
    ai !== "unknown"
  ) {
    throw new Error(`${label}.ai_status is invalid`);
  }
  return {
    path: asString(row.path, `${label}.path`),
    content: asString(row.content, `${label}.content`),
    priority: row.priority === undefined ? 10 : asPositiveInt(row.priority, `${label}.priority`),
    kind: asKind(row.kind ?? "generic", `${label}.kind`),
    tier: tier as TruthSourceTier | undefined,
    topic_key: row.topic_key === undefined ? undefined : asString(row.topic_key, `${label}.topic_key`),
    ai_status: ai,
  };
}

function expandTask(card: TaskCard): FrozenTask {
  const files = card.files.map((file) => ({ ...file }));
  if (card.noise) {
    if (!card.noise.path_template.includes("{i}") || !card.noise.content_template.includes("{i}")) {
      throw new Error(`${card.id}: noise templates must include {i}`);
    }
    for (let n = 1; n <= card.noise.count; n += 1) {
      const i = String(n).padStart(2, "0");
      files.push({
        path: card.noise.path_template.replaceAll("{i}", i),
        content: card.noise.content_template.replaceAll("{i}", i),
        priority: card.noise.priority,
        kind: card.noise.kind ?? "generic",
      });
    }
  }
  if (card.handoff) {
    files.push({
      path: card.handoff.path,
      content: card.handoff.content,
      priority: card.handoff.priority,
      kind: card.handoff.kind,
    });
  }
  const paths = new Set(files.map((file) => file.path));
  if (paths.size !== files.length) {
    throw new Error(`${card.id}: duplicate fixture path`);
  }
  if (!paths.has(card.anchor_path)) {
    throw new Error(`${card.id}: anchor_path is not in the fixture`);
  }
  return { ...card, files };
}

function parseTask(value: unknown, index: number): TaskCard {
  const row = asRecord(value, `tasks[${index}]`);
  const id = asString(row.id, `tasks[${index}].id`);
  if (!P0_TASK_IDS.includes(id as P0TaskId)) {
    throw new Error(`unknown baseline task id: ${id}`);
  }
  const budget = asRecord(row.budget, `tasks[${index}].budget`);
  const filesRaw = row.files;
  if (!Array.isArray(filesRaw) || filesRaw.length === 0) {
    throw new Error(`tasks[${index}].files must be a non-empty array`);
  }
  let noise: NoiseSpec | undefined;
  if (row.noise !== undefined) {
    const noiseRow = asRecord(row.noise, `tasks[${index}].noise`);
    noise = {
      count: asPositiveInt(noiseRow.count, `tasks[${index}].noise.count`),
      path_template: asString(noiseRow.path_template, `tasks[${index}].noise.path_template`),
      content_template: asString(noiseRow.content_template, `tasks[${index}].noise.content_template`),
      priority: noiseRow.priority === undefined ? 1 : asPositiveInt(noiseRow.priority, `tasks[${index}].noise.priority`),
      kind: noiseRow.kind === undefined ? undefined : asKind(noiseRow.kind, `tasks[${index}].noise.kind`),
    };
  }
  let handoff: HandoffSpec | undefined;
  if (row.handoff !== undefined) {
    const handoffRow = asRecord(row.handoff, `tasks[${index}].handoff`);
    handoff = {
      path: asString(handoffRow.path, `tasks[${index}].handoff.path`),
      content: asString(handoffRow.content, `tasks[${index}].handoff.content`),
      kind: asKind(handoffRow.kind, `tasks[${index}].handoff.kind`),
      priority: handoffRow.priority === undefined ? 100 : asPositiveInt(handoffRow.priority, `tasks[${index}].handoff.priority`),
    };
  }
  return {
    id: id as P0TaskId,
    brief_name: asString(row.brief_name, `tasks[${index}].brief_name`),
    query: asString(row.query, `tasks[${index}].query`),
    anchor_path: asString(row.anchor_path, `tasks[${index}].anchor_path`),
    budget: {
      max_paths: asPositiveInt(budget.max_paths, `tasks[${index}].budget.max_paths`),
      max_pages: asPositiveInt(budget.max_pages, `tasks[${index}].budget.max_pages`),
      max_tokens: asPositiveInt(budget.max_tokens, `tasks[${index}].budget.max_tokens`),
    },
    use_truth_fence: row.use_truth_fence === true,
    must_include: asStringList(row.must_include, `tasks[${index}].must_include`),
    v22_must_exclude: asStringList(row.v22_must_exclude ?? [], `tasks[${index}].v22_must_exclude`),
    b0_must_exclude: asStringList(row.b0_must_exclude ?? [], `tasks[${index}].b0_must_exclude`),
    files: filesRaw.map((file, fileIndex) => parseFile(file, `tasks[${index}].files[${fileIndex}]`)),
    noise,
    handoff,
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
  if (parsed.schema_id !== "v22-p0-baseline-tasks-1") {
    throw new Error("tasks.json schema_id mismatch");
  }
  if (parsed.task_id !== "V22-GAP-P0-1") {
    throw new Error("tasks.json task_id mismatch");
  }
  const required = asStringList(parsed.required_fields, "required_fields");
  for (const field of REQUIRED_FIELDS) {
    if (!required.includes(field)) throw new Error(`tasks.json missing required field ${field}`);
  }
  const fixed = asRecord(parsed.fixed_values, "fixed_values");
  const fixedValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(fixed)) {
    fixedValues[key] = asString(value, `fixed_values.${key}`);
  }
  for (const key of [
    "output_tokens",
    "cache_read_tokens",
    "cache_write_tokens",
    "cost",
    "model_id",
    "compaction",
    "generative_token_reduction",
    "product_percent_gate",
  ]) {
    if (!(key in fixedValues)) throw new Error(`fixed_values.${key} missing`);
  }
  if (!Array.isArray(parsed.tasks)) throw new Error("tasks must be an array");
  const cards = parsed.tasks.map((task, index) => parseTask(task, index));
  const ids = cards.map((card) => card.id);
  if (ids.length !== P0_TASK_IDS.length || P0_TASK_IDS.some((id) => !ids.includes(id))) {
    throw new Error(`tasks.json must contain exactly ${P0_TASK_IDS.join(", ")}`);
  }
  const document: TasksDocument = {
    schema_id: "v22-p0-baseline-tasks-1",
    task_id: "V22-GAP-P0-1",
    n_min: asPositiveInt(parsed.n_min, "n_min"),
    required_fields: required,
    fixed_values: fixedValues,
    limitation: asString(parsed.limitation, "limitation"),
    tasks: cards,
  };
  return {
    document,
    tasks: cards.map((card) => expandTask(card)),
    tasksPath,
    tasksSha256: createHash("sha256").update(raw, "utf8").digest("hex"),
  };
}

function readTreeSha(repoRoot: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  const sha = result.stdout?.trim() ?? "";
  if (result.status !== 0 || !/^[0-9a-f]{40}$/.test(sha)) return "NOT_MEASURED";
  return sha;
}

function readCompactionContract(): CompactionContractEvidence {
  const contract = getCompactionReinjectContract();
  if (contract.status !== "NOT_IMPLEMENTED" || contract.reinject_allowed !== false) {
    throw new Error(
      "P0 baseline refuses to invent compaction numbers, and the contract is no longer NOT_IMPLEMENTED with reinject disabled. Measure compaction in a later task.",
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

function makeRequest(capability: string, constraints: Record<string, string>, runId: string): ExecuteRequest {
  const node: GraphNode = {
    id: "p0",
    capability,
    type: "worker",
    status: "running",
    dependencies: [],
    definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
    constraints,
    metadata: {},
    retry_count: 0,
  };
  return {
    run_id: runId,
    node_id: "p0",
    capability,
    inputs: [],
    definition_of_done: node.definition_of_done,
    policy: { retries_remaining: 0 },
    memory_scope: "p0-baseline",
    knowledge_hits: [],
    briefing: "v22-gap-p0-1",
    node,
  };
}

interface ReadHit {
  path: string;
  content: string;
}

async function providerCall(
  provider: ReturnType<typeof createDeterministicProvider>,
  capability: string,
  constraints: Record<string, string>,
  runId: string,
): Promise<{ result: unknown; durationMs: number }> {
  const response: ExecuteResult = await provider.execute(makeRequest(capability, constraints, runId));
  if (!response.success) {
    throw new Error(`${capability} failed: ${response.error?.code ?? "UNKNOWN"} ${response.error?.message ?? ""}`);
  }
  const spec = response.evidence?.spec as { normalized?: unknown } | undefined;
  return { result: spec?.normalized, durationMs: response.duration_ms };
}

function markersIn(text: string, markers: string[]): string[] {
  return markers.filter((marker) => text.includes(marker));
}

function verifier(
  text: string,
  mustInclude: string[],
  mustExclude: string[],
): { pass: boolean; missing: string[]; presentForbidden: string[] } {
  const missing = mustInclude.filter((marker) => !text.includes(marker));
  const presentForbidden = mustExclude.filter((marker) => text.includes(marker));
  return { pass: missing.length === 0 && presentForbidden.length === 0, missing, presentForbidden };
}

function assemble(hits: ReadHit[]): { text: string; rereadCount: number; paths: string[] } {
  const seen = new Set<string>();
  let rereadCount = 0;
  const parts: string[] = [];
  const paths: string[] = [];
  for (const hit of hits) {
    const filePath = normPath(hit.path);
    if (seen.has(filePath)) rereadCount += 1;
    else {
      seen.add(filePath);
      paths.push(filePath);
    }
    parts.push(`--- path:${filePath} ---\n${hit.content}`);
  }
  return { text: parts.join("\n"), rereadCount, paths };
}

function fileByPath(task: FrozenTask): Map<string, FrozenFile> {
  return new Map(task.files.map((file) => [normPath(file.path), file]));
}

function fenceSlices(slices: ContextSlice[], task: FrozenTask): {
  kept: ContextSlice[];
  rejected: string[];
} {
  const meta = fileByPath(task);
  const items: TruthSourcedItem[] = [];
  const tiered = new Set<string>();
  for (const slice of slices) {
    const file = meta.get(normPath(slice.path));
    if (!file?.tier || !file.topic_key) continue;
    tiered.add(normPath(slice.path));
    items.push({
      topic_key: file.topic_key,
      tier: file.tier,
      provenance: { source_ref: normPath(slice.path) },
      excerpt: slice.content,
      ai_status: file.ai_status,
    });
  }
  const fence = applyTruthFence(items);
  const accepted = new Set(fence.accepted.map((item) => item.provenance.source_ref));
  const overridden = codeOverridesWiki(
    items.filter((item) => item.tier === "code"),
    items.filter((item) => item.tier !== "code"),
  );
  for (const item of overridden) {
    if (item.superseded && item.provenance.source_ref) accepted.delete(item.provenance.source_ref);
  }
  const rejected = [
    ...fence.rejected.map((item) => item.provenance.source_ref),
    ...overridden.filter((item) => item.superseded).map((item) => item.provenance.source_ref),
  ].filter((ref): ref is string => Boolean(ref));
  return {
    kept: slices.filter((slice) => {
      const filePath = normPath(slice.path);
      return !tiered.has(filePath) || accepted.has(filePath);
    }),
    rejected: [...new Set(rejected)],
  };
}

async function materialize(task: FrozenTask, root: string): Promise<void> {
  for (const file of task.files) {
    const abs = path.join(root, file.path);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, file.content, "utf-8");
  }
}

async function searchAndRead(
  provider: ReturnType<typeof createDeterministicProvider>,
  task: FrozenTask,
  runId: string,
): Promise<{ hits: ReadHit[]; durationMs: number }> {
  const search = await providerCall(
    provider,
    "filesystem.search",
    { pattern: task.query, path: "." },
    runId,
  );
  const matches = (search.result as { matches?: Array<{ path: string }> } | undefined)?.matches ?? [];
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    const filePath = normPath(match.path);
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    ordered.push(filePath);
  }
  if (!ordered.includes(normPath(task.anchor_path))) {
    throw new Error(`${task.id}: search did not hit anchor ${task.anchor_path}`);
  }
  const handoff = task.files.find((file) => file.kind === "acceptance_criteria");
  if (handoff && !ordered.includes(normPath(handoff.path))) ordered.push(normPath(handoff.path));

  const hits: ReadHit[] = [];
  let durationMs = search.durationMs;
  for (const filePath of ordered) {
    const read = await providerCall(provider, "filesystem.read", { path: filePath }, runId);
    durationMs += read.durationMs;
    const body = read.result as { content?: string; path?: string } | undefined;
    if (typeof body?.content !== "string") throw new Error(`${task.id}: empty read ${filePath}`);
    hits.push({ path: normPath(body.path ?? filePath), content: body.content });
  }
  return { hits, durationMs };
}

function sliceFor(hit: ReadHit, task: FrozenTask): ContextSlice {
  const meta = fileByPath(task).get(normPath(hit.path));
  return sliceFromFile(normPath(hit.path), hit.content, meta?.kind ?? "generic", meta?.priority ?? 10);
}

async function runArm(
  arm: "B0" | "V2.2",
  task: FrozenTask,
  workspace: string,
  repetition: number,
): Promise<ArmRun & { tokenizer: TokenizerLabel }> {
  const graphifyBefore = process.env.EVOLVELOOP_GRAPHIFY;
  const provider = createDeterministicProvider("filesystem", workspace);
  const runId = `p0-${task.id}-${arm}-${repetition}`;
  const { hits, durationMs } = await searchAndRead(provider, task, runId);
  let text: string;
  let rereadCount: number;
  let paths: string[];
  let rejected: string[] | undefined;
  let latencyMs = durationMs;

  if (arm === "B0") {
    const anchor = hits.find((hit) => normPath(hit.path) === normPath(task.anchor_path));
    if (!anchor) throw new Error(`${task.id}: missing anchor hit`);
    const reread = await providerCall(
      provider,
      "filesystem.read",
      { path: normPath(task.anchor_path) },
      runId,
    );
    latencyMs += reread.durationMs;
    const body = reread.result as { content?: string; path?: string };
    const assembled = assemble([
      ...hits,
      { path: normPath(body.path ?? task.anchor_path), content: body.content ?? "" },
    ]);
    text = assembled.text;
    rereadCount = assembled.rereadCount;
    paths = assembled.paths;
  } else {
    let slices = hits.map((hit) => sliceFor(hit, task));
    if (task.use_truth_fence) {
      const fenced = fenceSlices(slices, task);
      slices = fenced.kept;
      rejected = fenced.rejected;
    }
    const budget = applyContextBudget(slices, {
      ownerId: `v22-p0-${task.id}`,
      limits: task.budget,
    });
    text = budget.context_text;
    rereadCount = 0;
    paths = budget.paths_read.map(normPath);
  }

  if (process.env.EVOLVELOOP_GRAPHIFY !== graphifyBefore) {
    throw new Error("harness mutated EVOLVELOOP_GRAPHIFY");
  }

  const counted = countTokens(text);
  const observe = [...task.must_include, ...task.v22_must_exclude, ...task.b0_must_exclude];
  const excludes = arm === "B0" ? task.b0_must_exclude : task.v22_must_exclude;
  const checked = verifier(text, task.must_include, excludes);
  return {
    repetition,
    input_tokens: counted.tokens,
    latency_ms: latencyMs,
    reread_count: rereadCount,
    paths_read: paths,
    markers_present: markersIn(text, observe),
    verifier_pass: checked.pass,
    rejected_source_refs: rejected,
    tokenizer: counted.tokenizer,
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStddev(values: number[]): Dispersion {
  const center = mean(values);
  const square = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  return {
    statistic: "sample_stddev",
    value: Math.sqrt(square / (values.length - 1)),
    n: values.length,
  };
}

function armReport(
  arm: "B0" | "V2.2",
  runs: Array<ArmRun & { tokenizer: TokenizerLabel }>,
  treeSha: string,
  limitation: string,
): ArmReport {
  const input = runs.map((run) => run.input_tokens);
  const latency = runs.map((run) => run.latency_ms);
  const rereads = runs.map((run) => run.reread_count);
  const tokenizer = runs[0]?.tokenizer;
  if (!tokenizer) throw new Error("arm has no runs");
  return {
    arm,
    role: arm === "B0" ? "V2" : "V2.2",
    input_tokens: mean(input),
    output_tokens: "NOT_MEASURED",
    cache_read_tokens: "NOT_MEASURED",
    cache_write_tokens: "NOT_MEASURED",
    cost: "NOT_MEASURED",
    latency_ms: mean(latency),
    reread_count: mean(rereads),
    n: runs.length,
    dispersion: {
      input_tokens: sampleStddev(input),
      output_tokens: "NOT_MEASURED",
      cache_read_tokens: "NOT_MEASURED",
      cache_write_tokens: "NOT_MEASURED",
      cost: "NOT_MEASURED",
      latency_ms: sampleStddev(latency),
      reread_count: sampleStddev(rereads),
    },
    model_id: "deterministic-provider",
    tree_sha: treeSha,
    limitation,
    tokenizer,
    evidence_class: "MEASURED_DETERMINISTIC_CONTEXT",
    verifier_pass: runs.every((run) => run.verifier_pass),
    paths_read: runs[0]?.paths_read ?? [],
    runs: runs.map((run) => ({
      repetition: run.repetition,
      input_tokens: run.input_tokens,
      latency_ms: run.latency_ms,
      reread_count: run.reread_count,
      paths_read: run.paths_read,
      markers_present: run.markers_present,
      verifier_pass: run.verifier_pass,
      rejected_source_refs: run.rejected_source_refs,
    })),
  };
}

export async function runP0Baseline(options?: {
  n?: number;
  repoRoot?: string;
}): Promise<P0BaselineReport> {
  const repoRoot = options?.repoRoot ?? repoRootFromModule();
  const loaded = loadFrozenTasks(repoRoot);
  const n = options?.n ?? loaded.document.n_min;
  if (!Number.isInteger(n) || n < loaded.document.n_min || n < 3) {
    throw new Error(`n must be an integer >= ${Math.max(3, loaded.document.n_min)}`);
  }
  const compaction = readCompactionContract();
  const treeSha = readTreeSha(repoRoot);
  const taskReports: TaskReport[] = [];
  let tokenizer: TokenizerLabel | undefined;

  for (const task of loaded.tasks) {
    const b0Runs: Array<ArmRun & { tokenizer: TokenizerLabel }> = [];
    const v22Runs: Array<ArmRun & { tokenizer: TokenizerLabel }> = [];
    for (let repetition = 1; repetition <= n; repetition += 1) {
      const workspace = await mkdtemp(path.join(tmpdir(), "v22-p0-"));
      try {
        await materialize(task, workspace);
        b0Runs.push(await runArm("B0", task, workspace, repetition));
        v22Runs.push(await runArm("V2.2", task, workspace, repetition));
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    }
    tokenizer = v22Runs[0]?.tokenizer ?? tokenizer;
    const b0 = armReport("B0", b0Runs, treeSha, loaded.document.limitation);
    const v22 = armReport("V2.2", v22Runs, treeSha, loaded.document.limitation);
    const report: TaskReport = {
      id: task.id,
      brief_name: task.brief_name,
      compaction: "UNAVAILABLE",
      compaction_tokens: "UNAVAILABLE",
      compaction_fidelity: "UNAVAILABLE",
      generative_token_reduction: "NOT_MEASURED",
      product_percent_gate: "NOT_MEASURED",
      deterministic_context_input_delta: v22.input_tokens - b0.input_tokens,
      deterministic_context_evidence_class: "MEASURED_DETERMINISTIC_CONTEXT",
      arms: { B0: b0, "V2.2": v22 },
    };
    if (task.id === "restricoes_compactacao_handoff") report.compaction_contract = compaction;
    taskReports.push(report);
  }

  if (!tokenizer) throw new Error("tokenizer was not recorded");
  return {
    schema_id: "v22-p0-baseline-report-1",
    task_id: "V22-GAP-P0-1",
    evidence_class: "MEASURED_DETERMINISTIC_CONTEXT",
    generative_token_reduction: "NOT_MEASURED",
    product_percent_gate: "NOT_MEASURED",
    compaction: "UNAVAILABLE",
    model_id: "deterministic-provider",
    tokenizer,
    tree_sha: treeSha,
    n,
    limitation: loaded.document.limitation,
    tasks_sha256: loaded.tasksSha256,
    norm: "docs/v22/GOALS-OFFICIAL.md",
    metrics_schema: "docs/v22/baseline/metrics.schema.json",
    tasks_file: "docs/v22/baseline/tasks.json",
    measured_at: new Date().toISOString(),
    compaction_contract: compaction,
    tasks: taskReports,
  };
}
