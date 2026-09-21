/**
 * Engine checkpoint — crash-recovery persistence (GAP-B04).
 *
 * Delivery semantics for in-flight nodes after crash: **AT_LEAST_ONCE**
 * (running → pending on reconcile; providers may re-execute).
 *
 * Atomicity: write temp + rename. Corrupt/partial files never replace the prior valid checkpoint.
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  renameSync,
  readdirSync,
  openSync,
  closeSync,
  fsyncSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  CapabilityIR,
  ExecutionPolicy,
  GraphSnapshot,
} from "../types/index.js";

export const CHECKPOINT_SCHEMA_VERSION = 2 as const;

export type DeliverySemantics = "AT_LEAST_ONCE" | "AT_MOST_ONCE" | "EXACTLY_ONCE" | "UNKNOWN";

export interface SerializedAccounting {
  iterations: number;
  replans: number;
  total_retries: number;
  provider_attempts: number;
  fallback_switches: number;
  nodes_completed: number;
  tokens_used: number;
  tokens_unknown_events: number;
  /** Absolute wall-clock ms when feature started (cross-process). */
  started_at_ms: number;
  providers_tried: Record<string, string[]>;
  fallback_count: Record<string, number>;
}

export interface EngineCheckpoint {
  apiVersion: "capability-orchestrator.io/v2";
  kind: "EngineCheckpoint";
  checkpoint_schema_version: typeof CHECKPOINT_SCHEMA_VERSION;
  checkpoint_id: string;
  /** Monotonic per feature_id — recovery always prefers highest. */
  revision: number;
  feature_id: string;
  execution_id: string;
  policy_id: string;
  ir_id: string;
  plan_version: number;
  plan_hash: string;
  parent_plan_id?: string;
  /** Full IR of the active plan (survives replan across crash). */
  current_ir: CapabilityIR;
  /** Immutable policy for this execution (B01 snapshot). */
  policy_snapshot: ExecutionPolicy;
  graph: GraphSnapshot;
  accounting: SerializedAccounting;
  replan_count: number;
  recent_plan_hashes: string[];
  last_error_code?: string;
  last_failed_node_id?: string;
  last_failed_provider_id?: string;
  blocked_reason?: string | null;
  feature_started_at: string;
  delivery_semantics: DeliverySemantics;
  recovery?: {
    worker_id?: string;
    lease_until?: string;
    claimed_at?: string;
  };
  terminal?: boolean;
  saved_at: string;
}

/** Legacy v1 shape (graph-only) — rejected by validate unless migrated. */
export interface EngineCheckpointV1Legacy {
  apiVersion: string;
  kind: "EngineCheckpoint";
  feature_id: string;
  policy_id: string;
  ir_id: string;
  graph: GraphSnapshot;
  saved_at: string;
  checkpoint_schema_version?: undefined;
}

export type CheckpointValidation =
  | { ok: true; checkpoint: EngineCheckpoint }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "CORRUPT"
        | "UNSUPPORTED_SCHEMA"
        | "PARTIAL"
        | "INVALID_KIND"
        | "RECOVERY_UNAVAILABLE";
      reason: string;
    };

export type NodeRecoveryClass =
  | "SAFE_TO_RESUME"
  | "RETRYABLE"
  | "REQUIRES_RECONCILIATION"
  | "TERMINAL"
  | "UNKNOWN";

export function checkpointDir(jobsDir: string): string {
  return join(jobsDir, "checkpoints");
}

export function checkpointPath(jobsDir: string, featureId: string): string {
  return join(checkpointDir(jobsDir), `${featureId}.json`);
}

export function recoveryLockPath(jobsDir: string, featureId: string): string {
  return join(checkpointDir(jobsDir), `${featureId}.recovery.lock`);
}

function atomicWriteJson(path: string, doc: unknown): void {
  const dir = join(path, "..");
  mkdirSync(dir, { recursive: true });
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const fd = openSync(tmp, "w");
  try {
    writeFileSync(fd, JSON.stringify(doc, null, 2), "utf-8");
    try {
      fsyncSync(fd);
    } catch {
      /* fsync optional on some FS */
    }
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, path);
}

export function serializeAccounting(a: {
  iterations: number;
  replans: number;
  total_retries: number;
  provider_attempts: number;
  fallback_switches: number;
  nodes_completed: number;
  tokens_used: number;
  tokens_unknown_events: number;
  started_at_ms: number;
  providers_tried: Map<string, string[]>;
  fallback_count: Map<string, number>;
}): SerializedAccounting {
  return {
    iterations: a.iterations,
    replans: a.replans,
    total_retries: a.total_retries,
    provider_attempts: a.provider_attempts,
    fallback_switches: a.fallback_switches,
    nodes_completed: a.nodes_completed,
    tokens_used: a.tokens_used,
    tokens_unknown_events: a.tokens_unknown_events,
    started_at_ms: a.started_at_ms,
    providers_tried: Object.fromEntries(a.providers_tried),
    fallback_count: Object.fromEntries(a.fallback_count),
  };
}

export function deserializeAccounting(s: SerializedAccounting): {
  iterations: number;
  replans: number;
  total_retries: number;
  provider_attempts: number;
  fallback_switches: number;
  nodes_completed: number;
  tokens_used: number;
  tokens_unknown_events: number;
  started_at_ms: number;
  providers_tried: Map<string, string[]>;
  fallback_count: Map<string, number>;
} {
  return {
    iterations: s.iterations,
    replans: s.replans,
    total_retries: s.total_retries,
    provider_attempts: s.provider_attempts,
    fallback_switches: s.fallback_switches,
    nodes_completed: s.nodes_completed,
    tokens_used: s.tokens_used,
    tokens_unknown_events: s.tokens_unknown_events,
    started_at_ms: s.started_at_ms,
    providers_tried: new Map(Object.entries(s.providers_tried ?? {})),
    fallback_count: new Map(
      Object.entries(s.fallback_count ?? {}).map(([k, v]) => [k, Number(v)]),
    ),
  };
}

function nonNegInt(n: unknown, field: string): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return `invalid_accounting:${field}`;
  }
  return null;
}

/**
 * Semantic checkpoint validation — schema-valid is not enough.
 * Rejects impossible counters, inflated completion, policy-exceeding replans/retries.
 * Residual: without HMAC secret, a sophisticated FS attacker can rewrite a
 * semantically-consistent forged checkpoint (LIMITED — documented).
 */
export function validateCheckpointSemantics(cp: EngineCheckpoint): CheckpointValidation {
  const a = cp.accounting;
  for (const [field, val] of [
    ["iterations", a.iterations],
    ["replans", a.replans],
    ["total_retries", a.total_retries],
    ["provider_attempts", a.provider_attempts],
    ["fallback_switches", a.fallback_switches],
    ["nodes_completed", a.nodes_completed],
    ["tokens_used", a.tokens_used],
    ["tokens_unknown_events", a.tokens_unknown_events],
  ] as const) {
    const err = nonNegInt(val, field);
    if (err) return { ok: false, code: "CORRUPT", reason: err };
  }
  if (typeof a.started_at_ms !== "number" || !Number.isFinite(a.started_at_ms) || a.started_at_ms < 0) {
    return { ok: false, code: "CORRUPT", reason: "invalid_accounting:started_at_ms" };
  }
  if (typeof cp.replan_count !== "number" || cp.replan_count < 0) {
    return { ok: false, code: "CORRUPT", reason: "invalid_replan_count" };
  }

  const graphNodes = Array.isArray(cp.graph?.nodes) ? cp.graph.nodes : null;
  if (!graphNodes) {
    return { ok: false, code: "CORRUPT", reason: "invalid_graph_nodes" };
  }
  if (a.nodes_completed > graphNodes.length) {
    return {
      ok: false,
      code: "CORRUPT",
      reason: `nodes_completed_exceeds_graph:${a.nodes_completed}>${graphNodes.length}`,
    };
  }

  const irNodes = cp.current_ir?.spec?.nodes;
  if (Array.isArray(irNodes) && graphNodes.length > irNodes.length) {
    return {
      ok: false,
      code: "CORRUPT",
      reason: "graph_nodes_exceed_ir_nodes",
    };
  }

  const policy = cp.policy_snapshot;
  const spec = policy?.spec;
  if (spec) {
    const maxReplans =
      typeof (spec as { max_replans?: number }).max_replans === "number"
        ? (spec as { max_replans: number }).max_replans
        : undefined;
    // ExecutionPolicySpec uses retries.default; some snapshots may carry max_replans in extensions
    const retryDefault = spec.retries?.default;
    if (typeof retryDefault === "number" && a.total_retries > retryDefault * Math.max(graphNodes.length, 1) + 100) {
      // soft upper bound: absurd inflation
      return { ok: false, code: "CORRUPT", reason: "total_retries_absurd" };
    }
    if (typeof maxReplans === "number" && cp.replan_count > maxReplans) {
      return { ok: false, code: "CORRUPT", reason: "replan_count_exceeds_policy" };
    }
    if (typeof maxReplans === "number" && a.replans > maxReplans) {
      return { ok: false, code: "CORRUPT", reason: "accounting_replans_exceed_policy" };
    }
  }

  if (cp.plan_version < 1 || !Number.isInteger(cp.plan_version)) {
    return { ok: false, code: "CORRUPT", reason: "invalid_plan_version" };
  }
  if (cp.ir_id && cp.current_ir?.metadata?.id && cp.ir_id !== cp.current_ir.metadata.id) {
    return { ok: false, code: "CORRUPT", reason: "ir_id_lineage_mismatch" };
  }
  if (cp.policy_id && policy?.metadata?.id && cp.policy_id !== policy.metadata.id) {
    return { ok: false, code: "CORRUPT", reason: "policy_id_lineage_mismatch" };
  }

  return { ok: true, checkpoint: cp };
}

export function validateCheckpoint(raw: unknown): CheckpointValidation {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, code: "CORRUPT", reason: "checkpoint is not an object" };
  }
  const doc = raw as Record<string, unknown>;
  if (doc.kind !== "EngineCheckpoint") {
    return { ok: false, code: "INVALID_KIND", reason: `kind=${String(doc.kind)}` };
  }
  if (doc.checkpoint_schema_version !== CHECKPOINT_SCHEMA_VERSION) {
    if (doc.checkpoint_schema_version == null) {
      return {
        ok: false,
        code: "UNSUPPORTED_SCHEMA",
        reason: "legacy v1 checkpoint without schema version — recovery requires v2",
      };
    }
    return {
      ok: false,
      code: "UNSUPPORTED_SCHEMA",
      reason: `unsupported checkpoint_schema_version=${String(doc.checkpoint_schema_version)}`,
    };
  }
  if (!doc.feature_id || !doc.execution_id || !doc.graph || !doc.current_ir || !doc.policy_snapshot) {
    return {
      ok: false,
      code: "PARTIAL",
      reason: "missing required fields (feature_id|execution_id|graph|current_ir|policy_snapshot)",
    };
  }
  if (typeof doc.revision !== "number" || doc.revision < 1) {
    return { ok: false, code: "PARTIAL", reason: "invalid revision" };
  }
  if (!doc.accounting || typeof doc.accounting !== "object") {
    return { ok: false, code: "PARTIAL", reason: "missing accounting" };
  }
  return validateCheckpointSemantics(doc as unknown as EngineCheckpoint);
}

export function loadCheckpointRaw(jobsDir: string, featureId: string): unknown | null {
  const path = checkpointPath(jobsDir, featureId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { __corrupt: true };
  }
}

export function loadCheckpoint(jobsDir: string, featureId: string): EngineCheckpoint | null {
  const raw = loadCheckpointRaw(jobsDir, featureId);
  if (raw == null) return null;
  if (typeof raw === "object" && raw && "__corrupt" in (raw as object)) return null;
  const v = validateCheckpoint(raw);
  return v.ok ? v.checkpoint : null;
}

export function loadAndValidateCheckpoint(
  jobsDir: string,
  featureId: string,
): CheckpointValidation {
  const path = checkpointPath(jobsDir, featureId);
  if (!existsSync(path)) {
    return { ok: false, code: "NOT_FOUND", reason: "checkpoint file missing" };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    return {
      ok: false,
      code: "CORRUPT",
      reason: e instanceof Error ? e.message : "JSON parse failed",
    };
  }
  return validateCheckpoint(raw);
}

export function saveCheckpoint(
  jobsDir: string,
  data: Omit<
    EngineCheckpoint,
    "apiVersion" | "kind" | "checkpoint_schema_version" | "saved_at" | "checkpoint_id"
  > & { checkpoint_id?: string },
): string {
  const path = checkpointPath(jobsDir, data.feature_id);
  mkdirSync(checkpointDir(jobsDir), { recursive: true });
  const doc: EngineCheckpoint = {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "EngineCheckpoint",
    checkpoint_schema_version: CHECKPOINT_SCHEMA_VERSION,
    checkpoint_id: data.checkpoint_id ?? randomUUID(),
    saved_at: new Date().toISOString(),
    delivery_semantics: data.delivery_semantics ?? "AT_LEAST_ONCE",
    ...data,
  };
  atomicWriteJson(path, doc);
  return path;
}

export function clearCheckpoint(jobsDir: string, featureId: string): void {
  const path = checkpointPath(jobsDir, featureId);
  if (existsSync(path)) unlinkSync(path);
  const lock = recoveryLockPath(jobsDir, featureId);
  if (existsSync(lock)) {
    try {
      unlinkSync(lock);
    } catch {
      /* ignore */
    }
  }
}

export function listCheckpointFeatureIds(jobsDir: string): string[] {
  const dir = checkpointDir(jobsDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.includes(".tmp"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function listRecoverableExecutions(jobsDir: string): EngineCheckpoint[] {
  const out: EngineCheckpoint[] = [];
  for (const id of listCheckpointFeatureIds(jobsDir)) {
    const v = loadAndValidateCheckpoint(jobsDir, id);
    if (!v.ok) continue;
    if (v.checkpoint.terminal) continue;
    out.push(v.checkpoint);
  }
  return out.sort((a, b) => b.revision - a.revision);
}

/**
 * Claim exclusive recovery ownership (local FS lock, lease-based).
 * Two workers cannot both own the same feature recovery.
 */
export function claimExecutionRecovery(
  jobsDir: string,
  featureId: string,
  opts: { workerId: string; leaseMs?: number; now?: () => number },
): { ok: true; lease_until: string } | { ok: false; reason: "active_lease" | "not_found" } {
  const nowMs = opts.now?.() ?? Date.now();
  const leaseMs = opts.leaseMs ?? 60_000;
  const v = loadAndValidateCheckpoint(jobsDir, featureId);
  if (!v.ok) return { ok: false, reason: "not_found" };

  mkdirSync(checkpointDir(jobsDir), { recursive: true });
  const lock = recoveryLockPath(jobsDir, featureId);
  if (existsSync(lock)) {
    try {
      const prev = JSON.parse(readFileSync(lock, "utf-8")) as {
        worker_id: string;
        lease_until: string;
      };
      if (Date.parse(prev.lease_until) > nowMs && prev.worker_id !== opts.workerId) {
        return { ok: false, reason: "active_lease" };
      }
      unlinkSync(lock);
    } catch {
      try {
        unlinkSync(lock);
      } catch {
        /* ignore */
      }
    }
  }

  const leaseUntil = new Date(nowMs + leaseMs).toISOString();
  try {
    const fd = openSync(lock, "wx");
    writeFileSync(
      fd,
      JSON.stringify({ worker_id: opts.workerId, lease_until: leaseUntil, claimed_at: new Date(nowMs).toISOString() }),
    );
    closeSync(fd);
  } catch {
    return { ok: false, reason: "active_lease" };
  }

  // Stamp checkpoint recovery metadata
  const cp = v.checkpoint;
  saveCheckpoint(jobsDir, {
    ...cp,
    revision: cp.revision + 1,
    recovery: {
      worker_id: opts.workerId,
      lease_until: leaseUntil,
      claimed_at: new Date(nowMs).toISOString(),
    },
  });
  return { ok: true, lease_until: leaseUntil };
}

export function releaseExecutionRecovery(jobsDir: string, featureId: string): void {
  const lock = recoveryLockPath(jobsDir, featureId);
  if (existsSync(lock)) {
    try {
      unlinkSync(lock);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Classify + mutate graph for post-crash resume.
 * running/waiting without completed job → RETRYABLE (pending).
 * satisfied/skipped/failed/cancelled → SAFE / TERMINAL.
 */
export function reconcileInFlightGraph(graph: GraphSnapshot): {
  graph: GraphSnapshot;
  classifications: Array<{ node_id: string; from: string; class: NodeRecoveryClass }>;
} {
  const classifications: Array<{ node_id: string; from: string; class: NodeRecoveryClass }> = [];
  const nodes = graph.nodes.map((n) => {
    if (n.status === "satisfied" || n.status === "skipped") {
      classifications.push({ node_id: n.id, from: n.status, class: "SAFE_TO_RESUME" });
      return n;
    }
    if (n.status === "failed" || n.status === "cancelled" || n.status === "blocked") {
      classifications.push({
        node_id: n.id,
        from: n.status,
        class: n.status === "failed" ? "TERMINAL" : "REQUIRES_RECONCILIATION",
      });
      return n;
    }
    if (n.status === "running") {
      classifications.push({
        node_id: n.id,
        from: n.status,
        class: "RETRYABLE",
      });
      return {
        ...n,
        status: "pending" as const,
        run_id: undefined,
        provider_id: undefined,
        // keep retry_count — do not reset budgets
      };
    }
    if (n.status === "waiting") {
      // External job may still complete — keep waiting for poll/resume path
      classifications.push({
        node_id: n.id,
        from: n.status,
        class: "REQUIRES_RECONCILIATION",
      });
      return n;
    }
    classifications.push({ node_id: n.id, from: n.status, class: "SAFE_TO_RESUME" });
    return n;
  });
  return { graph: { ...graph, nodes }, classifications };
}
