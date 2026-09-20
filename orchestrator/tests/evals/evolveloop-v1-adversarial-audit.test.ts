/**
 * EV-EVOLVE-V1-ADV-* — adversarial audit evidence for EvolveLoop V1 Final.
 *
 * READ-MOSTLY audit: measures actual behavior. Failures on ATTACK-01 (etc.)
 * are CONFIRMED DEFECTS for parent triage — this file does not patch production.
 *
 * cycle_id: evolveloop-v1-final-2026-09-19
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventBus } from "../../src/events/event-bus.js";
import {
  LongitudinalEvolveLoop,
  LiveAnalysisCoordinator,
  attachLiveEvolveLoop,
  eventToRawObservation,
  OutcomeTracker,
  CrossRunAggregator,
  SignalMiner,
  snapshotInventoryFromRegistry,
  readGateResult,
  ingestGateResult,
  sameExecutionTriple,
  resetLongitudinalSeq,
  type AnalysisScope,
  type LongitudinalNeed,
} from "../../src/evolveloop/index.js";
import { resetSyntheticSeq } from "../../src/evolveloop/adapters/synthetic-fixtures.js";
import type { CapabilityRegistry as CapReg, EventEnvelope } from "../../src/types/index.js";

const USER_A: AnalysisScope = { type: "USER", id: "user-a" };
const USER_B: AnalysisScope = { type: "USER", id: "user-b" };
const SYSTEM: AnalysisScope = { type: "SYSTEM", id: "system" };

function emitFailures(
  bus: EventBus,
  opts: {
    user?: string;
    domain: string;
    n: number;
    feature?: string;
    prefix?: string;
    omitUserId?: boolean;
  },
): void {
  for (let i = 0; i < opts.n; i++) {
    const payload: Record<string, unknown> = {
      capability: opts.domain,
      run_id: `${opts.prefix ?? "run"}-${opts.user ?? "anon"}-${i}`,
    };
    if (!opts.omitUserId && opts.user) payload.user_id = opts.user;
    bus.emit("NodeFailed", opts.feature ?? "feat-adv", "scheduler", payload);
  }
}

function emptyRegistry(): CapReg {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityRegistry",
    metadata: {},
    capabilities: {},
  };
}

function mockNeed(partial?: Partial<LongitudinalNeed>): LongitudinalNeed {
  return {
    id: "need-adv-1",
    fingerprint: "fp-adv-1",
    kind: "RepeatedFailure",
    status: "CANDIDATE",
    lifecycle: "EMERGING",
    domain: "sql.query",
    affected_tasks: ["sql.query"],
    scope: "USER",
    scope_class: "USER_LOCAL",
    scope_id: "user-a",
    unique_executions: 3,
    unique_sessions: 1,
    affected_executions: ["e1", "e2", "e3"],
    affected_sessions: ["s1"],
    evidence_refs: [],
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    confidence: "MEDIUM",
    rationale: "adversarial-fixture",
    ...partial,
  } as LongitudinalNeed;
}

describe("EV-EVOLVE-V1-ADV — adversarial audit", () => {
  beforeEach(() => {
    resetLongitudinalSeq();
    resetSyntheticSeq();
  });

  /**
   * ATTACK-01 — Fallback scope attribution without payload user_id.
   * V1 correction: reject unlabeled events (do not stamp attach-scope identity).
   */
  it("ATTACK-01 FIXED: unlabeled NodeFailed does not inherit attach USER scope", () => {
    const envelope = {
      event_id: "e-adv-01",
      type: "NodeFailed",
      timestamp: new Date().toISOString(),
      feature_id: "feat-adv",
      correlation_id: "corr-1",
      payload: { capability: "shell.execute", run_id: "run-orphan-1" },
    } as EventEnvelope;

    const obs = eventToRawObservation(envelope, { scope: USER_A });
    expect(obs).toBeNull();
  });

  it("ATTACK-01b FIXED: unlabeled NodeFailed does not persist under user-a", () => {
    const dir = mkdtempSync(join(tmpdir(), "adv01-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const deferred: string[] = [];
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 1, cooldown_ms: 0 },
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, {
        scope: USER_A,
        onDeferredIdentity: (_e, reason) => deferred.push(reason),
      });
      emitFailures(bus, { domain: "shell.execute", n: 1, omitUserId: true, prefix: "orphan" });
      detach();

      const storedAsA = loop.getStore().query({ user_id: "user-a" });
      expect(storedAsA.length).toBe(0);
      expect(loop.getStore().loadAllSignals().length).toBe(0);
      expect(deferred).toContain("missing_identity_for_attach_scope");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * ATTACK-02 — Cross-user isolation when payloads carry correct user_id.
   */
  it("ATTACK-02 cross-user: A analyze must not include B domain signals", () => {
    const dir = mkdtempSync(join(tmpdir(), "adv02-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
      });
      const bus = new EventBus();
      // Attach with USER_A fallback — payloads still carry explicit user_ids
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 3, prefix: "a" });
      emitFailures(bus, { user: "user-b", domain: "frontend.render", n: 3, prefix: "b" });
      detach();

      const a = coord.getLastResult(USER_A);
      const b = coord.getLastResult(USER_B);
      expect(a).toBeTruthy();
      expect(b).toBeTruthy();
      expect(a!.signals.every((s) => s.user_id === "user-a")).toBe(true);
      expect(a!.signals.some((s) => s.domain === "frontend.render")).toBe(false);
      expect(a!.signals.some((s) => s.user_id === "user-b")).toBe(false);
      expect(b!.signals.every((s) => s.user_id === "user-b")).toBe(true);
      expect(b!.signals.some((s) => s.domain === "sql.query")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * ATTACK-03 — Empty after-window must not be IMPROVED.
   */
  it("ATTACK-03 empty after=[] → INCONCLUSIVE not IMPROVED", () => {
    const tracker = new OutcomeTracker();
    const need = mockNeed();
    const before = new SignalMiner().mine(
      [0, 1, 2].map((i) => ({
        id: `b-${i}`,
        timestamp: new Date().toISOString(),
        source: "telemetry" as const,
        synthetic: false,
        execution_id: `run-b-${i}`,
        user_id: "user-a",
        domain: "sql.query",
        task_class: "sql.query",
        kind: "failure" as const,
        severity: "HIGH" as const,
        evidence_refs: [],
      })),
    );
    const { outcome } = tracker.evaluate({
      evolution_request_id: "ereq-adv-03",
      candidate_id: "cand-adv-03",
      need,
      signals_before: before,
      signals_after: [],
      window_start: new Date(Date.now() - 3600_000).toISOString(),
      window_end: new Date().toISOString(),
    });
    expect(outcome.outcome).toBe("INCONCLUSIVE");
    expect(outcome.notes).toContain("empty_after_window");
  });

  /**
   * ATTACK-04 — Storm: 200 NodeFailed must not yield ~200 analyzes.
   */
  it("ATTACK-04 storm: 200 NodeFailed → analyzes bounded << 200", () => {
    const dir = mkdtempSync(join(tmpdir(), "adv04-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      let analyzes = 0;
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        // realistic-ish defaults: high-sev threshold 1 but rate-limit + cooldown
        cadence: {
          min_new_signals: 3,
          min_new_signals_high_severity: 1,
          cooldown_ms: 0,
          max_analyses_per_minute: 30,
        },
        onResult: () => {
          analyzes += 1;
        },
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "storm.domain", n: 200, prefix: "storm" });
      detach();
      expect(analyzes).toBeGreaterThan(0);
      expect(analyzes).toBeLessThan(200);
      expect(analyzes).toBeLessThanOrEqual(30); // max_analyses_per_minute backpressure
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * ATTACK-05 — Outcome loop depth capped.
   */
  it("ATTACK-05 afterOutcome repeatedly → capped by max_loop_depth", () => {
    const dir = mkdtempSync(join(tmpdir(), "adv05-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const results: unknown[] = [];
      const deferred: string[] = [];
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { cooldown_ms: 0, max_loop_depth: 2, min_new_signals: 1 },
        onResult: (r) => results.push(r),
        onDeferred: (reason) => deferred.push(reason),
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "x", n: 1, prefix: "seed" });
      detach();

      const before = results.length;
      for (let i = 0; i < 8; i++) {
        coord.afterOutcome(USER_A, i % 2 === 0 ? "UNCHANGED" : "REGRESSED");
      }
      expect(coord.getOutcomeTriggerCount(USER_A)).toBe(2);
      expect(deferred).toContain("outcome_max_loop_depth");
      expect(results.length - before).toBeLessThanOrEqual(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * ATTACK-06 — analyze() without scope must not silent global.
   */
  it("ATTACK-06 analyze() without scope → REQUIRES_SCOPE not global", () => {
    const dir = mkdtempSync(join(tmpdir(), "adv06-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const r = loop.analyze({ now });
      expect(r.state).toBe("REQUIRES_SCOPE");
      expect(r.notes).toContain("requires_scope");
      expect(r.signal_count ?? 0).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * ATTACK-07 — SYSTEM without authorize_system deferred/blocked.
   */
  it("ATTACK-07 SYSTEM without authorize → deferred / REQUIRES_SCOPE", () => {
    const dir = mkdtempSync(join(tmpdir(), "adv07-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const deferred: Array<{ reason: string; scope: AnalysisScope | null }> = [];
      const results: unknown[] = [];
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        authorize_system: false,
        cadence: { min_new_signals: 1, cooldown_ms: 0 },
        onResult: (r) => results.push(r),
        onDeferred: (reason, scope) => deferred.push({ reason, scope }),
      });

      coord.notifySignal(SYSTEM, { high_severity: true, signals: [] });
      expect(results.length).toBe(0);
      expect(deferred.some((d) => d.reason === "system_requires_authorize_system")).toBe(true);

      const direct = loop.analyze({ scope: SYSTEM, now });
      expect(direct.state).toBe("REQUIRES_SCOPE");
      expect(direct.notes).toContain("system_requires_authorize_system");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * ATTACK-08 — Same execution_id ×3 ≠ 3 unique_executions for longitudinal pattern.
   */
  it("ATTACK-08 same execution_id ×3 events ≠ longitudinal pattern (unique_executions policy)", () => {
    const now = new Date();
    const miner = new SignalMiner();
    const obs = sameExecutionTriple("user-a", now);
    expect(obs.length).toBe(3);
    expect(new Set(obs.map((o) => o.execution_id)).size).toBe(1);
    // Miner may fingerprint-dedupe identical logical events; aggregator still must not pattern.
    const signals = miner.mine(obs);
    const patterns = new CrossRunAggregator().aggregate(signals, { now, window: "7d" });
    expect(patterns.length).toBe(0);
    const uniqueExecs = new Set(signals.map((s) => s.execution_id).filter(Boolean));
    expect(uniqueExecs.size).toBeLessThan(3);
  });

  /**
   * ATTACK-09 — Registry unavailable / unscanned → UNKNOWN (not empty-as-ok FRESH).
   */
  it("ATTACK-09 empty/unscanned registry snapshot → status UNKNOWN not FRESH-empty-ok", () => {
    const snap = snapshotInventoryFromRegistry(emptyRegistry());
    expect(snap.status).toBe("UNKNOWN");
    expect(snap.notes?.some((n) => n.includes("agents_skills_not_scanned") || n.includes("hint"))).toBe(
      true,
    );
    // Empty capabilities must not be framed as healthy FRESH inventory
    expect(snap.status).not.toBe("FRESH");
    expect(snap.inventory.capabilities).toEqual([]);
  });

  /**
   * ATTACK-10 — Unlabeled gate.json → untrusted; APPROVED ≠ production window open.
   */
  it("ATTACK-10 unlabeled gate.json → untrusted; does not open observation window", () => {
    const handoff = mkdtempSync(join(tmpdir(), "adv10h-"));
    const dir = mkdtempSync(join(tmpdir(), "adv10-"));
    try {
      const requestId = "ereq-unlabeled-gate";
      writeFileSync(
        join(handoff, `${requestId}.gate.json`),
        JSON.stringify({
          decision: "APPROVED",
          timestamp: new Date().toISOString(),
          // intentionally no gate_source / gate_source_kind
        }),
        "utf-8",
      );

      const gate = readGateResult(handoff, requestId);
      expect(gate).not.toBeNull();
      expect(gate!.decision).toBe("APPROVED");
      expect(gate!.gate_source_kind).toBe("untrusted");
      expect(gate!.trust).toBe("untrusted");

      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now: new Date() });
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
      });
      const need = mockNeed();
      const ing = ingestGateResult(coord, {
        handoffDir: handoff,
        requestId,
        need,
        scope: USER_A,
        before_signals: [],
        candidate_id: "cand-unlabeled",
      });
      expect(ing.approved).toBe(false);
      expect(ing.window_opened).toBe(false);
      expect(ing.gate?.gate_source_kind).toBe("untrusted");
      expect((ing.gate as { production_proven?: boolean } | null)?.production_proven).toBeUndefined();
    } finally {
      rmSync(handoff, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
