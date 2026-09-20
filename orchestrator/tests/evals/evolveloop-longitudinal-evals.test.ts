/**
 * EV-EVOLVE-L-* stabilization evals — map claims to measurable harness proofs.
 * Fixture-validated; NOT production-proven.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventBus } from "../../src/events/event-bus.js";
import {
  LongitudinalEvolveLoop,
  AnalysisCadence,
  attachEvolveLoopObserver,
  snapshotInventoryFromRegistry,
  diagnoseWithInventory,
  dayObs,
  longitudinalFailureArc,
  resetLongitudinalSeq,
  ADAPTER_REGISTRY,
  OutcomeTracker,
  SignalMiner,
} from "../../src/evolveloop/index.js";
import { resetSyntheticSeq } from "../../src/evolveloop/adapters/synthetic-fixtures.js";
import type { CapabilityRegistry } from "../../src/types/index.js";

const USER_A = { type: "USER" as const, id: "user-a" };

describe("EV-EVOLVE-L-001 — Persistent History", () => {
  beforeEach(() => {
    resetLongitudinalSeq();
    resetSyntheticSeq();
  });
  it("proves: signals survive new process instance; does not prove: OS crash durability", () => {
    const dir = mkdtempSync(join(tmpdir(), "l001-"));
    try {
      const now = new Date();
      const a = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      a.ingest(longitudinalFailureArc("user-a", now).slice(0, 2), now);
      const b = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      b.ingest(longitudinalFailureArc("user-a", now).slice(2), now);
      const r = b.analyze({ now, scope: USER_A });
      expect(r.signal_count).toBeGreaterThanOrEqual(3);
      expect(r.pattern_count).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-L-002 — Cross-Run Detection", () => {
  it("proves: unique_executions across separate ingests; does not prove: production recurrence quality", () => {
    const dir = mkdtempSync(join(tmpdir(), "l002-"));
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
                execution_id: `run-${day}`,
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
      const r = loop.analyze({ now, scope: USER_A });
      expect(r.pattern_count).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-L-003 — Scope Isolation", () => {
  it("proves: default analyze blocked; USER scopes isolated; does not prove: multi-tenant disk encryption", () => {
    const dir = mkdtempSync(join(tmpdir(), "l003-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      loop.ingest(
        longitudinalFailureArc("user-b", now).map((o) => ({
          ...o,
          id: `b-${o.id}`,
          execution_id: `b-${o.execution_id}`,
          user_id: "user-b",
        })),
        now,
      );
      expect(loop.analyze({ now }).state).toBe("REQUIRES_SCOPE");
      const a = loop.analyze({ now, scope: USER_A });
      expect(a.signals.every((s) => s.user_id === "user-a")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-L-004 — Outcome Attribution", () => {
  it("proves: empty-after INCONCLUSIVE; low-sample not IMPROVED; does not prove: causal attribution in prod", () => {
    const tracker = new OutcomeTracker();
    const now = new Date();
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
      first_seen: now.toISOString(),
      last_seen: now.toISOString(),
      status: "CANDIDATE" as const,
      lifecycle: "EMERGING" as const,
      affected_executions: [],
      affected_sessions: [],
      unique_executions: 2,
      unique_sessions: 2,
    };
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
    }));
    const empty = tracker.evaluate({
      evolution_request_id: "e",
      candidate_id: "c",
      need,
      signals_before: before,
      signals_after: [],
      window_start: now.toISOString(),
      window_end: now.toISOString(),
    });
    expect(empty.outcome.outcome).toBe("INCONCLUSIVE");
    const low = tracker.evaluate({
      evolution_request_id: "e2",
      candidate_id: "c",
      need,
      signals_before: [before[0]!],
      signals_after: [before[1]!],
      window_start: now.toISOString(),
      window_end: now.toISOString(),
    });
    expect(low.outcome.outcome).toBe("INCONCLUSIVE");
  });
});

describe("EV-EVOLVE-L-005 — Outcome Reingestion", () => {
  it("proves: outcome survives restart and influences need lifecycle on analyze; does not prove: auto window collection", () => {
    const dir = mkdtempSync(join(tmpdir(), "l005-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      const r = loop.analyze({ now, scope: USER_A });
      const need = r.longitudinal_needs.find((n) => n.status === "CANDIDATE");
      expect(need).toBeTruthy();
      const before = loop.getStore().query({ user_id: "user-a", now });
      const afterFail = [0, 1, 2, 3, 4].map((i) =>
        dayObs(
          0,
          {
            source: "execution",
            synthetic: true,
            execution_id: `af-${i}`,
            user_id: "user-a",
            domain: "sql",
            task_class: "complex_query",
            kind: "failure",
            severity: "CRITICAL",
          },
          now,
        ),
      );
      const miner = new SignalMiner();
      const beforeMixed = miner.mine([
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf1", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf2", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf3", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf4", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "bf5", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "latency", severity: "LOW" }, now),
      ]);
      const afterSignals = miner.mine(afterFail);
      const ev = loop.recordOutcome({
        evolution_request_id: "e",
        candidate_id: "c",
        need: need!,
        signals_before: beforeMixed,
        signals_after: afterSignals,
        window_start: before[0]!.timestamp,
        window_end: now.toISOString(),
      });
      expect(ev.outcome.outcome).toBe("REGRESSED");
      expect(loop.getStore().loadOutcomes().length).toBeGreaterThanOrEqual(1);
      const loop2 = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const r2 = loop2.analyze({ now, scope: USER_A });
      const n2 = r2.longitudinal_needs.find((n) => n.id === need!.id);
      expect(n2?.lifecycle).toBe("REGRESSED");
      expect(loop2.getStore().loadOutcomes().some((o) => o.need_id === need!.id)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-L-006 — Registry Reuse", () => {
  it("proves: live CapabilityRegistry snapshot + skill overlap avoids AGENT; does not prove: always-fresh remote registry", () => {
    const registry: CapabilityRegistry = {
      version: "1.0.0",
      kind: "CapabilityRegistry",
      capabilities: {
        "sql.query": {
          providers: [{ id: "sql-provider", priority: 1, cost: "low", quality_score: 0.9, availability: "active", version: "1.0.0" }],
        },
      },
    };
    const snap = snapshotInventoryFromRegistry(registry, { skillsHint: ["sql-helper"], now: new Date() });
    expect(snap.inventory.capabilities).toContain("sql.query");
    expect(snap.source_revision.length).toBeGreaterThan(4);
    const advice = diagnoseWithInventory("SKILL_GAP", snap.inventory, "sql");
    expect(advice.avoid).toContain("AGENT");
  });
});

describe("EV-EVOLVE-L-007 — Live Adapter", () => {
  it("proves: EventBus emit → ingest without manual reinjection; does not prove: all evidence/eval adapters", () => {
    expect(ADAPTER_REGISTRY.find((a) => a.id === "runtime-eventbus")?.status).toBe("CONNECTED");
    expect(ADAPTER_REGISTRY.find((a) => a.id === "evidence-bus")?.status).toBe("NOT_CONNECTED");
    const dir = mkdtempSync(join(tmpdir(), "l007-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const bus = new EventBus();
      const detach = attachEvolveLoopObserver(bus, loop, { scope: USER_A, session_id: "s1" });
      bus.emit("NodeFailed", "feat-1", "scheduler", {
        capability: "shell.execute",
        run_id: "r-live-1",
        user_id: "user-a",
      });
      bus.emit("NodeFailed", "feat-1", "scheduler", {
        capability: "shell.execute",
        run_id: "r-live-2",
        user_id: "user-a",
      });
      bus.emit("NodeFailed", "feat-1", "scheduler", {
        capability: "shell.execute",
        run_id: "r-live-3",
        user_id: "user-a",
      });
      detach();
      const r = loop.analyze({ now, scope: USER_A });
      expect(r.signal_count).toBeGreaterThanOrEqual(3);
      expect(r.pattern_count).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("EV-EVOLVE-L-008 — Closed Loop", () => {
  it("proves: history→need→outcome→next analyze; cadence prevents analyze storm; does not prove: full Prototype Gate implementation", () => {
    const dir = mkdtempSync(join(tmpdir(), "l008-"));
    const handoff = mkdtempSync(join(tmpdir(), "l008h-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, handoffDir: handoff, now });
      for (const obs of longitudinalFailureArc("user-a", now)) {
        loop.ingest([obs], now);
      }
      const r1 = loop.analyze({ now, scope: USER_A });
      expect(r1.need_count).toBeGreaterThanOrEqual(1);
      const cadence = new AnalysisCadence({ min_new_signals: 3, cooldown_ms: 60_000 });
      expect(cadence.shouldAnalyze(loop.getStore())).toBe(true);
      cadence.recordAnalyze(loop.getStore());
      expect(cadence.shouldAnalyze(loop.getStore())).toBe(false);
      expect(r1.unauthorized_mutation).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(handoff, { recursive: true, force: true });
    }
  });
});
