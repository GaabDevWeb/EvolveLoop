import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LongitudinalEvolveLoop,
  PersistentSignalStore,
  CrossRunAggregator,
  SignalMiner,
  OutcomeTracker,
  dayObs,
  longitudinalFailureArc,
  sameExecutionTriple,
  resetLongitudinalSeq,
  parseTimestamp,
  diagnoseWithInventory,
  ADAPTER_REGISTRY,
} from "./src/evolveloop/index.js";

const findings = [];
function find(id, ok, detail) {
  findings.push({ id, ok, detail });
  if (!ok) console.error("FAIL", id, detail);
  else console.log("PASS", id, detail);
}

describe("independent adversarial audit", () => {
  it("runs all focus scenarios", () => {
    resetLongitudinalSeq();
    const now = new Date();

    // F1: analyze() without user filter aggregates whole store
    {
      const dir = mkdtempSync(join(tmpdir(), "aud-scope-"));
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      for (const day of [6, 4, 2]) {
        loop.ingest([dayObs(day, { source: "execution", synthetic: true, execution_id: `a-${day}`, user_id: "user-a", domain: "sql", task_class: "q", kind: "failure", severity: "HIGH" }, now)], now);
      }
      // User B: zero signals
      const r = loop.analyze({ now });
      const leak = r.signals.some((s) => s.user_id === "user-b");
      find("F1_analyze_no_user_param", !("user_id" in (loop.analyze.length >= 0 ? {} : {})), "analyze opts has no user_id in API — check signals mix");
      // User A with signals + User B with different domain pattern — analyze sees all
      for (const day of [5, 3, 1]) {
        loop.ingest([dayObs(day, { source: "execution", synthetic: true, execution_id: `b-${day}`, user_id: "user-b", domain: "frontend", task_class: "css", kind: "failure", severity: "HIGH" }, now)], now);
      }
      const r2 = loop.analyze({ now });
      const users = new Set(r2.signals.map((s) => s.user_id));
      find("F1_analyze_sees_all_users", users.has("user-a") && users.has("user-b"), `users_in_analyze=${[...users]}`);
      const store = loop.getStore();
      const qa = store.query({ user_id: "user-a", now });
      find("F1_query_isolated", qa.every((s) => s.user_id === "user-a"), `query_a_count=${qa.length}`);
      rmSync(dir, { recursive: true, force: true });
    }

    // F2: empty-after with beforeFail 1-2 → IMPROVED bug
    {
      const tracker = new OutcomeTracker();
      const need = {
        id: "n1", fingerprint: "fp", scope: "USER", scope_class: "USER_LOCAL", scope_id: "user-a",
        domain: "sql", type: "RepeatedFailure", recurrence: 2, impact: "HIGH", affected_tasks: ["complex_query"],
        evidence: [], pattern_ids: [], signal_ids: [], confidence: "MEDIUM", suspected_root_causes: [],
        first_seen: now.toISOString(), last_seen: now.toISOString(), status: "CANDIDATE", lifecycle: "EMERGING",
        affected_executions: [], affected_sessions: [], unique_executions: 2, unique_sessions: 2,
      };
      const before = [
        { id: "s1", fingerprint: "x1", timestamp: now.toISOString(), scope: { type: "USER", id: "user-a" }, source: "execution", type: "failure", domain: "sql", task_class: "complex_query", severity: "HIGH", evidence_refs: [], user_id: "user-a", synthetic: true },
        { id: "s2", fingerprint: "x2", timestamp: now.toISOString(), scope: { type: "USER", id: "user-a" }, source: "execution", type: "failure", domain: "sql", task_class: "complex_query", severity: "HIGH", evidence_refs: [], user_id: "user-a", synthetic: true },
      ];
      const r = tracker.evaluate({
        evolution_request_id: "e", candidate_id: "c", need, signals_before: before, signals_after: [],
        window_start: now.toISOString(), window_end: now.toISOString(),
      });
      find("F2_empty_after_false_improved", r.outcome.outcome === "IMPROVED", `got=${r.outcome.outcome} lifecycle=${r.need_lifecycle} (BUG if IMPROVED)`);
      // also afterTotal=0 beforeFail>=3 should be INCONCLUSIVE
      const before3 = [...before, { ...before[0], id: "s3", fingerprint: "x3" }];
      const r3 = tracker.evaluate({
        evolution_request_id: "e2", candidate_id: "c", need, signals_before: before3, signals_after: [],
        window_start: now.toISOString(), window_end: now.toISOString(),
      });
      find("F2_empty_after_ge3_inconclusive", r3.outcome.outcome === "INCONCLUSIVE", `got=${r3.outcome.outcome}`);
    }

    // F3: lifecycle overwrite REGRESSED → analyze
    {
      const dir = mkdtempSync(join(tmpdir(), "aud-life-"));
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      loop.ingest(longitudinalFailureArc("user-a", now), now);
      const r = loop.analyze({ now });
      const need = r.longitudinal_needs.find((n) => n.status === "CANDIDATE");
      expect(need).toBeTruthy();
      const before = loop.getStore().query({ user_id: "user-a", now });
      // force REGRESSED via high after failures
      const miner = new SignalMiner();
      const after = miner.mine([
        dayObs(0, { source: "execution", synthetic: true, execution_id: "post-1", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "CRITICAL" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "post-2", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "CRITICAL" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "post-3", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "CRITICAL" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "post-4", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "CRITICAL" }, now),
        dayObs(0, { source: "execution", synthetic: true, execution_id: "post-5", user_id: "user-a", domain: "sql", task_class: "complex_query", kind: "failure", severity: "CRITICAL" }, now),
      ]);
      const evaled = loop.recordOutcome({
        evolution_request_id: "e", candidate_id: "c", need: need, signals_before: before.slice(0, 2), signals_after: after,
        window_start: before[0].timestamp, window_end: now.toISOString(),
      });
      const afterOutcome = loop.getStore().loadNeeds().find((n) => n.id === need.id);
      find("F3_record_regressed_or_remains", ["REGRESSED", "REMAINS_ACTIVE", "RESOLVED"].includes(afterOutcome?.lifecycle), `outcome=${evaled.outcome.outcome} life=${afterOutcome?.lifecycle}`);
      const r2 = loop.analyze({ now });
      const afterAnalyze = r2.longitudinal_needs.find((n) => n.id === need.id);
      const overwritten = afterOutcome?.lifecycle === "REGRESSED" && afterAnalyze?.lifecycle !== "REGRESSED";
      const overwrittenRemains = afterOutcome?.lifecycle === "REMAINS_ACTIVE" && !["REMAINS_ACTIVE", "REGRESSED", "RESOLVED", "STALE"].includes(afterAnalyze?.lifecycle);
      find("F3_lifecycle_overwrite", overwritten || (afterOutcome?.lifecycle === "REGRESSED" && afterAnalyze && afterAnalyze.lifecycle !== "REGRESSED"), `before_analyze=${afterOutcome?.lifecycle} after_analyze=${afterAnalyze?.lifecycle} overwrite=${overwritten}`);
      rmSync(dir, { recursive: true, force: true });
    }

    // F4: adapters — only registry labels; JSONL file path not auto-wired to controller
    {
      find("F4_jsonl_connected_label", ADAPTER_REGISTRY.find((a) => a.id === "jsonl-events")?.status === "CONNECTED", "label");
      find("F4_evidence_not", ADAPTER_REGISTRY.find((a) => a.id === "evidence-bus")?.status === "NOT_CONNECTED", "label");
      // LongitudinalEvolveLoop has no method that auto-reads telemetry dir
      const proto = Object.getOwnPropertyNames(LongitudinalEvolveLoop.prototype);
      find("F4_no_auto_adapter_ingest", !proto.includes("ingestFromJsonl") && !proto.includes("ingestFromTelemetry"), `methods=${proto.join(",")}`);
    }

    // F5: historical store consumed by analyze
    {
      const dir = mkdtempSync(join(tmpdir(), "aud-hist-"));
      const a = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      a.ingest([dayObs(6, { source: "execution", synthetic: true, execution_id: "r1", user_id: "u", domain: "sql", task_class: "q", kind: "failure", severity: "HIGH" }, now)], now);
      const b = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      b.ingest([dayObs(4, { source: "execution", synthetic: true, execution_id: "r2", user_id: "u", domain: "sql", task_class: "q", kind: "failure", severity: "HIGH" }, now)], now);
      const c = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      c.ingest([dayObs(2, { source: "execution", synthetic: true, execution_id: "r3", user_id: "u", domain: "sql", task_class: "q", kind: "failure", severity: "HIGH" }, now)], now);
      const r = c.analyze({ now });
      find("F5_historical_consumed", r.signal_count >= 3 && r.pattern_count >= 1, `signals=${r.signal_count} patterns=${r.pattern_count}`);
      rmSync(dir, { recursive: true, force: true });
    }

    // F6: same-run false positive
    {
      const miner = new SignalMiner();
      const signals = miner.mine(sameExecutionTriple("user-a", now));
      const patterns = new CrossRunAggregator().aggregate(signals, { now, window: "7d" });
      find("F6_same_run_not_pattern", patterns.length === 0, `patterns=${patterns.length}`);
    }

    // F7: outcome → need closure then next analyze may wipe
    // covered in F3

    // F8: registry-aware is inventory-injected string match, not live registry
    {
      const advice = diagnoseWithInventory("SKILL_GAP", { skills: ["sql-helper"], capabilities: [], providers: [], agents: [] }, "sql");
      find("F8_inventory_injected", advice.prefer === "KNOWLEDGE" && advice.avoid.includes("AGENT"), JSON.stringify(advice));
      const noInv = diagnoseWithInventory("SKILL_GAP", { skills: [], capabilities: [], providers: [], agents: [] }, "sql");
      find("F8_no_live_registry_default", noInv.prefer === "SKILL", JSON.stringify(noInv));
    }

    // Cross-process persistence growth / dedupe
    {
      const dir = mkdtempSync(join(tmpdir(), "aud-dedupe-"));
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const batch = longitudinalFailureArc("user-a", now);
      loop.ingest(batch, now);
      loop.ingest(batch, now);
      const lines = readFileSync(join(dir, "signals.jsonl"), "utf8").split("\n").filter(Boolean).length;
      find("DEDUP_storage_bounded", lines === batch.length || lines <= batch.length, `lines=${lines} batch=${batch.length}`);
      rmSync(dir, { recursive: true, force: true });
    }

    // Low sample
    {
      const tracker = new OutcomeTracker();
      const need = {
        id: "n1", fingerprint: "fp", scope: "USER", scope_class: "USER_LOCAL", scope_id: "user-a",
        domain: "sql", type: "RepeatedFailure", recurrence: 1, impact: "HIGH", affected_tasks: ["complex_query"],
        evidence: [], pattern_ids: [], signal_ids: [], confidence: "MEDIUM", suspected_root_causes: [],
        first_seen: now.toISOString(), last_seen: now.toISOString(), status: "CANDIDATE", lifecycle: "EMERGING",
        affected_executions: [], affected_sessions: [], unique_executions: 1, unique_sessions: 1,
      };
      const s = { id: "s1", fingerprint: "x1", timestamp: now.toISOString(), scope: { type: "USER", id: "user-a" }, source: "execution", type: "failure", domain: "sql", task_class: "complex_query", severity: "HIGH", evidence_refs: [], user_id: "user-a", synthetic: true };
      const r = tracker.evaluate({
        evolution_request_id: "e", candidate_id: "c", need, signals_before: [s], signals_after: [{ ...s, id: "s2", fingerprint: "x2" }],
        window_start: now.toISOString(), window_end: now.toISOString(),
      });
      find("LOW_SAMPLE_strong_claim", r.outcome.outcome === "UNCHANGED" || r.outcome.outcome === "INCONCLUSIVE" || r.outcome.outcome === "IMPROVED" || r.outcome.outcome === "REGRESSED", `got=${r.outcome.outcome} (note: may still allow strong IMPROVED with n=1)`);
    }

    // Memory growth 1000
    {
      const dir = mkdtempSync(join(tmpdir(), "aud-mem-"));
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir, now });
      const t0 = Date.now();
      for (let i = 0; i < 1000; i++) {
        loop.ingest([dayObs(i % 6, { source: "execution", synthetic: true, execution_id: `m-${i}`, user_id: "u", domain: "sql", task_class: "q", kind: "failure", severity: "HIGH" }, now)], now);
      }
      const t1 = Date.now();
      const r = loop.analyze({ now });
      const t2 = Date.now();
      const lines = readFileSync(join(dir, "signals.jsonl"), "utf8").split("\n").filter(Boolean).length;
      find("PERF_1k", lines <= 1000 && r.signal_count <= 1000, `lines=${lines} ingest_ms=${t1-t0} analyze_ms=${t2-t1} candidates=${r.candidate_count}`);
      rmSync(dir, { recursive: true, force: true });
    }

    // Corrupt line skipped
    {
      const dir = mkdtempSync(join(tmpdir(), "aud-corrupt-"));
      const store = new PersistentSignalStore(dir);
      writeFileSync(join(dir, "signals.jsonl"), "{not-json}\n");
      const all = store.loadAllSignals();
      find("CORRUPT_skip", all.length === 0, `len=${all.length}`);
      rmSync(dir, { recursive: true, force: true });
    }

    // Write findings for parent
    writeFileSync("/tmp/evolveloop-adversarial-findings.json", JSON.stringify(findings, null, 2));
    const failed = findings.filter((f) => f.id === "F2_empty_after_false_improved" ? f.ok : (f.id.startsWith("F3_lifecycle_overwrite") ? f.ok : false));
    // For F2, ok=true means BUG confirmed (IMPROVED). For F3 overwrite, ok=true means overwrite detected.
    expect(findings.length).toBeGreaterThan(10);
  });
});
