/**
 * Partial gate-result adapter — reads handoff `{id}.gate.json`.
 * Does NOT reimplement Prototype Gate runner.
 *
 * Boundary:
 * - `controlled_fixture` / ControlledGateFixture — harness only
 * - `external_adapter` — external gate wrote the artifact
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LiveAnalysisCoordinator } from "../live/live-coordinator.js";
import type { ObservationWindowManager } from "../live/observation-window.js";
import type { AnalysisScope, LongitudinalNeed } from "../longitudinal-types.js";
import type { NeedSignal } from "../types.js";

/** Decisions accepted from gate artifacts (fixture or external). */
export type GateDecision =
  | "APPROVED"
  | "APPROVED_WITH_CONSTRAINTS"
  | "NEEDS_MORE_EVIDENCE"
  | "BLOCKED"
  | "REJECTED"
  | "HOLD";

/** Provenance class for gate artifacts. */
export type GateSourceKind = "controlled_fixture" | "external_adapter" | "untrusted";

export interface GateResult {
  decision: GateDecision;
  request_id: string;
  /** ISO timestamp when the gate decision was recorded. */
  timestamp: string;
  /**
   * Provenance: ControlledGateFixture (harness) vs external_adapter vs untrusted.
   * Prefer gate_source_kind for machine classification.
   */
  gate_source: string;
  gate_source_kind: GateSourceKind;
  /** True when provenance is insufficient for production trust. */
  trust: "trusted_fixture" | "external" | "untrusted";
  gate_run_id?: string;
  implementation_id?: string;
  evidence?: unknown;
  constraints?: unknown;
  reason?: string;
  note?: string;
  /** Raw parsed file for debugging. */
  raw?: Record<string, unknown>;
}

export interface IngestGateResultInput {
  handoffDir: string;
  requestId: string;
  /** Open observation window when decision is APPROVED*. */
  need?: LongitudinalNeed;
  scope?: AnalysisScope;
  before_signals?: NeedSignal[];
  candidate_id?: string;
  evolution_request_id?: string;
}

export interface IngestGateResultOutput {
  gate: GateResult | null;
  approved: boolean;
  window_opened: boolean;
  window_id?: string;
}

const APPROVED_DECISIONS = new Set<GateDecision>(["APPROVED", "APPROVED_WITH_CONSTRAINTS"]);

function classifyGateSource(raw: Record<string, unknown>): {
  gate_source: string;
  gate_source_kind: GateSourceKind;
  trust: GateResult["trust"];
} {
  const src = typeof raw.gate_source === "string" ? raw.gate_source : undefined;
  const kindRaw = typeof raw.gate_source_kind === "string" ? raw.gate_source_kind : undefined;
  if (kindRaw === "controlled_fixture" || kindRaw === "external_adapter" || kindRaw === "untrusted") {
    const trust =
      kindRaw === "controlled_fixture"
        ? "trusted_fixture"
        : kindRaw === "external_adapter"
          ? "external"
          : "untrusted";
    return {
      gate_source:
        src ??
        (kindRaw === "controlled_fixture"
          ? "ControlledGateFixture"
          : kindRaw === "external_adapter"
            ? "external_adapter"
            : "untrusted"),
      gate_source_kind: kindRaw,
      trust,
    };
  }
  if (
    src === "ControlledGateFixture" ||
    raw.note === "controlled_fixture_not_production_gate" ||
    raw.controlled_fixture === true
  ) {
    return {
      gate_source: src ?? "ControlledGateFixture",
      gate_source_kind: "controlled_fixture",
      trust: "trusted_fixture",
    };
  }
  if (src === "external_adapter" || raw.external_adapter === true) {
    return { gate_source: src ?? "external_adapter", gate_source_kind: "external_adapter", trust: "external" };
  }
  // Unlabeled gate.json is not production-proven — V1 treats as untrusted.
  return {
    gate_source: src ?? "unlabeled",
    gate_source_kind: "untrusted",
    trust: "untrusted",
  };
}

function normalizeDecision(raw: unknown): GateDecision | null {
  if (typeof raw !== "string") return null;
  const allowed: GateDecision[] = [
    "APPROVED",
    "APPROVED_WITH_CONSTRAINTS",
    "NEEDS_MORE_EVIDENCE",
    "BLOCKED",
    "REJECTED",
    "HOLD",
  ];
  return (allowed as string[]).includes(raw) ? (raw as GateDecision) : null;
}

/** Read `{requestId}.gate.json` from handoff directory. */
export function readGateResult(handoffDir: string, requestId: string): GateResult | null {
  const path = join(handoffDir, `${requestId}.gate.json`);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
    const decision = normalizeDecision(raw.decision);
    if (!decision) return null;
    const { gate_source, gate_source_kind, trust } = classifyGateSource(raw);
    const timestamp =
      (typeof raw.timestamp === "string" && raw.timestamp) ||
      (typeof raw.at === "string" && raw.at) ||
      new Date().toISOString();
    return {
      decision,
      request_id: requestId,
      timestamp,
      gate_source,
      gate_source_kind,
      trust,
      gate_run_id: typeof raw.gate_run_id === "string" ? raw.gate_run_id : undefined,
      implementation_id:
        typeof raw.implementation_id === "string" ? raw.implementation_id : undefined,
      evidence: raw.evidence,
      constraints: raw.constraints,
      reason: typeof raw.reason === "string" ? raw.reason : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
      raw,
    };
  } catch {
    return null;
  }
}

type WindowHost =
  | LiveAnalysisCoordinator
  | ObservationWindowManager
  | { getWindows(): ObservationWindowManager };

function resolveWindows(host: WindowHost): ObservationWindowManager {
  if ("getWindows" in host && typeof host.getWindows === "function") {
    return host.getWindows();
  }
  return host as ObservationWindowManager;
}

/**
 * Ingest a gate result artifact.
 * If APPROVED / APPROVED_WITH_CONSTRAINTS and need+scope provided, opens an observation window.
 * Persists provenance fields onto the window open path via implementation_id / notes in gate file.
 */
export function ingestGateResult(
  host: WindowHost,
  input: IngestGateResultInput,
): IngestGateResultOutput {
  const gate = readGateResult(input.handoffDir, input.requestId);
  if (!gate) {
    return { gate: null, approved: false, window_opened: false };
  }

  const approved = APPROVED_DECISIONS.has(gate.decision);
  // V1: unlabeled/untrusted gate.json must not auto-open observation windows
  // as if production-authorized (decision still readable via gate).
  if (gate.trust === "untrusted") {
    return { gate, approved: false, window_opened: false };
  }
  if (!approved || !input.need || !input.scope) {
    return { gate, approved, window_opened: false };
  }

  // Persist provenance sidecar for audit (does not mutate core/runtime).
  persistGateProvenance(input.handoffDir, input.requestId, gate);

  const windows = resolveWindows(host);
  const w = windows.open({
    evolution_request_id: input.evolution_request_id ?? input.requestId,
    candidate_id: input.candidate_id ?? `cand-${input.requestId}`,
    need: input.need,
    scope: input.scope,
    before_signals: input.before_signals ?? [],
    implementation_id: gate.implementation_id ?? `impl-${input.requestId}`,
  });

  return {
    gate,
    approved: true,
    window_opened: true,
    window_id: w.id,
  };
}

function persistGateProvenance(
  handoffDir: string,
  requestId: string,
  gate: GateResult,
): void {
  mkdirSync(handoffDir, { recursive: true });
  const path = join(handoffDir, `${requestId}.gate.provenance.json`);
  writeFileSync(
    path,
    JSON.stringify(
      {
        request_id: requestId,
        decision: gate.decision,
        gate_run_id: gate.gate_run_id,
        gate_source: gate.gate_source,
        gate_source_kind: gate.gate_source_kind,
        timestamp: gate.timestamp,
        evidence: gate.evidence,
        constraints: gate.constraints,
        note:
          gate.gate_source_kind === "controlled_fixture"
            ? "controlled_fixture_not_production_gate"
            : "external_adapter_partial",
      },
      null,
      2,
    ),
    "utf-8",
  );
}
