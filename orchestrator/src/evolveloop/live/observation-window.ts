/**
 * Post-evolution observation windows — compare before/after then recordOutcome.
 * Does not bypass Prototype Gate; opens only after explicit approval/fixture.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LongitudinalEvolveLoop } from "../longitudinal-controller.js";
import type { AnalysisScope, LongitudinalNeed } from "../longitudinal-types.js";
import type { NeedSignal } from "../types.js";
import { LIVE_CADENCE_DEFAULTS } from "./live-config.js";
import { scopeKey } from "./live-config.js";

export type ObservationWindowStatus = "OPEN" | "CLOSED" | "EVALUATED" | "INCONCLUSIVE_CLOSED";

export interface ObservationWindow {
  id: string;
  evolution_request_id: string;
  candidate_id: string;
  need: LongitudinalNeed;
  scope: AnalysisScope;
  task_definition: { domain: string; task_class: string };
  start: string;
  end?: string;
  minimum_samples: number;
  max_duration_ms: number;
  status: ObservationWindowStatus;
  before_signals: NeedSignal[];
  after_signals: NeedSignal[];
  implementation_id?: string;
}

export class ObservationWindowManager {
  private readonly windowsPath: string;
  private windows: ObservationWindow[] = [];

  constructor(
    private readonly evolutionDir: string,
    private readonly defaults: {
      minimum_samples?: number;
      max_duration_ms?: number;
    } = {},
  ) {
    mkdirSync(evolutionDir, { recursive: true });
    this.windowsPath = join(evolutionDir, "observation-windows.jsonl");
    this.load();
  }

  open(input: {
    evolution_request_id: string;
    candidate_id: string;
    need: LongitudinalNeed;
    scope: AnalysisScope;
    before_signals: NeedSignal[];
    implementation_id?: string;
    now?: Date;
  }): ObservationWindow {
    const now = input.now ?? new Date();
    const id = `ow-${createHash("sha256")
      .update([input.evolution_request_id, input.candidate_id, now.toISOString()].join("|"))
      .digest("hex")
      .slice(0, 12)}`;
    const w: ObservationWindow = {
      id,
      evolution_request_id: input.evolution_request_id,
      candidate_id: input.candidate_id,
      need: input.need,
      scope: input.scope,
      task_definition: {
        domain: input.need.domain,
        task_class: input.need.affected_tasks[0] ?? "unknown",
      },
      start: now.toISOString(),
      minimum_samples: this.defaults.minimum_samples ?? LIVE_CADENCE_DEFAULTS.window_minimum_samples,
      max_duration_ms: this.defaults.max_duration_ms ?? LIVE_CADENCE_DEFAULTS.window_max_duration_ms,
      status: "OPEN",
      before_signals: input.before_signals,
      after_signals: [],
      implementation_id: input.implementation_id,
    };
    this.windows.push(w);
    this.persist(w);
    return w;
  }

  /** Feed a newly ingested signal into open windows of matching scope/task. */
  observeSignal(signal: NeedSignal, now: Date = new Date()): ObservationWindow[] {
    const closed: ObservationWindow[] = [];
    for (const w of this.windows) {
      if (w.status !== "OPEN") continue;
      if (!scopeMatches(w.scope, signal)) continue;
      if (signal.domain !== w.task_definition.domain) continue;
      if (signal.task_class !== w.task_definition.task_class) continue;
      // Skip post-evolution synthetic feedback from counting as after-sample noise of itself
      if (String(signal.type).startsWith("post_evolution_")) continue;
      if (signal.metadata?.ephemeral_feedback) continue;

      w.after_signals.push(signal);
      const elapsed = now.getTime() - Date.parse(w.start);
      if (w.after_signals.length >= w.minimum_samples || elapsed >= w.max_duration_ms) {
        w.status = "CLOSED";
        w.end = now.toISOString();
        this.persist(w);
        closed.push(w);
      } else {
        this.persist(w);
      }
    }
    return closed;
  }

  evaluateClosed(loop: LongitudinalEvolveLoop, window: ObservationWindow): ReturnType<LongitudinalEvolveLoop["recordOutcome"]> | null {
    if (window.status !== "CLOSED") return null;
    const result = loop.recordOutcome({
      evolution_request_id: window.evolution_request_id,
      candidate_id: window.candidate_id,
      need: window.need,
      signals_before: window.before_signals,
      signals_after: window.after_signals,
      implementation_id: window.implementation_id,
      window_start: window.start,
      window_end: window.end ?? new Date().toISOString(),
    });
    window.status = result.outcome.outcome === "INCONCLUSIVE" ? "INCONCLUSIVE_CLOSED" : "EVALUATED";
    this.persist(window);
    return result;
  }

  list(status?: ObservationWindowStatus): ObservationWindow[] {
    return status ? this.windows.filter((w) => w.status === status) : [...this.windows];
  }

  private persist(w: ObservationWindow): void {
    appendFileSync(this.windowsPath, `${JSON.stringify(w)}\n`, "utf-8");
  }

  private load(): void {
    if (!existsSync(this.windowsPath)) return;
    const byId = new Map<string, ObservationWindow>();
    for (const line of readFileSync(this.windowsPath, "utf-8").split("\n").filter(Boolean)) {
      try {
        const w = JSON.parse(line) as ObservationWindow;
        byId.set(w.id, w);
      } catch {
        /* skip */
      }
    }
    this.windows = [...byId.values()];
  }
}

function scopeMatches(scope: AnalysisScope, signal: NeedSignal): boolean {
  switch (scope.type) {
    case "USER":
      return signal.user_id === scope.id;
    case "PROJECT":
      return signal.project_id === scope.id;
    case "WORKSPACE":
      return signal.feature_id === scope.id;
    case "SYSTEM":
      return true;
  }
}

/** Controlled gate fixture — writes approval artifact; does NOT mutate runtime/core. */
export function approveEvolutionRequestFixture(
  handoffDir: string,
  requestId: string,
  opts?: { implementation_id?: string },
): { approved: boolean; path: string; decision: string } {
  mkdirSync(handoffDir, { recursive: true });
  const reqPath = join(handoffDir, `${requestId}.json`);
  if (!existsSync(reqPath)) {
    return { approved: false, path: reqPath, decision: "MISSING_REQUEST" };
  }
  const req = JSON.parse(readFileSync(reqPath, "utf-8")) as {
    requested_action?: string;
    scope?: string;
    mutates_core?: boolean;
  };
  if (req.mutates_core) {
    return { approved: false, path: reqPath, decision: "BLOCKED_CORE_MUTATION" };
  }
  if (req.requested_action === "HOLD" || req.scope === "CORE_CANDIDATE") {
    const holdPath = join(handoffDir, `${requestId}.gate.json`);
    writeFileSync(
      holdPath,
      JSON.stringify(
        {
          decision: "HOLD",
          reason: "core_candidate_hold",
          at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          gate_source: "ControlledGateFixture",
          gate_source_kind: "controlled_fixture",
          note: "controlled_fixture_not_production_gate",
        },
        null,
        2,
      ),
      "utf-8",
    );
    return { approved: false, path: holdPath, decision: "HOLD" };
  }
  const gatePath = join(handoffDir, `${requestId}.gate.json`);
  writeFileSync(
    gatePath,
    JSON.stringify(
      {
        decision: "APPROVED",
        implementation_id: opts?.implementation_id ?? `impl-${requestId}`,
        at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        gate_source: "ControlledGateFixture",
        gate_source_kind: "controlled_fixture",
        note: "controlled_fixture_not_production_gate",
      },
      null,
      2,
    ),
    "utf-8",
  );
  return { approved: true, path: gatePath, decision: "APPROVED" };
}

export { scopeKey };
