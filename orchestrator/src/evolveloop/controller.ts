import { createHash } from "node:crypto";
import { SignalMiner } from "./signal-miner.js";
import { PatternDetector } from "./pattern-detector.js";
import { NeedDetector } from "./need-detector.js";
import { RootCauseAnalyzer } from "./root-cause.js";
import { EvolutionCandidateGenerator } from "./candidate-generator.js";
import { CandidateValidator, buildEvolutionRequest } from "./candidate-validator.js";
import { submitEvolutionRequest } from "./handoff/evolution-request.js";
import { EvolveLoopStore } from "./store.js";
import type { EvolveLoopRunResult, LoopState, RawObservation } from "./types.js";
import { EVOLVE_THRESHOLDS } from "./types.js";

export interface EvolveLoopOptions {
  handoffDir?: string;
  store?: EvolveLoopStore;
  now?: Date;
  depth?: number;
}

/**
 * EvolveLoop Controller — closes observe→detect→propose→handoff.
 * NEVER mutates runtime/skills/policy/core directly.
 */
export class EvolveLoopController {
  private readonly miner = new SignalMiner();
  private readonly patterns = new PatternDetector();
  private readonly needs = new NeedDetector();
  private readonly rca = new RootCauseAnalyzer();
  private readonly candidates = new EvolutionCandidateGenerator();
  private readonly validator = new CandidateValidator();

  constructor(private readonly options: EvolveLoopOptions = {}) {}

  reset(): void {
    this.miner.reset();
    this.needs.reset();
    this.candidates.reset();
  }

  run(observations: RawObservation[], opts?: EvolveLoopOptions): EvolveLoopRunResult {
    const options = { ...this.options, ...opts };
    const depth = options.depth ?? 0;
    const notes: string[] = [];
    let state: LoopState = "OBSERVING";

    if (depth > EVOLVE_THRESHOLDS.max_loop_depth) {
      return emptyResult("BLOCKED", ["max_loop_depth_exceeded"]);
    }

    state = "SIGNALING";
    const signals = this.miner.mine(observations);

    state = "ANALYZING";
    const patterns = this.patterns.detect(signals, options.now ?? new Date());

    const signalMap = new Map(signals.map((s) => [s.id, { source: s.source }]));
    const needs = this.needs.detect(patterns, signalMap);
    const activeNeeds = needs.filter((n) => n.status === "CANDIDATE");
    if (activeNeeds.length === 0) {
      state = needs.some((n) => n.status === "INSUFFICIENT_EVIDENCE")
        ? "INSUFFICIENT_EVIDENCE"
        : "OBSERVING";
      notes.push("no_need_candidate_or_insufficient_evidence");
    } else {
      state = "NEED_DETECTED";
    }

    if (activeNeeds.length) state = "ROOT_CAUSE_ANALYSIS";

    const rootCauses = needs.map((n) => this.rca.analyze(n, patterns));

    const allCandidates = [];
    for (const need of needs) {
      const rca = rootCauses.find((r) => r.need_id === need.id);
      if (!rca) continue;
      allCandidates.push(...this.candidates.generate(need, rca));
    }

    if (allCandidates.length) state = "CANDIDATE_GENERATED";

    let blocked = 0;
    let rejected = 0;
    let submitted = 0;
    const validated = [];
    const requests = [];

    for (const cand of allCandidates) {
      const need = needs.find((n) => n.id === cand.need_id);
      const rca = rootCauses.find((r) => r.need_id === cand.need_id);
      if (!need || !rca) {
        blocked += 1;
        continue;
      }
      const v = this.validator.validate(cand, need, rca);
      if (!v.ok) {
        if (v.status === "REJECTED") rejected += 1;
        else blocked += 1;
        notes.push(`candidate_${cand.id}_${v.status}:${v.reasons.join(",")}`);
        continue;
      }
      validated.push(v.candidate);
      state = "CANDIDATE_VALIDATED";

      const req = buildEvolutionRequest(need, rca, v.candidate, need.pattern_ids);
      requests.push(req);

      if (options.handoffDir && req.requested_action === "SUBMIT_TO_PROTOTYPE_GATE") {
        submitEvolutionRequest(req, options.handoffDir);
        submitted += 1;
        state = "EVOLUTION_SUBMITTED";
      } else if (options.handoffDir && req.requested_action === "HOLD") {
        submitEvolutionRequest(req, options.handoffDir);
        notes.push(`core_candidate_held_${need.id}`);
      } else if (req.requested_action === "NO_CHANGE") {
        notes.push(`no_change_for_${need.id}`);
      }
    }

    const evolve_run_id = `evolve-${createHash("sha256")
      .update(signals.map((s) => s.id).join(","))
      .digest("hex")
      .slice(0, 12)}`;

    const result: EvolveLoopRunResult = {
      evolve_run_id,
      state,
      signal_count: signals.length,
      pattern_count: patterns.length,
      need_count: needs.filter((n) => n.status === "CANDIDATE").length,
      candidate_count: validated.length,
      blocked_count: blocked,
      rejected_count: rejected,
      submitted_count: submitted,
      signals,
      patterns,
      needs,
      root_causes: rootCauses,
      candidates: validated,
      requests,
      unauthorized_mutation: false,
      notes,
    };

    options.store?.replace({
      signals,
      patterns,
      needs,
      root_causes: rootCauses,
      candidates: validated,
      requests,
    });
    options.store?.persist();

    return result;
  }
}

function emptyResult(state: LoopState, notes: string[]): EvolveLoopRunResult {
  return {
    evolve_run_id: "evolve-blocked",
    state,
    signal_count: 0,
    pattern_count: 0,
    need_count: 0,
    candidate_count: 0,
    blocked_count: 1,
    rejected_count: 0,
    submitted_count: 0,
    signals: [],
    patterns: [],
    needs: [],
    root_causes: [],
    candidates: [],
    requests: [],
    unauthorized_mutation: false,
    notes,
  };
}
