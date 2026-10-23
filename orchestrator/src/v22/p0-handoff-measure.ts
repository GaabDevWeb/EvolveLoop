/**
 * V22-GAP-P0-5 handoff measurement, reference redefined in V22-GAP-P0-6.
 *
 * The reference method is transferring the sending agent's complete context:
 * briefing, definition of done, restrictions, decisions, next action, graph,
 * retrieved knowledge, and evidence. saved_at is excluded (wall clock).
 * The 81-token checklist is only the survival probe (fidelity_checklist_tokens).
 * Transferred volume is the normalized pickup. The receiver reloads session
 * continuity. N>=3. Output, cache, cost, and model latency stay NOT_MEASURED.
 * This run keeps EVOLVELOOP_COMPACTION off. Compaction numbers live in the
 * P0-6 report. Dispersion 0 of transferred tokens is expected.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { resolveOrchestratorRoot } from "../cli/run-engine-env.js";
import { assertReinjectAllowed, getCompactionReinjectContract } from "../context/compaction-contract.js";
import { requireTiktokenCounts } from "../context/tokenizer.js";
import { buildPickupPrompt } from "../jobs/job-pickup.js";
import type { SkillJob } from "../jobs/job-store.js";
import { preparePickupSpawnContext } from "../jobs/spawn-pickup-context.js";
import { MemoryStore } from "../memory/memory-store.js";
import {
  applySessionContinuityToMemory,
  buildSessionContinuitySnapshot,
  loadSessionContinuity,
  persistSessionContinuity,
} from "../session/session-continuity.js";
import type { GraphSnapshot } from "../types/index.js";
import { buildBenchSkillJob } from "./bench-pickup-fixture.js";
import { normalizeMeasurementPaths, stableJobsLabel } from "./measurement-paths.js";

export const HANDOFF_FEATURE_ID = "p0-handoff";
export const HANDOFF_RUN_ID = "p0-handoff-receiver";
export const HANDOFF_NODE_ID = "p0-handoff-wait";
export const HANDOFF_DECISION = "P0_HANDOFF_RECEIVER_DECISION";
export const HANDOFF_RESUME_MARKER = "O que sobrevive para resume?";

const RESTRICTIONS = [
  "Answer cites anchored file:line from repository",
  "No secret leakage in evidence payload",
  "reinject_allowed: false",
] as const;

export interface HandoffRun {
  repetition: number;
  reference_tokens: number;
  fidelity_checklist_tokens: number;
  transferred_tokens: number;
  volume_ratio: number;
  latency_ms: number;
  receiver_resume_ok: boolean;
  payload_present: boolean;
  missing: string[];
}

export interface HandoffReport {
  schema_id: "v22-p0-handoff-report-2";
  task_id: "V22-GAP-P0-5";
  evidence_class: "MEASURED_DETERMINISTIC_HANDOFF";
  reference_kind: "sender_complete_context";
  fidelity_checklist_kind: "required_resume_payload";
  tokenizer: "tiktoken:cl100k_base";
  path_normalization: "stable_relative";
  model_id: "deterministic-provider";
  tree_sha: string;
  n: number;
  n_status: "PASS";
  reference_tokens: number;
  reference_tokens_status: "PASS";
  fidelity_checklist_tokens: number;
  transferred_tokens: number;
  transferred_tokens_status: "PASS";
  volume_ratio: number;
  volume_ratio_status: "LIMITED";
  receiver_resume_ok: boolean;
  receiver_resume_status: "PASS" | "LIMITED";
  output_tokens: "NOT_MEASURED";
  output_tokens_status: "NOT_MEASURED";
  cache_read_tokens: "NOT_MEASURED";
  cache_write_tokens: "NOT_MEASURED";
  cost: "NOT_MEASURED";
  model_latency_ms: "NOT_MEASURED";
  latency_ms: number;
  latency_ms_status: "LIMITED";
  latency_kind: "handoff_assembly";
  dispersion: {
    transferred_tokens: {
      statistic: "sample_stddev";
      value: number;
      n: number;
      expectation: "zero_expected_deterministic";
      status: "PASS";
    };
    model: "NOT_MEASURED";
  };
  compaction: "UNAVAILABLE";
  compaction_tokens: "UNAVAILABLE";
  compaction_fidelity: "UNAVAILABLE";
  product_percent_gate: "NOT_MEASURED";
  limitation: string;
  measured_at: string;
  runs: HandoffRun[];
}

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

function treeSha(root: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" });
  const sha = result.stdout?.trim() ?? "";
  if (result.status !== 0 || !/^[0-9a-f]{40}$/.test(sha)) return "NOT_MEASURED";
  return sha;
}

function fidelityChecklist(): string {
  return [
    `resume: ${HANDOFF_RESUME_MARKER}`,
    `run_id: ${HANDOFF_RUN_ID}`,
    `node_id: ${HANDOFF_NODE_ID}`,
    "capability: knowledge-retrieval",
    "reason: awaiting_external_job",
    `decision: ${HANDOFF_DECISION}`,
    ...RESTRICTIONS.map((line) => `restriction: ${line}`),
  ].join("\n");
}

function senderCompleteContext(input: {
  briefing: string;
  definitionOfDone: unknown[];
  decisions: Array<{ timestamp: string; source: string; type: string; content: string }>;
  nextAction: { node_id: string; capability: string; run_id?: string; reason: string };
  satisfiedJobRunIds: string[];
  graphNodes: Array<{ id: string; capability: string; type: string; status: string; run_id?: string }>;
  knowledge: Array<{ path: string; content: string }>;
  evidence: string;
}): string {
  const lines = ["# sender_complete_context", "## briefing", input.briefing.trimEnd(), "## definition_of_done"];
  for (const item of input.definitionOfDone) lines.push(JSON.stringify(item));
  lines.push("## restrictions");
  for (const restriction of RESTRICTIONS) lines.push(`restriction: ${restriction}`);
  lines.push("## decisions");
  for (const decision of input.decisions) {
    lines.push(`decision: ${decision.timestamp} ${decision.source} ${decision.type} ${decision.content}`);
  }
  lines.push("## next_action");
  lines.push(
    `next_action: ${input.nextAction.node_id} ${input.nextAction.capability} ${input.nextAction.run_id ?? ""} ${input.nextAction.reason}`,
  );
  lines.push("## satisfied_job_run_ids");
  for (const id of input.satisfiedJobRunIds) lines.push(`satisfied_job_run_id: ${id}`);
  lines.push("## graph");
  for (const node of input.graphNodes) {
    lines.push(`graph_node: ${node.id} ${node.capability} ${node.type} ${node.status} ${node.run_id ?? ""}`);
  }
  lines.push("## knowledge");
  for (const item of input.knowledge) {
    lines.push(`--- path:${item.path} ---`);
    lines.push(item.content.trimEnd());
  }
  lines.push("## evidence");
  lines.push(input.evidence.trimEnd());
  return lines.join("\n");
}

function graph(): GraphSnapshot {
  return {
    feature_id: HANDOFF_FEATURE_ID,
    nodes: [
      {
        id: "p0-handoff-done",
        capability: "knowledge-retrieval",
        type: "gate",
        dependencies: [],
        definition_of_done: [],
        status: "satisfied",
        retry_count: 0,
        run_id: "p0-handoff-done",
      },
      {
        id: HANDOFF_NODE_ID,
        capability: "knowledge-retrieval",
        type: "gate",
        dependencies: ["p0-handoff-done"],
        definition_of_done: [],
        status: "waiting",
        retry_count: 0,
        run_id: HANDOFF_RUN_ID,
      },
    ],
  };
}

function senderMemory(): MemoryStore {
  const memory = new MemoryStore();
  memory.initFeature(HANDOFF_FEATURE_ID, { ir_id: "p0-handoff-ir", policy: "rapid-prototype" });
  memory.append(HANDOFF_FEATURE_ID, {
    timestamp: "2026-10-23T00:00:00.000Z",
    source: "p0-handoff",
    type: "decision",
    content: HANDOFF_DECISION,
  });
  return memory;
}

function receiverResumed(memoryRoot: string): boolean {
  const loaded = loadSessionContinuity(memoryRoot, HANDOFF_FEATURE_ID);
  if (!loaded?.next_action) return false;
  if (loaded.next_action.run_id !== HANDOFF_RUN_ID) return false;
  if (loaded.next_action.node_id !== HANDOFF_NODE_ID) return false;
  if (loaded.next_action.reason !== "awaiting_external_job") return false;
  const receiver = new MemoryStore();
  applySessionContinuityToMemory(receiver, HANDOFF_FEATURE_ID, loaded);
  return receiver.getDecisions(HANDOFF_FEATURE_ID).some((entry) => entry.content === HANDOFF_DECISION);
}

function missingLines(prompt: string, payload: string): string[] {
  return payload.split("\n").filter((line) => line.length > 0 && !prompt.includes(line));
}

async function oneRun(root: string, checklist: string, repetition: number): Promise<HandoffRun> {
  const started = performance.now();
  const memoryRoot = await mkdtemp(path.join(tmpdir(), "v22-p0-handoff-mem-"));
  const jobsDir = await mkdtemp(path.join(tmpdir(), "v22-p0-handoff-jobs-"));
  try {
    const snapshot = buildSessionContinuitySnapshot({
      featureId: HANDOFF_FEATURE_ID,
      irId: "p0-handoff-ir",
      policyId: "rapid-prototype",
      graph: graph(),
      memory: senderMemory(),
      waitingNode: {
        id: HANDOFF_NODE_ID,
        capability: "knowledge-retrieval",
        run_id: HANDOFF_RUN_ID,
      },
    });
    persistSessionContinuity(memoryRoot, snapshot);
    const receiverOk = receiverResumed(memoryRoot);
    const adr = readFileSync(path.join(root, "docs/adr/0013-context-ownership-working-context.md"), "utf-8");
    if (!adr.includes(HANDOFF_RESUME_MARKER)) {
      throw new Error("ADR-0013 does not contain the resume marker this handoff measures");
    }
    const job: SkillJob = {
      ...buildBenchSkillJob({
        task: { id: "handoff", query: HANDOFF_RESUME_MARKER },
        featureId: HANDOFF_FEATURE_ID,
        runId: HANDOFF_RUN_ID,
        nodeId: HANDOFF_NODE_ID,
      }),
      feature_id: HANDOFF_FEATURE_ID,
      gate_bundle: {
        parent_cycle_id: HANDOFF_FEATURE_ID,
        spawn_depth: 1,
        max_spawn_depth: 3,
        role: "exec",
        context_budget: { max_paths: 45, max_pages: 8, max_tokens: 22000 },
      },
      context_retrieval: [
        {
          path: "docs/adr/0013-context-ownership-working-context.md",
          content: adr,
          kind: "knowledge",
          priority: 10,
        },
      ],
      spawn_metadata: {
        evidence_verbatim: checklist,
        security_restrictions: "Nunca apagar paths, negações, comandos, DoD ou evidência. reinject_allowed: false.",
      },
    };
    const referenceRaw = senderCompleteContext({
      briefing: job.briefing,
      definitionOfDone: job.definition_of_done,
      decisions: snapshot.decisions,
      nextAction: snapshot.next_action ?? {
        node_id: HANDOFF_NODE_ID,
        capability: "knowledge-retrieval",
        run_id: HANDOFF_RUN_ID,
        reason: "awaiting_external_job",
      },
      satisfiedJobRunIds: snapshot.satisfied_job_run_ids,
      graphNodes: graph().nodes.map((node) => ({
        id: node.id,
        capability: node.capability,
        type: node.type,
        status: node.status,
        run_id: node.run_id,
      })),
      knowledge: [
        {
          path: "docs/adr/0013-context-ownership-working-context.md",
          content: adr,
        },
      ],
      evidence: checklist,
    });
    const spawn = preparePickupSpawnContext(job, jobsDir, { featureId: HANDOFF_FEATURE_ID });
    if (!spawn.validation_ok) {
      throw new Error(`handoff pickup was not assembled (${spawn.validation_reason ?? "invalid"})`);
    }
    const raw = buildPickupPrompt(job, jobsDir, undefined, { caveman: false, spawnContext: spawn });
    const pathSpec = {
      jobsDir,
      jobsLabel: stableJobsLabel("handoff", "receiver"),
      orchestratorRoot: resolveOrchestratorRoot(),
    };
    const prompt = normalizeMeasurementPaths(raw, pathSpec);
    const reference = normalizeMeasurementPaths(referenceRaw, pathSpec);
    const [checklistTokens, referenceTokens, transferredTokens] = requireTiktokenCounts([checklist, reference, prompt]);
    const missing = missingLines(prompt, checklist);
    const latencyMs = performance.now() - started;
    return {
      repetition,
      reference_tokens: referenceTokens ?? 0,
      fidelity_checklist_tokens: checklistTokens ?? 0,
      transferred_tokens: transferredTokens ?? 0,
      volume_ratio: referenceTokens ? (transferredTokens ?? 0) / referenceTokens : 0,
      latency_ms: latencyMs,
      receiver_resume_ok: receiverOk,
      payload_present: missing.length === 0,
      missing,
    };
  } finally {
    await rm(memoryRoot, { recursive: true, force: true });
    await rm(jobsDir, { recursive: true, force: true });
  }
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStddev(values: number[]): number {
  const center = mean(values);
  const square = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  return Math.sqrt(square / (values.length - 1));
}

export async function runP0Handoff(options?: { n?: number; repoRoot?: string }): Promise<HandoffReport> {
  const root = options?.repoRoot ?? repoRoot();
  const n = options?.n ?? 3;
  if (!Number.isInteger(n) || n < 3) throw new Error("handoff n must be an integer >= 3");
  const contract = getCompactionReinjectContract();
  if (contract.status !== "NOT_IMPLEMENTED" || contract.reinject_allowed !== false) {
    throw new Error("handoff measurement refuses to invent compaction numbers");
  }
  const reinject = assertReinjectAllowed(true);
  if (reinject.allowed) throw new Error("compaction reinject probe returned allowed");
  requireTiktokenCounts(["p0-handoff-tiktoken-probe"]);
  const previousFlag = process.env.EVOLVELOOP_COMPACTION;
  delete process.env.EVOLVELOOP_COMPACTION;
  const checklist = fidelityChecklist();
  const runs: HandoffRun[] = [];
  try {
    for (let repetition = 1; repetition <= n; repetition += 1) {
      runs.push(await oneRun(root, checklist, repetition));
    }
  } finally {
    if (previousFlag === undefined) delete process.env.EVOLVELOOP_COMPACTION;
    else process.env.EVOLVELOOP_COMPACTION = previousFlag;
  }
  const transferred = runs.map((run) => run.transferred_tokens);
  const dispersion = sampleStddev(transferred);
  if (dispersion !== 0 || sampleStddev(runs.map((run) => run.reference_tokens)) !== 0) {
    throw new Error("handoff token dispersion was not 0 on a deterministic payload");
  }
  if (runs.some((run) => !run.receiver_resume_ok || !run.payload_present)) {
    const missing = runs.flatMap((run) => run.missing);
    throw new Error(`handoff receiver did not resume the reference payload: ${missing.join(" | ")}`);
  }
  const reference = mean(runs.map((run) => run.reference_tokens));
  const transferredMean = mean(transferred);
  return {
    schema_id: "v22-p0-handoff-report-2",
    task_id: "V22-GAP-P0-5",
    evidence_class: "MEASURED_DETERMINISTIC_HANDOFF",
    reference_kind: "sender_complete_context",
    fidelity_checklist_kind: "required_resume_payload",
    tokenizer: "tiktoken:cl100k_base",
    path_normalization: "stable_relative",
    model_id: "deterministic-provider",
    tree_sha: treeSha(root),
    n,
    n_status: "PASS",
    reference_tokens: reference,
    reference_tokens_status: "PASS",
    fidelity_checklist_tokens: mean(runs.map((run) => run.fidelity_checklist_tokens)),
    transferred_tokens: transferredMean,
    transferred_tokens_status: "PASS",
    volume_ratio: reference === 0 ? 0 : transferredMean / reference,
    volume_ratio_status: "LIMITED",
    receiver_resume_ok: true,
    receiver_resume_status: "PASS",
    output_tokens: "NOT_MEASURED",
    output_tokens_status: "NOT_MEASURED",
    cache_read_tokens: "NOT_MEASURED",
    cache_write_tokens: "NOT_MEASURED",
    cost: "NOT_MEASURED",
    model_latency_ms: "NOT_MEASURED",
    latency_ms: mean(runs.map((run) => run.latency_ms)),
    latency_ms_status: "LIMITED",
    latency_kind: "handoff_assembly",
    dispersion: {
      transferred_tokens: {
        statistic: "sample_stddev",
        value: 0,
        n,
        expectation: "zero_expected_deterministic",
        status: "PASS",
      },
      model: "NOT_MEASURED",
    },
    compaction: "UNAVAILABLE",
    compaction_tokens: "UNAVAILABLE",
    compaction_fidelity: "UNAVAILABLE",
    product_percent_gate: "NOT_MEASURED",
    limitation:
      "Uma corrida de handoff com a flag EVOLVELOOP_COMPACTION ausente. reference_tokens é o contexto completo do agente emissor (briefing, DoD, restrições, decisões, próximo passo, grafo, conhecimento recuperado e evidência), sem saved_at. O checklist required_resume_payload fica em fidelity_checklist_tokens e não é o denominador: no P0-5 esse checklist (81 tokens) produziu o rácio 26,91 contra o pickup. transferred_tokens é o pickup normalizado. O rácio é observação, não gate de produto. Saída, cache, custo e latência de modelo são NOT_MEASURED. Dispersão 0 de transferred_tokens é a esperada no determinístico. Compactação desta corrida é UNAVAILABLE; a medição com a flag ligada está no relatório P0-6. tree_sha é o HEAD no momento da corrida.",
    measured_at: new Date().toISOString(),
    runs,
  };
}
