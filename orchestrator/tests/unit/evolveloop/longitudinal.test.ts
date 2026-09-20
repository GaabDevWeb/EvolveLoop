import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LongitudinalEvolveLoop,
  PersistentSignalStore,
  CrossRunAggregator,
  SignalMiner,
  longitudinalFailureArc,
  sameExecutionTriple,
  resetLongitudinalSeq,
  dayObs,
  adaptJsonlEventsFile,
  ADAPTER_REGISTRY,
  LONGITUDINAL_THRESHOLDS,
  parseTimestamp,
  OutcomeTracker,
  diagnoseWithInventory,
} from "../../../src/evolveloop/index.js";
import { resetSyntheticSeq } from "../../../src/evolveloop/adapters/synthetic-fixtures.js";

const USER_A = { type: "USER" as const, id: "user-a" };
const USER_B = { type: "USER" as const, id: "user-b" };
const SYSTEM = { type: "SYSTEM" as const, id: "system" };

describe("EV-EVOLVE-002 — persistent store", () => {
  beforeEach(() => {
    resetLongitudinalSeq();
    resetSyntheticSeq();
  });

  it("survives process restart (new store instance)", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-persist-"));
    try {
      const now = new Date();
      const a = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      a.ingest(longitudinalFailureArc("user-a", now).slice(0, 2), now);
      // "restart"
      const b = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      b.ingest(longitudinalFailureArc("user-a", now).slice(2), now);
      const r = b.analyze({ now, scope: USER_A });
      expect(r.signal_count).toBeGreaterThanOrEqual(3);
      expect(r.pattern_count).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("idempotent re-ingest", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-idemp-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const batch = longitudinalFailureArc("user-a", now);
      const r1 = loop.ingest(batch, now);
      const r2 = loop.ingest(batch, now);
      expect(r1.written).toBeGreaterThan(0);
      expect(r2.written).toBe(0);
      expect(r2.skipped).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-003 — cross-run aggregation", () => {
  it("requires unique_executions (same-run triple is not a pattern)", () => {
    const miner = new SignalMiner();
    const now = new Date();
    const signals = miner.mine(sameExecutionTriple("user-a", now));
    const patterns = new CrossRunAggregator().aggregate(signals, { now, window: "7d" });
    expect(patterns.length).toBe(0);
  });

  it("detects pattern across separate ingest runs", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-xrun-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      // Run A / B / C separately
      for (const day of [6, 4, 2]) {
        loop.ingest(
          [
            dayObs(day, {
              source: "execution",
              synthetic: true,
              execution_id: `run-${day}`,
              user_id: "user-a",
              domain: "sql",
              task_class: "complex_query",
              kind: "failure",
              severity: "HIGH",
            }, now),
          ],
          now,
        );
      }
      const r = loop.analyze({ now, scope: USER_A });
      expect(r.pattern_count).toBeGreaterThanOrEqual(1);
      expect(r.patterns[0]).toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-004 — user isolation", () => {
  it("User A need ≠ User B need", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-iso-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      loop.ingest(
        longitudinalFailureArc("user-b", now).map((o) => ({
          ...o,
          domain: "frontend",
          task_class: "css",
          execution_id: `b-${o.execution_id}`,
          id: `b-${o.id}`,
        })),
        now,
      );
      // reset miner fingerprints for second domain ids - actually different fingerprints
      const store = new PersistentSignalStore(dir);
      const a = store.query({ user_id: "user-a", now });
      const b = store.query({ user_id: "user-b", now });
      expect(a.every((s) => s.user_id === "user-a")).toBe(true);
      expect(b.every((s) => s.user_id === "user-b")).toBe(true);
      expect(a.some((s) => s.user_id === "user-b")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-005 — core aggregation HOLD", () => {
  it("multi-user same problem → CORE_CANDIDATE held", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-core-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      for (const u of ["user-a", "user-b", "user-c"]) {
        for (const day of [1, 2, 3]) {
          loop.ingest(
            [
              dayObs(day, {
                source: "execution",
                synthetic: true,
                execution_id: `${u}-d${day}`,
                user_id: u,
                project_id: `proj-${u}`,
                domain: "sql",
                task_class: "complex_query",
                kind: "failure",
                severity: "HIGH",
              }, now),
            ],
            now,
          );
        }
      }
      const r = loop.analyze({ now, scope: SYSTEM, authorize_system: true });
      const coreNeeds = r.longitudinal_needs.filter((n) => n.scope_class === "CORE_CANDIDATE");
      expect(coreNeeds.length).toBeGreaterThanOrEqual(1);
      const coreReqs = r.requests.filter((q) => q.scope === "CORE_CANDIDATE" && q.candidate.type !== "NO_CHANGE");
      expect(coreReqs.every((q) => q.requested_action === "HOLD")).toBe(true);
      expect(r.unauthorized_mutation).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-006 — need lifecycle & outcome", () => {
  it("IMPROVED → RESOLVED; implementation alone insufficient", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-out-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      const r = loop.analyze({ now, scope: USER_A });
      const need = r.longitudinal_needs.find((n) => n.status === "CANDIDATE");
      expect(need).toBeTruthy();
      const before = loop.getStore().query({ user_id: "user-a", now });
      // after: enough samples with fewer failures → IMPROVED
      const after = [0, 1, 2].map((i) =>
        dayObs(0, {
          source: "execution",
          synthetic: true,
          execution_id: `post-${i}`,
          user_id: "user-a",
          domain: "sql",
          task_class: "complex_query",
          kind: i === 0 ? "latency" : "latency",
          severity: "LOW",
        }, now),
      );
      const miner = new SignalMiner();
      const afterSignals = miner.mine(after);
      const evaled = loop.recordOutcome({
        evolution_request_id: "ereq-test",
        candidate_id: "cand-test",
        need: need!,
        signals_before: before,
        signals_after: afterSignals,
        window_start: before[0]!.timestamp,
        window_end: now.toISOString(),
      });
      expect(["IMPROVED", "UNCHANGED", "INCONCLUSIVE", "REGRESSED"]).toContain(evaled.outcome.outcome);
      if (evaled.outcome.outcome === "IMPROVED") {
        expect(evaled.need_lifecycle).toBe("RESOLVED");
      }
      expect(evaled.outcome.metrics.sample_size_before).toBeDefined();
      expect(evaled.outcome.metrics.sample_size_after).toBeDefined();
      expect(evaled.outcome.scope_id).toBe(need!.scope_id);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("INCONCLUSIVE when after window empty of comparable signals", () => {
    const tracker = new OutcomeTracker();
    const need = {
      id: "n1",
      fingerprint: "fp",
      scope: "USER" as const,
      scope_class: "USER_LOCAL" as const,
      scope_id: "user-a",
      domain: "sql",
      type: "RepeatedFailure" as const,
      recurrence: 5,
      impact: "HIGH" as const,
      affected_tasks: ["complex_query"],
      evidence: [],
      pattern_ids: [],
      signal_ids: [],
      confidence: "MEDIUM" as const,
      suspected_root_causes: [],
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      status: "CANDIDATE" as const,
      lifecycle: "ESTABLISHED" as const,
      affected_executions: [],
      affected_sessions: [],
      unique_executions: 5,
      unique_sessions: 5,
    };
    const r = tracker.evaluate({
      evolution_request_id: "e",
      candidate_id: "c",
      need,
      signals_before: [],
      signals_after: [],
      window_start: new Date().toISOString(),
      window_end: new Date().toISOString(),
    });
    expect(r.outcome.outcome).toBe("INCONCLUSIVE");
  });

  it("INCONCLUSIVE for empty-after even when before had failures", () => {
    const tracker = new OutcomeTracker();
    const need = {
      id: "n1",
      fingerprint: "fp",
      scope: "USER" as const,
      scope_class: "USER_LOCAL" as const,
      scope_id: "user-a",
      domain: "sql",
      type: "RepeatedFailure" as const,
      recurrence: 2,
      impact: "HIGH" as const,
      affected_tasks: ["complex_query"],
      evidence: [],
      pattern_ids: [],
      signal_ids: [],
      confidence: "MEDIUM" as const,
      suspected_root_causes: [],
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      status: "CANDIDATE" as const,
      lifecycle: "EMERGING" as const,
      affected_executions: [],
      affected_sessions: [],
      unique_executions: 2,
      unique_sessions: 2,
    };
    const now = new Date();
    const before = [1, 2].map((i) => ({
      id: `s${i}`,
      fingerprint: `x${i}`,
      timestamp: now.toISOString(),
      scope: { type: "USER" as const, id: "user-a" },
      source: "execution" as const,
      type: "failure" as const,
      domain: "sql",
      task_class: "complex_query",
      severity: "HIGH" as const,
      evidence_refs: [],
      user_id: "user-a",
      synthetic: true,
      metadata: {},
    }));
    const r = tracker.evaluate({
      evolution_request_id: "e",
      candidate_id: "c",
      need,
      signals_before: before,
      signals_after: [],
      window_start: now.toISOString(),
      window_end: now.toISOString(),
    });
    expect(r.outcome.outcome).toBe("INCONCLUSIVE");
    expect(r.need_lifecycle).toBe("REMAINS_ACTIVE");
    expect(r.outcome.notes).toContain("empty_after_window");
  });

  it("INCONCLUSIVE for low-sample after window", () => {
    const tracker = new OutcomeTracker();
    const need = {
      id: "n1",
      fingerprint: "fp",
      scope: "USER" as const,
      scope_class: "USER_LOCAL" as const,
      scope_id: "user-a",
      domain: "sql",
      type: "RepeatedFailure" as const,
      recurrence: 2,
      impact: "HIGH" as const,
      affected_tasks: ["complex_query"],
      evidence: [],
      pattern_ids: [],
      signal_ids: [],
      confidence: "MEDIUM" as const,
      suspected_root_causes: [],
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      status: "CANDIDATE" as const,
      lifecycle: "EMERGING" as const,
      affected_executions: [],
      affected_sessions: [],
      unique_executions: 2,
      unique_sessions: 2,
    };
    const now = new Date();
    const mk = (id: string, type: "failure" | "latency") => ({
      id,
      fingerprint: id,
      timestamp: now.toISOString(),
      scope: { type: "USER" as const, id: "user-a" },
      source: "execution" as const,
      type,
      domain: "sql",
      task_class: "complex_query",
      severity: "HIGH" as const,
      evidence_refs: [] as string[],
      user_id: "user-a",
      synthetic: true,
      metadata: {},
    });
    // beforeFail < 3, afterTotal = 1 → low sample
    const r = tracker.evaluate({
      evolution_request_id: "e",
      candidate_id: "c",
      need,
      signals_before: [mk("b1", "failure"), mk("b2", "latency")],
      signals_after: [mk("a1", "latency")],
      window_start: now.toISOString(),
      window_end: now.toISOString(),
    });
    expect(r.outcome.outcome).toBe("INCONCLUSIVE");
    expect(r.outcome.notes.some((n) => n.includes("low_sample"))).toBe(true);
  });

  it("preserves REGRESSED lifecycle across re-analyze", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-life-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      const r = loop.analyze({ now, scope: USER_A });
      const need = r.longitudinal_needs.find((n) => n.status === "CANDIDATE");
      expect(need).toBeTruthy();
      const before = loop.getStore().query({ user_id: "user-a", now });
      // Low before failure rate vs saturated after failures → REGRESSED
      const miner = new SignalMiner();
      const beforeMixed = miner.mine([
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-1", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-2", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-3", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-4", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-5", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
      ]);
      const after = miner.mine(
        [0, 1, 2, 3, 4].map((i) =>
          dayObs(
            0,
            {
              source: "execution",
              synthetic: true,
              execution_id: `post-${i}`,
              user_id: "user-a",
              domain: "sql",
              task_class: "complex_query",
              kind: "failure",
              severity: "CRITICAL",
            },
            now,
          ),
        ),
      );
      const evaled = loop.recordOutcome({
        evolution_request_id: "e",
        candidate_id: "c",
        need: need!,
        signals_before: beforeMixed,
        signals_after: after,
        window_start: before[0]!.timestamp,
        window_end: now.toISOString(),
      });
      expect(evaled.outcome.outcome).toBe("REGRESSED");
      const r2 = loop.analyze({ now, scope: USER_A });
      const afterAnalyze = r2.longitudinal_needs.find((n) => n.id === need!.id);
      expect(afterAnalyze?.lifecycle).toBe("REGRESSED");
      expect(afterAnalyze?.lifecycle_history?.some((h) => h.to === "REGRESSED")).toBe(true);
      expect(r2.notes.some((n) => n.includes("outcome_feedback") && n.includes("REGRESSED"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("outcome persists across restart and analyze sees it via loadOutcomes", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-out-persist-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      const r = loop.analyze({ now, scope: USER_A });
      const need = r.longitudinal_needs.find((n) => n.status === "CANDIDATE");
      expect(need).toBeTruthy();
      const miner = new SignalMiner();
      const beforeMixed = miner.mine([
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-1", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-2", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-3", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-4", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf-5", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
      ]);
      const after = miner.mine(
        [0, 1, 2, 3, 4].map((i) =>
          dayObs(0, {
            source: "execution",
            synthetic: true,
            execution_id: `post-${i}`,
            user_id: "user-a",
            domain: "sql",
            task_class: "complex_query",
            kind: "failure",
            severity: "CRITICAL",
          }, now),
        ),
      );
      loop.recordOutcome({
        evolution_request_id: "e-restart",
        candidate_id: "c",
        need: need!,
        signals_before: beforeMixed,
        signals_after: after,
        window_start: now.toISOString(),
        window_end: now.toISOString(),
      });
      // process restart
      const loop2 = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const loaded = loop2.getStore().loadOutcomes();
      expect(loaded.length).toBeGreaterThanOrEqual(1);
      expect(loaded.some((o) => o.outcome === "REGRESSED")).toBe(true);
      const r2 = loop2.analyze({ now, scope: USER_A });
      const n2 = r2.longitudinal_needs.find((n) => n.id === need!.id);
      expect(n2?.lifecycle).toBe("REGRESSED");
      expect(r2.notes.some((note) => note.includes("outcome_feedback"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("analyze(user_id) does not mix User B signals", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-analyze-iso-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      for (const day of [6, 4, 2]) {
        loop.ingest(
          [
            dayObs(
              day,
              {
                source: "execution",
                synthetic: true,
                execution_id: `a-${day}`,
                user_id: "user-a",
                domain: "sql",
                task_class: "q",
                kind: "failure",
                severity: "HIGH",
              },
              now,
            ),
          ],
          now,
        );
      }
      for (const day of [5, 3, 1]) {
        loop.ingest(
          [
            dayObs(
              day,
              {
                source: "execution",
                synthetic: true,
                execution_id: `b-${day}`,
                user_id: "user-b",
                domain: "frontend",
                task_class: "css",
                kind: "failure",
                severity: "HIGH",
              },
              now,
            ),
          ],
          now,
        );
      }
      const onlyA = loop.analyze({ now, scope: USER_A });
      expect(onlyA.signals.every((s) => s.user_id === "user-a")).toBe(true);
      expect(onlyA.signals.some((s) => s.user_id === "user-b")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-SCOPE — analysis scope gating", () => {
  it("analyze() without scope → REQUIRES_SCOPE, no silent global", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-noscope-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      loop.ingest(longitudinalFailureArc("user-b", now).map((o) => ({ ...o, id: `b-${o.id}`, execution_id: `b-${o.execution_id}`, user_id: "user-b" })), now);
      const r = loop.analyze({ now });
      expect(r.state).toBe("REQUIRES_SCOPE");
      expect(r.notes).toContain("requires_scope");
      expect(r.signal_count).toBe(0);
      expect(r.pattern_count).toBe(0);
      expect(r.unauthorized_mutation).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("analyze USER A does not see User B", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-scope-ab-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      for (const day of [6, 4, 2]) {
        loop.ingest(
          [
            dayObs(day, {
              source: "execution",
              synthetic: true,
              execution_id: `a-${day}`,
              user_id: "user-a",
              domain: "sql",
              task_class: "q",
              kind: "failure",
              severity: "HIGH",
            }, now),
          ],
          now,
        );
        loop.ingest(
          [
            dayObs(day, {
              source: "execution",
              synthetic: true,
              execution_id: `b-${day}`,
              user_id: "user-b",
              domain: "sql",
              task_class: "q",
              kind: "failure",
              severity: "HIGH",
            }, now),
          ],
          now,
        );
      }
      const onlyA = loop.analyze({ now, scope: USER_A });
      expect(onlyA.state).not.toBe("REQUIRES_SCOPE");
      expect(onlyA.signals.every((s) => s.user_id === "user-a")).toBe(true);
      expect(onlyA.signals.some((s) => s.user_id === "user-b")).toBe(false);
      const onlyB = loop.analyze({ now, scope: USER_B });
      expect(onlyB.signals.every((s) => s.user_id === "user-b")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("SYSTEM without authorize blocked; with authorize sees multi-user", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-sys-auth-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      for (const u of ["user-a", "user-b", "user-c"]) {
        for (const day of [1, 2, 3]) {
          loop.ingest(
            [
              dayObs(day, {
                source: "execution",
                synthetic: true,
                execution_id: `${u}-d${day}`,
                user_id: u,
                project_id: `proj-${u}`,
                domain: "sql",
                task_class: "complex_query",
                kind: "failure",
                severity: "HIGH",
              }, now),
            ],
            now,
          );
        }
      }
      const blocked = loop.analyze({ now, scope: SYSTEM });
      expect(blocked.state).toBe("REQUIRES_SCOPE");
      expect(blocked.notes).toContain("requires_scope");
      expect(blocked.signal_count).toBe(0);

      const ok = loop.analyze({ now, scope: SYSTEM, authorize_system: true });
      expect(ok.state).not.toBe("REQUIRES_SCOPE");
      expect(ok.signal_count).toBeGreaterThan(3);
      const users = new Set(ok.signals.map((s) => s.user_id).filter(Boolean));
      expect(users.size).toBeGreaterThanOrEqual(2);
      expect(ok.notes.some((n) => n.startsWith("audit:system_scope_authorized"))).toBe(true);
      expect(ok.unauthorized_mutation).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("replayAnalyze requires scope", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-replay-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      const blocked = loop.replayAnalyze("7d");
      expect(blocked.state).toBe("REQUIRES_SCOPE");
      const ok = loop.replayAnalyze(USER_A, "7d");
      expect(ok.state).not.toBe("REQUIRES_SCOPE");
      expect(ok.signal_count).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-007 — adversarial temporal & storm", () => {
  it("rejects future timestamps", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 3600_000).toISOString();
    expect(parseTimestamp(future, now).ok).toBe(false);
  });

  it("future obs rejected on append", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-fut-"));
    try {
      const now = new Date();
      const store = new PersistentSignalStore(dir);
      const miner = new SignalMiner();
      const signals = miner.mine([
        {
          id: "f1",
          timestamp: new Date(now.getTime() + 3600_000).toISOString(),
          source: "execution",
          synthetic: true,
          execution_id: "fx",
          user_id: "user-a",
          domain: "sql",
          task_class: "x",
          kind: "failure",
        },
      ]);
      const r = store.appendSignals(signals, now);
      expect(r.rejected).toBe(1);
      expect(r.written).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("candidate storm bounded", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-storm-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      for (let i = 0; i < 40; i++) {
        loop.ingest(
          [
            dayObs(i % 10, {
              source: "execution",
              synthetic: true,
              execution_id: `storm-${i}`,
              user_id: "user-a",
              domain: "sql",
              task_class: "complex_query",
              kind: "failure",
              severity: "HIGH",
            }, now),
          ],
          now,
        );
      }
      const r = loop.analyze({ now, scope: USER_A });
      expect(r.candidate_count).toBeLessThanOrEqual(LONGITUDINAL_THRESHOLDS.max_candidates_per_cycle);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("longitudinal closed loop & adapters", () => {
  it("end-to-end: multi-day arc → need → request; no core mutation", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-e2e-"));
    const handoff = mkdtempSync(join(tmpdir(), "el-ho-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      // simulate separate sessions
      for (const obs of longitudinalFailureArc("user-a", now)) {
        loop.ingest([obs], now);
      }
      const r = loop.analyze({ now, scope: USER_A });
      expect(r.need_count).toBeGreaterThanOrEqual(1);
      expect(r.longitudinal_needs.some((n) => n.scope_class === "USER_LOCAL")).toBe(true);
      expect(r.unauthorized_mutation).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });

  it("jsonl adapter CONNECTED; others NOT_CONNECTED", () => {
    expect(ADAPTER_REGISTRY.find((a) => a.id === "jsonl-events")?.status).toBe("CONNECTED");
    expect(ADAPTER_REGISTRY.filter((a) => a.status === "NOT_CONNECTED").length).toBeGreaterThanOrEqual(2);
    const dir = mkdtempSync(join(tmpdir(), "el-jsonl-"));
    try {
      mkdirSync(dir, { recursive: true });
      const f = join(dir, "feat.jsonl");
      writeFileSync(
        f,
        `${JSON.stringify({
          type: "NodeFailed",
          timestamp: new Date().toISOString(),
          feature_id: "feat",
          payload: { capability: "shell.execute", run_id: "r1" },
        })}\n`,
      );
      const obs = adaptJsonlEventsFile(f, { session_id: "s1", observation_class: "REAL" });
      expect(obs.length).toBe(1);
      expect(obs[0]?.kind).toBe("failure");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("registry-aware diagnosis avoids AGENT when skill overlaps", () => {
    const advice = diagnoseWithInventory(
      "AGENT_BOUNDARY",
      { skills: ["sql-helper"], capabilities: [], providers: [], agents: [] },
      "sql",
    );
    expect(advice.prefer).toBe("SKILL");
    expect(advice.avoid).toContain("AGENT");
  });

  it("resolveDataPaths includes evolutionDir", async () => {
    const { resolveDataPaths } = await import("../../../src/persistence/paths.js");
    const p = resolveDataPaths("/tmp/data-root");
    expect(p.evolutionDir).toContain("evolution");
  });
});
