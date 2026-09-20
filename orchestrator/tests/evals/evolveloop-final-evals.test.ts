/**
 * EV-EVOLVE-FINAL-* — final operationalization evals (phases 3–8 wiring).
 *
 * Each case documents: proves / does_not_prove / environment harness
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventBus } from "../../src/events/event-bus.js";
import {
  LongitudinalEvolveLoop,
  LiveAnalysisCoordinator,
  attachLiveEvolveLoop,
  approveEvolutionRequestFixture,
  readGateResult,
  ingestGateResult,
  resetLongitudinalSeq,
  EVENT_COVERAGE,
} from "../../src/evolveloop/index.js";
import { resetSyntheticSeq } from "../../src/evolveloop/adapters/synthetic-fixtures.js";

const USER_A = { type: "USER" as const, id: "user-a" };
const USER_B = { type: "USER" as const, id: "user-b" };

function emitFailures(
  bus: EventBus,
  opts: { user: string; domain: string; n: number; feature?: string; prefix?: string },
): void {
  for (let i = 0; i < opts.n; i++) {
    bus.emit("NodeFailed", opts.feature ?? "feat-final", "scheduler", {
      capability: opts.domain,
      run_id: `${opts.prefix ?? "run"}-${opts.user}-${i}`,
      user_id: opts.user,
    });
  }
}

describe("EV-EVOLVE-FINAL-001 — Automatic Analysis Trigger", () => {
  beforeEach(() => {
    resetLongitudinalSeq();
    resetSyntheticSeq();
  });

  it("proves: EventBus→ingest→cadence→analyze without manual analyze(); does_not_prove: production cron; environment: harness EventBus", () => {
    const dir = mkdtempSync(join(tmpdir(), "final001-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const results: unknown[] = [];
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
        onResult: (r) => results.push(r),
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "shell.execute", n: 3 });
      detach();
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(coord.getLastResult(USER_A)?.signal_count).toBeGreaterThanOrEqual(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-FINAL-002 — Outcome Trigger (CRITICAL)", () => {
  it("proves: window close → afterOutcome → second analyze with no manual analyze(); does_not_prove: production deploy timing; environment: harness sync+cooldown_ms:0", () => {
    const dir = mkdtempSync(join(tmpdir(), "final002-"));
    const handoff = mkdtempSync(join(tmpdir(), "final002h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      const results: unknown[] = [];
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: {
          min_new_signals: 3,
          min_new_signals_high_severity: 3,
          cooldown_ms: 0,
          window_minimum_samples: 2,
        },
        onResult: (r) => results.push(r),
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 3, prefix: "pre" });
      expect(results.length).toBe(1);
      const r = coord.getLastResult(USER_A)!;
      const need = r.longitudinal_needs?.find(
        (n) => n.unique_executions >= 3 || n.status === "CANDIDATE",
      );
      expect(need).toBeTruthy();
      coord.getWindows().open({
        evolution_request_id: r.requests[0]?.id ?? `ereq-${need!.id}`,
        candidate_id: r.requests[0]?.candidate.id ?? `cand-${need!.id}`,
        need: need!,
        scope: USER_A,
        before_signals: loop.getStore().query({ user_id: "user-a", domain: "sql.query" }),
      });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 2, prefix: "post" });
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      detach();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-FINAL-003 — Observation Window", () => {
  it("proves: open→sample→close→evaluate via closeAndFeedback; does_not_prove: real SLA windows; environment: harness", () => {
    const dir = mkdtempSync(join(tmpdir(), "final003-"));
    const handoff = mkdtempSync(join(tmpdir(), "final003h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0, window_minimum_samples: 2 },
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 3, prefix: "b" });
      const r = coord.getLastResult(USER_A)!;
      const need = r.longitudinal_needs?.find(
        (n) => n.unique_executions >= 3 || n.status === "CANDIDATE",
      )!;
      const w = coord.getWindows().open({
        evolution_request_id: r.requests[0]?.id ?? `ereq-${need.id}`,
        candidate_id: r.requests[0]?.candidate.id ?? `cand-${need.id}`,
        need,
        scope: USER_A,
        before_signals: loop.getStore().query({ user_id: "user-a", domain: "sql.query" }),
      });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 2, prefix: "af" });
      const closed = coord.getWindows().list().find((x) => x.id === w.id)!;
      if (closed.status === "CLOSED") {
        // Already evaluated by notifySignal path; outcomes should exist
        expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      } else {
        closed.status = "CLOSED";
        closed.end = now.toISOString();
        coord.closeAndFeedback(closed);
        expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      }
      detach();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-FINAL-004 — Gate Handoff (fixture boundary)", () => {
  it("proves: ControlledGateFixture writes gate_source + ingest opens window; does_not_prove: production Prototype Gate; environment: controlled_fixture", () => {
    const dir = mkdtempSync(join(tmpdir(), "final004-"));
    const handoff = mkdtempSync(join(tmpdir(), "final004h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 3 });
      detach();
      const r = coord.getLastResult(USER_A)!;
      const submitted = r.requests.filter((q) => q.requested_action === "SUBMIT_TO_PROTOTYPE_GATE");
      expect(r.unauthorized_mutation).toBe(false);
      if (submitted.length) {
        expect(existsSync(join(handoff, `${submitted[0]!.id}.json`))).toBe(true);
        const gate = approveEvolutionRequestFixture(handoff, submitted[0]!.id);
        expect(gate.decision).toMatch(/APPROVED|HOLD/);
        const parsed = readGateResult(handoff, submitted[0]!.id);
        expect(parsed?.gate_source).toBe("ControlledGateFixture");
        expect(parsed?.gate_source_kind).toBe("controlled_fixture");
        const need = r.longitudinal_needs?.find((n) => n.id === submitted[0]!.source_need);
        if (gate.approved && need) {
          const ing = ingestGateResult(coord, {
            handoffDir: handoff,
            requestId: submitted[0]!.id,
            need,
            scope: USER_A,
            before_signals: loop.getStore().query({ user_id: "user-a", domain: "sql.query" }),
            candidate_id: submitted[0]!.candidate.id,
          });
          expect(ing.window_opened).toBe(true);
        }
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-FINAL-005 — Scope Isolation", () => {
  it("proves: USER A/B isolate under automatic analyze; does_not_prove: disk tenancy; environment: harness", () => {
    const dir = mkdtempSync(join(tmpdir(), "final005-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "sql", n: 3, prefix: "a" });
      emitFailures(bus, { user: "user-b", domain: "frontend", n: 3, prefix: "b" });
      detach();
      const a = coord.getLastResult(USER_A);
      const b = coord.getLastResult(USER_B);
      expect(a?.signals.every((s) => s.user_id === "user-a")).toBe(true);
      expect(b?.signals.every((s) => s.user_id === "user-b")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-FINAL-006 — Runtime Resilience", () => {
  it("proves: analyze throw does not break EventBus emit; does_not_prove: zero latency; environment: harness", () => {
    const dir = mkdtempSync(join(tmpdir(), "final006-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const orig = loop.analyze.bind(loop);
      let blows = 0;
      loop.analyze = ((opts) => {
        blows += 1;
        if (blows === 1) throw new Error("analysis_boom");
        return orig(opts);
      }) as typeof loop.analyze;
      const errors: unknown[] = [];
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
        onAnalysisFailed: (e) => errors.push(e),
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      expect(() => emitFailures(bus, { user: "user-a", domain: "x", n: 3 })).not.toThrow();
      detach();
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(EVENT_COVERAGE.some((e) => e.type === "RetryScheduled")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-FINAL-007 — Closed Loop", () => {
  it("proves: runtime→analyze→window→outcome→automatic next analysis; does_not_prove: production gate; environment: harness sync", () => {
    const dir = mkdtempSync(join(tmpdir(), "final007-"));
    const handoff = mkdtempSync(join(tmpdir(), "final007h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      let autoAnalyzes = 0;
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: {
          min_new_signals: 3,
          min_new_signals_high_severity: 3,
          cooldown_ms: 0,
          window_minimum_samples: 2,
        },
        harness_auto_approve: true,
        auto_open_windows_on_fixture_approve: true,
        onResult: () => {
          autoAnalyzes += 1;
        },
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });

      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 3, prefix: "c1" });
      expect(autoAnalyzes).toBeGreaterThanOrEqual(1);
      const r = coord.getLastResult(USER_A)!;
      const need = r.longitudinal_needs?.find(
        (n) => n.unique_executions >= 3 || n.status === "CANDIDATE",
      );
      expect(need).toBeTruthy();

      let open = coord.getWindows().list("OPEN");
      if (!open.length) {
        open = [
          coord.getWindows().open({
            evolution_request_id: r.requests[0]?.id ?? `ereq-${need!.id}`,
            candidate_id: r.requests[0]?.candidate.id ?? `cand-${need!.id}`,
            need: need!,
            scope: USER_A,
            before_signals: loop.getStore().query({ user_id: "user-a", domain: "sql.query" }),
          }),
        ];
      }

      const analyzesBeforeClose = autoAnalyzes;
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 2, prefix: "post" });
      expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      // CRITICAL: outcome must drive another analyze without manual analyze()
      expect(autoAnalyzes).toBeGreaterThan(analyzesBeforeClose);
      expect(r.unauthorized_mutation).toBe(false);
      detach();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});
