# EvolveLoop V1 — Final Audit Report

**Date:** 2026-09-19  
**Decision:** `V1_READY_WITH_LIMITATIONS`  
**Freeze baseline:** `baseline-v7-2026-09-19`  
**Audience:** engineers outside the day-to-day CursorSKILLS workstream

---

## Executive Summary

EvolveLoop is a **longitudinal observation and proposal layer** beside the Execution Engine. It watches runtime events (when opted in), stores them, detects recurring needs across executions, proposes gated evolution candidates, and after a trusted approval path can observe outcomes and automatically schedule the next analysis — without a manual `analyze()` call.

This audit asked: *is the motor solid enough to freeze as V1 and start controlled real observation?*  
**Answer: yes, with explicit limitations.** Two confirmed security/trust defects were fixed (scope stamp leak; unlabeled gate over-trust). The suite is **196/196**. Production gate integration, Evidence/Eval adapters, and physical tenancy remain out of V1 scope.

**Philosophy after freeze:** build less, observe more.

---

## What EvolveLoop Is

A system that observes agent-ecosystem usage, identifies recurring patterns that may represent needs, proposes evolutions, routes them through a governed boundary, and later observes results. Autonomy stops at **PROPOSE**. It is **not** a fully autonomous self-modifying runtime.

---

## Starting State

Reconciled from repository (not from prior agent prose alone):

- Prior claim `baseline-v6` present; tests reproduced **184/184**, then **196/196** after audit corrections + adversarial suite  
- Contracts **7/7**, full-cycle **5/5**  
- Critical pre-fix issue: unlabeled EventBus events inherited attach-scope `user_id`

---

## What Was Audited

Correctness, architectural integrity, scope security, persistence/longitudinal properties, temporal/recurrence rules, need lifecycle, RCA heuristics, candidates, outcomes/windows, gate boundary, live observation coverage, automatic analysis/cadence, loop bounds, registry snapshot behaviour, CLI defaults, claim integrity, and operational readiness — via code inspection, existing evals, and `evolveloop-v1-adversarial-audit.test.ts`.

---

## Architecture Findings

Agent / Capability / Provider / Policy / Runtime / Evidence / Knowledge / Telemetry / Evals boundaries remain those of the Execution Engine. EvolveLoop does **not** introduce a second registry, runtime, or scheduler. Legacy dual exports (`AnalysisCadence` vs `ScopedAnalysisCadence`; episodic vs longitudinal controller) are **LEGACY/INTENTIONAL**, not live duplicates of orchestration.

---

## Scope / Isolation Findings

- `analyze()` without scope → `REQUIRES_SCOPE` (no silent global)  
- SYSTEM requires `authorize_system`  
- Cross-user isolation holds when payloads carry `user_id`  
- **Corrected:** missing identity is rejected, not stamped  
- Tenancy remains **logical** (shared `evolutionDir`) — not physical

---

## Persistence Findings

Signals/needs/outcomes survive restart via store reload. History is **consumed** in `analyze()` (`store.query`, outcomes feedback), not merely written.

---

## Longitudinal Findings

`unique_executions` policy: three signals in one `execution_id` do **not** equal three independent executions. STALE/RESOLVED/REGRESSED lifecycle rules exist; REGRESSED/REMAINS_ACTIVE preserved across re-analyze when prior.

---

## Automatic Analysis Findings

Opt-in EventBus → cadence → `analyze(scope)`. Default OFF. Storm attack: analyses bounded by `max_analyses_per_minute`.

---

## Need Detection Findings

Cross-run patterns → longitudinal needs with lifecycle. One-off failures prefer NO_CHANGE paths.

---

## Candidate Findings

Need → suspected RCA → candidate with validation/handoff. CORE candidates HOLD. Reuse/NO_CHANGE remain possible alternatives. RCA is **heuristic** (`suspected`, not proven causal).

---

## Outcome / Feedback Findings

Empty after-window → INCONCLUSIVE (never IMPROVED). `afterOutcome` triggers next analysis for material outcomes; INCONCLUSIVE does not. Coordinator path required for auto-trigger.

---

## Gate Findings

Handoff JSON + fixture/external `.gate.json`. Production runner **EXTERNAL**. Unlabeled artifacts are **untrusted** and do not open windows. No EvolutionRequest → direct mutation path in EvolveLoop.

---

## Runtime Findings

Observer non-blocking. Analysis failures isolated. Limited event vocabulary: NodeFailed / FeatureBlocked / GateRejected (TRIGGER), RetryScheduled (BATCH).

---

## Registry Findings

Live snapshot when `CapabilityRegistry` injected; UNKNOWN when unscanned/empty — not “no capabilities exist”.

---

## Security Findings

PROPOSE ceiling; CORE HOLD; identity reject; SYSTEM auth. Residuals: shared filesystem store; limited event surface; external gate.

---

## Performance Findings

Vitest full suite ~1.8s. No production load certification. No JSONL TTL — storage growth is an accepted V1 limitation.

---

## Adversarial Findings

ATTACK-01..10 measured. Two defects corrected (01, 10). Others PASS (cross-user, empty window, storm, depth, unscoped analyze, SYSTEM auth, same-exec recurrence, registry UNKNOWN).

---

## Test Results

**196/196** (36 files). Contracts 7/7. Full-cycle 5/5.

---

## Eval Results

FINAL-001..007, LIVE-001..008, L-001..008, V1 adversarial ADV suite — green with claim boundaries in comments.

---

## Corrections

See `CORRECTIONS.yaml` — **2** local fixes (V1-C-001, V1-C-002).

---

## Claim Verification

See `CLAIM-VERIFICATION.yaml` / `CLAIM-MATRIX.yaml`. Unsupported: fully autonomous, production proven, full observability, fixture=production gate.

---

## Remaining Limitations

1. Production gate external  
2. Evidence/Eval/User-feedback adapters NOT_CONNECTED  
3. Logical tenancy only  
4. Limited event vocabulary  
5. No storage TTL/compaction  
6. `recordOutcome` alone does not schedule analysis  

---

## Unsupported Claims

Four CONTRADICTED claims listed above (CL-V1-12..15). Physical tenancy UNVERIFIED.

---

## V1 Decision

**`V1_READY_WITH_LIMITATIONS`**

Core loop, automatic analysis, scope (post-fix), persistence, outcome feedback, gate boundary integrity, security acceptability for observation-first operation, tests/evals, and architecture reconciliation all support freeze. Non-critical integrations remain external/optional by design of V1.

---

## Baseline

**`baseline-v7-2026-09-19`** — parents v1–v6 intact. Source tree hash recorded.

---

## Operational Readiness

**OBSERVATION_FIRST** — see `OPERATIONS.md`. Enable with `--evolve` + explicit scope + identity on events. Disable by omitting the flag.

---

## How the Real-World Loop Should Be Used

Collect real signals under controlled opt-in. Review needs and candidates manually. Route EvolutionRequests through the real gate outside this package. Only after trusted approval open observation windows and judge outcomes. Treat early data as operational evidence, not universal benchmarks.

---

## What Happens Next

Do **not** invent the next architecture. Let real usage produce the next questions: false positives, missing events, tenancy needs, gate integration priorities.

---

## Final Conclusion

Yes — we can **stop expanding the motor** and **start observing** what it learns about its ecosystem, under observation-first policy, with limitations documented and architecture frozen.
