import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EvolveLoopController,
  SyntheticFixtures,
  resetSyntheticSeq,
  SignalMiner,
  PatternDetector,
  NeedDetector,
  EVOLVE_THRESHOLDS,
} from "../../../src/evolveloop/index.js";

describe("EvolveLoop — unit & behavioral", () => {
  beforeEach(() => {
    resetSyntheticSeq();
  });

  it("mines signals without creating needs", () => {
    const miner = new SignalMiner();
    const signals = miner.mine(SyntheticFixtures.repeatedFailure());
    expect(signals.length).toBe(3);
    expect(signals.every((s) => s.synthetic)).toBe(true);
  });

  it("deduplicates identical logical signals", () => {
    const miner = new SignalMiner();
    const obs = SyntheticFixtures.singleIsolatedFailure();
    const a = miner.mine(obs);
    const b = miner.mine(obs);
    expect(a.length).toBe(1);
    expect(b.length).toBe(0);
  });

  it("FALSE POSITIVE: one-off failure → no pattern / no need", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.singleIsolatedFailure());
    expect(r.pattern_count).toBe(0);
    expect(r.need_count).toBe(0);
    expect(r.submitted_count).toBe(0);
    expect(r.unauthorized_mutation).toBe(false);
  });

  it("FALSE NEGATIVE guard: repeated failure → need detected", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.repeatedFailure());
    expect(r.signal_count).toBeGreaterThanOrEqual(EVOLVE_THRESHOLDS.min_need_signals);
    expect(r.pattern_count).toBeGreaterThanOrEqual(1);
    expect(r.need_count).toBeGreaterThanOrEqual(1);
    expect(r.needs[0]?.scope_class).toBe("USER_LOCAL");
  });

  it("USER_LOCAL scope preserved for single-user pattern", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.skillGap());
    expect(r.patterns.every((p) => p.scope_class === "USER_LOCAL" || p.scope === "USER")).toBe(true);
    expect(r.needs.every((n) => n.scope_class === "USER_LOCAL")).toBe(true);
  });

  it("CORE_CANDIDATE classification without auto-deploy", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.coreAggregate());
    const core = r.patterns.filter((p) => p.scope_class === "CORE_CANDIDATE");
    expect(core.length).toBeGreaterThanOrEqual(1);
    expect(r.unauthorized_mutation).toBe(false);
    expect(r.requests.every((q) => q.mutates_runtime === false && q.mutates_core === false)).toBe(true);
    const coreReqs = r.requests.filter((q) => q.scope === "CORE_CANDIDATE" && q.candidate.type !== "NO_CHANGE");
    expect(coreReqs.every((q) => q.requested_action === "HOLD")).toBe(true);
  });

  it("idempotent: same observations twice → no need explosion", () => {
    const ctrl = new EvolveLoopController();
    const obs = SyntheticFixtures.repeatedFailure();
    const r1 = ctrl.run(obs);
    const r2 = ctrl.run(obs);
    expect(r1.need_count).toBeGreaterThanOrEqual(1);
    // second pass: signals deduped → no new patterns from empty new signals
    expect(r2.signal_count).toBe(0);
  });

  it("root cause: skill gap vs capability gap not collapsed", () => {
    const ctrl = new EvolveLoopController();
    const skill = ctrl.run(SyntheticFixtures.skillGap());
    ctrl.reset();
    resetSyntheticSeq();
    const cap = ctrl.run(SyntheticFixtures.capabilityGap());
    const skillPrimary = skill.root_causes[0]?.primary;
    const capPrimary = cap.root_causes[0]?.primary;
    expect(skillPrimary).toBe("SKILL_GAP");
    expect(capPrimary).toBe("CAPABILITY_GAP");
    expect(skillPrimary).not.toBe(capPrimary);
  });

  it("candidate types: SKILL preferred path includes NO_CHANGE alternative", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.skillGap());
    const types = new Set(r.candidates.map((c) => c.type));
    expect(types.has("SKILL") || types.has("NO_CHANGE")).toBe(true);
    // generator always emits NO_CHANGE alt for non-no-change primary needs
    expect(r.candidates.some((c) => c.type === "NO_CHANGE") || r.requests.some((q) => q.requested_action === "NO_CHANGE")).toBe(true);
  });

  it("AGENT candidate lists SKILL alternative (agent vs skill)", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.humanIntervention());
    const agent = r.candidates.find((c) => c.type === "AGENT");
    if (agent) {
      expect(agent.alternatives).toContain("SKILL");
    } else {
      // may validate only NO_CHANGE depending on confidence — still must not mutate
      expect(r.unauthorized_mutation).toBe(false);
    }
  });

  it("capability gap → CAPABILITY candidate not AGENT", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.capabilityGap());
    const primary = r.candidates.find((c) => c.type !== "NO_CHANGE");
    expect(primary?.type).toBe("CAPABILITY");
  });

  it("NO_CHANGE for insufficient evidence path", () => {
    const detector = new NeedDetector();
    const patterns = new PatternDetector().detect(new SignalMiner().mine(SyntheticFixtures.singleIsolatedFailure()));
    expect(patterns.length).toBe(0);
    expect(detector.detect(patterns).length).toBe(0);
  });

  it("end-to-end synthetic → handoff without mutation", () => {
    const dir = mkdtempSync(join(tmpdir(), "evolveloop-"));
    try {
      const ctrl = new EvolveLoopController({ handoffDir: dir });
      const r = ctrl.run(SyntheticFixtures.endToEndBundle());
      expect(r.signal_count).toBeGreaterThanOrEqual(3);
      expect(r.unauthorized_mutation).toBe(false);
      if (r.submitted_count > 0) {
        const files = readdirSync(dir).filter((f) => f.startsWith("ereq-"));
        expect(files.length).toBeGreaterThanOrEqual(1);
      }
      // Core unchanged: no runtime flags
      expect(r.requests.every((q) => q.autonomy_ceiling === "PROPOSE")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("policy block → POLICY or NO_CHANGE, not silent evolve", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.policyBlock());
    expect(r.unauthorized_mutation).toBe(false);
    const types = r.candidates.map((c) => c.type);
    expect(types.every((t) => t === "POLICY" || t === "NO_CHANGE" || t === "DOCUMENTATION")).toBe(true);
  });

  it("max loop depth blocks recursion", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.repeatedFailure(), { depth: 99 });
    expect(r.state).toBe("BLOCKED");
    expect(r.notes).toContain("max_loop_depth_exceeded");
  });

  it("provenance chain ids navigable", () => {
    const ctrl = new EvolveLoopController();
    const r = ctrl.run(SyntheticFixtures.repeatedFailure());
    const need = r.needs.find((n) => n.status === "CANDIDATE");
    expect(need).toBeTruthy();
    expect(need!.signal_ids.length).toBeGreaterThanOrEqual(3);
    expect(need!.pattern_ids.length).toBeGreaterThanOrEqual(1);
    const cand = r.candidates.find((c) => c.need_id === need!.id);
    expect(cand?.evidence.length).toBeGreaterThan(0);
  });
});

describe("EV-EVOLVE-001", () => {
  beforeEach(() => resetSyntheticSeq());

  it("criteria: signal→pattern→need→rca→candidate→handoff; no unauthorized mutation", () => {
    const dir = mkdtempSync(join(tmpdir(), "ev-evolve-001-"));
    try {
      const ctrl = new EvolveLoopController({ handoffDir: dir });
      const r = ctrl.run([
        ...SyntheticFixtures.repeatedFailure("user-a", "sql", 3),
        ...SyntheticFixtures.humanIntervention().map((o, i) => ({
          ...o,
          domain: "sql",
          task_class: "complex_query",
          user_id: "user-a",
          execution_id: `exec-mixed-hitl-${i}`,
        })),
      ]);

      expect(r.signal_count).toBeGreaterThan(0);
      expect(r.pattern_count).toBeGreaterThan(0);
      expect(r.need_count).toBeGreaterThan(0);
      expect(r.root_causes.length).toBeGreaterThan(0);
      expect(r.candidate_count).toBeGreaterThan(0);
      expect(r.needs.every((n) => n.scope_class === "USER_LOCAL" || n.scope_class === "CORE_CANDIDATE")).toBe(true);
      expect(r.candidates.every((c) => c.evidence.length > 0 && c.rollback && c.eval_strategy)).toBe(true);
      expect(r.unauthorized_mutation).toBe(false);
      expect(r.requests.every((q) => q.mutates_core === false)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
