# EvolveLoop Live Integration Report

## 1. What existed before

Stabilization (V4): EventBus → ingest, mandatory scope, outcome reingestion, live registry snapshot, `AnalysisCadence` class **not** wired to analyze. Analysis remained caller-driven.

## 2. What was missing

```
EventBus → ingest → [GAP] → cadence → analyze(scope)
observation window scheduler
automatic request path without manual analyze()
```

## 3. What was implemented

| Component | Role |
|-----------|------|
| `LiveAnalysisCoordinator` | ingest notify → per-scope cadence → automatic `analyze(scope)` |
| `ScopedAnalysisCadence` | per-scope thresholds, cooldown, backpressure |
| `LIVE_CADENCE_DEFAULTS` | no magic numbers at call sites |
| `ObservationWindowManager` | post-approval before/after sampling → `recordOutcome` |
| `approveEvolutionRequestFixture` | harness gate (APPROVED/HOLD); no core mutation |
| Observer + engine | optional `evolveCoordinator` on `ExecutionEngine` |

## 4–11. How it works

**Live analysis:** after each ingest, coordinator records signals per derived `AnalysisScope`; when `min_new_signals` (or high-severity threshold) met and cooldown elapsed, schedules `analyze(scope)` via `queueMicrotask` (or sync in tests).

**Scope:** USER/PROJECT/WORKSPACE from payload; fallback to attach scope; SYSTEM needs `authorize_system`. Never silent global.

**History:** `analyze` always queries persistent store + outcomes.

**Candidates / requests:** produced inside automatic analyze; submitted to handoff dir when configured.

**Gate:** remains external; harness fixture only. CORE → HOLD.

**Outcome windows:** open after fixture APPROVED; close on sample count or max duration; evaluate → persist + reingest.

**Loop close:** outcomes influence next analyze lifecycle; post_evolution signals do not storm cadence.

## 12–13. User / Core

USER_LOCAL isolation verified in LIVE-002. CORE_CANDIDATE cannot auto-mutate (HOLD + fixture block).

## 14–16. Overhead / Security / Privacy

Observation remains try/catch non-blocking (LIVE-007). Analysis failure does not crash EventBus. Autonomy ceiling PROPOSE. Delivery semantics: **BEST_EFFORT**.

## 17–19. Tests / Evals / Adversarial

| Suite | Result |
|-------|--------|
| Full vitest | **170/170** (was 162) |
| Contracts | 7/7 |
| Full-cycle | 5/5 |
| EV-EVOLVE-LIVE-001..008 | **8/8 PASS** |

Adversarial covered: scope isolation, analysis throw isolation, restart, cooldown/depth, same-run policy retained elsewhere.

## 20–23. Live vs fixture / not connected / not production

| Claim language | Reality |
|----------------|---------|
| LIVE IN HARNESS | YES — EventBus production-like |
| AUTOMATIC | YES when coordinator attached |
| CLOSED-LOOP | YES lifecycle + window path in harness |
| PRODUCTION | NO |
| Evidence/Eval/Feedback adapters | NOT_CONNECTED |
| CLI default evolve | OFF |
| Full Prototype Gate runner | external / NOT_IN_PACKAGE |

## 24–26. Architecture / Baseline / Gaps

See `ARCHITECTURE.md`, `baseline-v5-2026-09-19` (V1–V4 intact).  
Open gaps: 4 (FINDINGS.yaml).

### BEFORE → AFTER (demonstrated)

| BEFORE | AFTER |
|--------|-------|
| Runtime → EventBus → Persist | + Cadence → Automatic Scoped Analysis |
| Analysis Manual | Automatic when coordinator opt-in |
| Outcome persisted / reingest manual path | + Observation window → evaluate → reingest |
| No auto trigger | LiveAnalysisCoordinator |

### Final audit answers

1. YES (opt-in coordinator)  
2. YES  
3. YES  
4. YES  
5. YES (with handoffDir)  
6. PARTIAL (handoff + fixture; full gate external)  
7. YES (harness)  
8. YES  
9. YES  
10. YES (restart tests)  
11. NO leakage (LIVE-002)  
12. NO core mutation  
13. NO unbounded (depth/cooldown/skip)  
14. NO — failures isolated  
15. NO production claims  

**Final status:** `SUCCESS_WITH_LIMITATIONS`
