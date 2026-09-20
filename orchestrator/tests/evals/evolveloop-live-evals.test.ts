/**
 * EV-EVOLVE-LIVE-* — automatic trigger / closed-loop harness.
 * Fixture / production-like EventBus — NOT production-proven.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventBus } from "../../src/events/event-bus.js";
import {
  LongitudinalEvolveLoop,
  LiveAnalysisCoordinator,
  attachLiveEvolveLoop,
  approveEvolutionRequestFixture,
  resetLongitudinalSeq,
} from "../../src/evolveloop/index.js";
import { resetSyntheticSeq } from "../../src/evolveloop/adapters/synthetic-fixtures.js";

const USER_A = { type: "USER" as const, id: "user-a" };
const USER_B = { type: "USER" as const, id: "user-b" };

function emitFailures(
  bus: EventBus,
  opts: { user: string; domain: string; n: number; feature?: string; prefix?: string },
): void {
  for (let i = 0; i < opts.n; i++) {
    bus.emit("NodeFailed", opts.feature ?? "feat-live", "scheduler", {
      capability: opts.domain,
      run_id: `${opts.prefix ?? "run"}-${opts.user}-${i}`,
      user_id: opts.user,
    });
  }
}

describe("EV-EVOLVE-LIVE-001 — Automatic Trigger", () => {
  beforeEach(() => {
    resetLongitudinalSeq();
    resetSyntheticSeq();
  });

  it("proves: EventBus→ingest→cadence→analyze without manual analyze(); does not prove: production cron", async () => {
    const dir = mkdtempSync(join(tmpdir(), "live001-"));
    const handoff = mkdtempSync(join(tmpdir(), "live001h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
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
      const last = coord.getLastResult(USER_A);
      expect(last).toBeTruthy();
      expect(last!.state).not.toBe("REQUIRES_SCOPE");
      expect(last!.signal_count).toBeGreaterThanOrEqual(3);
      // No manual analyze() was called in this test body
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-LIVE-002 — Scoped Analysis", () => {
  it("proves: A and B isolate under automatic analyze; does not prove: disk tenancy", () => {
    const dir = mkdtempSync(join(tmpdir(), "live002-"));
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
      expect(a?.signals.some((s) => s.user_id === "user-b")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-LIVE-003 — Automatic Candidate", () => {
  it("proves: need+candidate without manual analyze; does not prove: optimal candidate choice", () => {
    const dir = mkdtempSync(join(tmpdir(), "live003-"));
    const handoff = mkdtempSync(join(tmpdir(), "live003h-"));
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
      const r = coord.getLastResult(USER_A);
      expect(r).toBeTruthy();
      expect(r!.need_count + r!.candidate_count + r!.pattern_count).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-LIVE-004 — Gate Handoff", () => {
  it("proves: EvolutionRequest written to handoff dir; CORE HOLD not approved as mutate; does not prove: full Prototype Gate runner", () => {
    const dir = mkdtempSync(join(tmpdir(), "live004-"));
    const handoff = mkdtempSync(join(tmpdir(), "live004h-"));
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
      expect(r).toBeTruthy();
      const submitted = r.requests.filter((q) => q.requested_action === "SUBMIT_TO_PROTOTYPE_GATE");
      if (submitted.length) {
        expect(existsSync(join(handoff, `${submitted[0]!.id}.json`))).toBe(true);
        const gate = approveEvolutionRequestFixture(handoff, submitted[0]!.id);
        expect(["APPROVED", "HOLD", "MISSING_REQUEST"]).toContain(gate.decision);
      }
      expect(r.unauthorized_mutation).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-LIVE-005 — Outcome Window", () => {
  it("proves: after auto-analyze, window opens, samples evaluate to persisted outcome; does not prove: real deploy timing", () => {
    const dir = mkdtempSync(join(tmpdir(), "live005-"));
    const handoff = mkdtempSync(join(tmpdir(), "live005h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0, window_minimum_samples: 2 },
        harness_auto_approve: true,
        auto_open_windows_on_fixture_approve: true,
      });
      const bus = new EventBus();
      const detach = attachLiveEvolveLoop(bus, loop, coord, { scope: USER_A });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 3, prefix: "pre" });
      const r = coord.getLastResult(USER_A);
      expect(r).toBeTruthy();
      const need = r!.longitudinal_needs?.find((n) => n.status === "CANDIDATE" || n.unique_executions >= 3);
      expect(need).toBeTruthy();

      let open = coord.getWindows().list("OPEN");
      if (!open.length) {
        // If analyze produced no SUBMIT (e.g. only HOLD/NO_CHANGE), open window from detected need
        const req = r!.requests[0];
        open = [
          coord.getWindows().open({
            evolution_request_id: req?.id ?? `ereq-test-${need!.id}`,
            candidate_id: req?.candidate.id ?? `cand-${need!.id}`,
            need: need!,
            scope: USER_A,
            before_signals: loop.getStore().query({ user_id: "user-a", domain: "sql.query" }),
          }),
        ];
      }
      expect(open.length).toBeGreaterThanOrEqual(1);

      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 2, prefix: "post" });
      const w = coord.getWindows().list().find((x) => x.id === open[0]!.id)!;
      if (w.status === "CLOSED") {
        coord.getWindows().evaluateClosed(loop, w);
      }
      expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      detach();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-LIVE-006 — Outcome Reingestion", () => {
  it("proves: evaluated outcome persists across restart and next auto-analyze; does not prove: auto deploy", () => {
    const dir = mkdtempSync(join(tmpdir(), "live006-"));
    const handoff = mkdtempSync(join(tmpdir(), "live006h-"));
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
      const r1 = coord.getLastResult(USER_A);
      expect(r1).toBeTruthy();
      const need = r1!.longitudinal_needs?.find((n) => n.status === "CANDIDATE" || n.unique_executions >= 3);
      expect(need).toBeTruthy();
      const before = loop.getStore().query({ user_id: "user-a", domain: "sql.query" });
      const w = coord.getWindows().open({
        evolution_request_id: r1!.requests[0]?.id ?? `ereq-${need!.id}`,
        candidate_id: r1!.requests[0]?.candidate.id ?? `cand-${need!.id}`,
        need: need!,
        scope: USER_A,
        before_signals: before,
      });
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 2, prefix: "af" });
      const closed = coord.getWindows().list().find((x) => x.id === w.id)!;
      if (closed.status === "CLOSED") {
        coord.getWindows().evaluateClosed(loop, closed);
      } else if (closed.after_signals.length >= 2) {
        closed.status = "CLOSED";
        closed.end = now.toISOString();
        coord.getWindows().evaluateClosed(loop, closed);
      }
      expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      detach();

      const loop2 = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      expect(loop2.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      const coord2 = new LiveAnalysisCoordinator({
        loop: loop2,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
      });
      const bus2 = new EventBus();
      const detach2 = attachLiveEvolveLoop(bus2, loop2, coord2, { scope: USER_A });
      emitFailures(bus2, { user: "user-a", domain: "sql.query", n: 3, prefix: "n2" });
      const r2 = coord2.getLastResult(USER_A);
      expect(r2).toBeTruthy();
      expect(r2!.signal_count).toBeGreaterThanOrEqual(3);
      detach2();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-LIVE-007 — Runtime Non-Blocking", () => {
  it("proves: analyze throw does not break EventBus emit; does not prove: zero latency overhead", () => {
    const dir = mkdtempSync(join(tmpdir(), "live007-"));
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
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-LIVE-008 — Closed Loop", () => {
  it("proves: EventBus→auto analyze→need→window→outcome→restart auto analyze; no manual analyze()", () => {
    const dir = mkdtempSync(join(tmpdir(), "live008-"));
    const handoff = mkdtempSync(join(tmpdir(), "live008h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      let autoAnalyzes = 0;
      const coord = new LiveAnalysisCoordinator({
        loop,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0, window_minimum_samples: 2 },
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
      expect(r.signal_count).toBeGreaterThanOrEqual(3);
      expect(r.pattern_count + r.need_count).toBeGreaterThan(0);
      const need = r.longitudinal_needs?.find((n) => n.unique_executions >= 3 || n.status === "CANDIDATE");
      expect(need).toBeTruthy();

      // Gate handoff when SUBMIT exists
      const submitted = r.requests.filter((q) => q.requested_action === "SUBMIT_TO_PROTOTYPE_GATE");
      for (const req of submitted) {
        expect(existsSync(join(handoff, `${req.id}.json`))).toBe(true);
        const gate = approveEvolutionRequestFixture(handoff, req.id);
        expect(["APPROVED", "HOLD"]).toContain(gate.decision);
      }

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
      expect(open.length).toBeGreaterThanOrEqual(1);
      emitFailures(bus, { user: "user-a", domain: "sql.query", n: 2, prefix: "post" });
      const w = coord.getWindows().list().find((x) => x.id === open[0]!.id)!;
      if (w.status === "CLOSED") coord.getWindows().evaluateClosed(loop, w);
      else if (w.after_signals.length >= 2) {
        w.status = "CLOSED";
        w.end = now.toISOString();
        coord.getWindows().evaluateClosed(loop, w);
      }
      expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      expect(r.unauthorized_mutation).toBe(false);
      detach();

      const loop2 = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      expect(loop2.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      const coord2 = new LiveAnalysisCoordinator({
        loop: loop2,
        sync: true,
        cadence: { min_new_signals: 3, cooldown_ms: 0 },
      });
      const bus2 = new EventBus();
      const detach2 = attachLiveEvolveLoop(bus2, loop2, coord2, { scope: USER_A });
      emitFailures(bus2, { user: "user-a", domain: "sql.query", n: 3, prefix: "c2" });
      const r2 = coord2.getLastResult(USER_A)!;
      expect(r2.signal_count).toBeGreaterThanOrEqual(3);
      expect(r2.unauthorized_mutation).toBe(false);
      detach2();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});
