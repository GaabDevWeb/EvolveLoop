# EvolveLoop — Final Operationalization Report

**Audience:** engineers and reviewers outside the day-to-day CursorSKILLS/MegaBrain workstream.  
**Date:** 2026-09-19  
**Starting baseline:** `baseline-v5-2026-09-19`  
**Final baseline:** `baseline-v6-2026-09-19`  
**Verdict:** `SUCCESS_WITH_LIMITATIONS`

---

## 1. Executive Summary

Before this phase, EvolveLoop could already **remember** signals across runs, **detect** recurring needs, **propose** gated evolution candidates, and — when opted in — **observe** live EventBus failures and **analyze automatically**. What it could *not* do cleanly was close the loop after a change: an evolution **outcome** was persisted and re-ingested as a synthetic signal, but that did **not** schedule the next analytical cycle. Closing a post-change observation window therefore still depended on later runtime events or a manual `analyze()` call.

This operationalization **wires outcome feedback into the existing `LiveAnalysisCoordinator` cadence** (`afterOutcome`), adds a **partial gate-result adapter** (without reinventing the Prototype Gate), documents event coverage, and exposes a **safe CLI opt-in** (`--evolve`, default OFF). The continuous loop is now demonstrable in harness evals end-to-end.

It is **not** a production-proven, fully autonomous self-modifying system. Evolution remains **gated**; autonomy stops at **PROPOSE**. Evidence/Eval/user-feedback adapters remain disconnected. The production Prototype Gate runner is still external.

---

## 2. Before

```text
Runtime → EventBus → Persist
       → Cadence → automatic analyze(scope)   [opt-in]
       → Need → Candidate → EvolutionRequest handoff
       → Controlled fixture / external gate (partial)
       → Observation window → Outcome → Persist + re-ingest
       → (next analyze required manual call or unrelated new events)
```

The semantic loop broke at **outcome → next analysis**.

---

## 3. After

```text
Runtime → EventBus → Persist
       → Cadence → automatic analyze(scope)
       → Need → Candidate → EvolutionRequest
       → Gate boundary (fixture or external .gate.json)
       → Observation Window
       → Outcome → Persist + re-ingest
       → afterOutcome → Cadence (after_outcome) → automatic next analyze(scope)
       ↺
```

Same coordinator, same scope semantics, same loop-depth / cooldown / backpressure controls. No second scheduler.

---

## 4. Automatic Analysis

When EvolveLoop is enabled (engine options or `--evolve`):

1. Runtime events map to observations (`NodeFailed`, `FeatureBlocked`, `GateRejected`, plus `RetryScheduled` as BATCH).
2. Ingest writes durable signals.
3. `LiveAnalysisCoordinator.notifySignal` updates per-scope cadence.
4. When thresholds / high-severity rules fire (and cooldown / rate limits allow), `analyze(scope)` runs via `queueMicrotask` (or sync in tests).

Default remains **OFF**. Analysis never invents a silent global scope; SYSTEM requires `authorize_system`.

---

## 5. Scope

| Scope | Meaning | Guard |
|-------|---------|-------|
| USER | Per-user evolution memory | `user_id` queries |
| PROJECT | Per-project | `project_id` |
| WORKSPACE | Feature/workspace id | `feature_id` |
| SYSTEM | Cross-cutting | requires `--evolve-authorize-system` / `authorize_system: true` |

Isolation is **logical** (query filters on a shared store), not separate disk tenancy.

---

## 6. Persistence

`PersistentSignalStore` keeps signals, needs, and outcomes under an evolution directory (JSONL). Restarts reload history; analysis consumes prior fingerprints, needs, and outcomes for the active scope.

---

## 7. Need Detection

Cross-run aggregation counts unique executions. Lifecycle rules escalate only when patterns repeat beyond one-off noise. Isolated failures prefer **NO_CHANGE**.

---

## 8. Candidate Generation

Root-cause hints map to Skill / Capability / Agent / Knowledge / NO_CHANGE proposals. Candidates are validated and wrapped as `EvolutionRequest` with `autonomy_ceiling: PROPOSE`. CORE-class candidates are **HOLD** (no automatic core mutation).

---

## 9. Gate

EvolveLoop writes handoff JSON and can **read** `{requestId}.gate.json` decisions:

`APPROVED | APPROVED_WITH_CONSTRAINTS | NEEDS_MORE_EVIDENCE | BLOCKED | REJECTED | HOLD`

Provenance distinguishes `controlled_fixture` vs `external_adapter`. The in-repo “Prototype Gate” docs for OS-kill job resume are a **different** gate; the production evolution gate runner is **not** packaged here (`GATE_ADAPTER_PARTIAL`).

---

## 10. Observation Window

Windows open after approved/adopted evolution (fixture auto-approve in harness, or `ingestGateResult` for APPROVED*). They collect matching after-signals by scope/domain/task, close on minimum samples or max duration, then evaluate before/after.

---

## 11. Outcome

`OutcomeTracker` classifies `IMPROVED | UNCHANGED | REGRESSED | INCONCLUSIVE`. Empty or low-sample after-windows **never** claim IMPROVED.

---

## 12. Feedback Loop

On window evaluation:

1. Persist outcome + update need lifecycle.
2. Re-ingest a synthetic post-evolution signal (for history).
3. Call `afterOutcome(scope, kind)`:
   - `INCONCLUSIVE` → observe-only (no schedule)
   - `REGRESSED` → high-severity outcome trigger
   - `IMPROVED` / `UNCHANGED` → outcome trigger
4. Cadence `after_outcome` bypasses min-new-signal threshold but **keeps** cooldown and global rate limits; per-scope `outcomeTriggerCount` caps recursion.

Calling `recordOutcome` **without** the coordinator still does not schedule analysis (intentional API boundary).

---

## 13. Live Runtime

Connected EventBus types (see `EVENT_COVERAGE`):

| Type | Mode |
|------|------|
| NodeFailed | TRIGGER |
| FeatureBlocked | TRIGGER |
| GateRejected | TRIGGER |
| RetryScheduled | BATCH |

Many other engine events exist but are **not** connected (OBSERVE_ONLY / not implemented). No fake user-feedback channel was invented.

---

## 14. Registry

`snapshotInventoryFromRegistry` reads the injected `CapabilityRegistry`. Unavailable / empty scans surface `UNKNOWN` / notes — empty is not treated as “no capabilities exist” without qualification.

---

## 15. User Evolution

USER-scoped analysis and candidates stay attributable to that user id. Cross-user evals confirm A’s failures do not produce B’s needs under correct emitters.

---

## 16. Core Evolution

Repeated cross-user patterns may yield `CORE_CANDIDATE` with **HOLD** / `mutates_core: false`. Fixture blocks core mutation approvals.

---

## 17. Safety

Allowed automatic band: observe → ingest → persist → aggregate → analyze → detect → propose → submit handoff.  
Forbidden automatic band: self-grant capability, weaken policy, escalate privilege, rewrite runtime, promote CORE without gate.

Observer/coordinator failures are caught; main EventBus emit remains non-blocking.

---

## 18. Tests

| Suite | Result |
|-------|--------|
| Full orchestrator Vitest | **184/184** |
| Contracts | **7/7** |
| Full-cycle integration | **5/5** |

Prior baselines v1–v5 untouched; V6 records the new counts.

---

## 19. Evals

| ID | Focus | Boundary |
|----|-------|----------|
| EV-EVOLVE-FINAL-001 | Automatic analysis trigger | Not production cron |
| EV-EVOLVE-FINAL-002 | Outcome trigger | Harness sync/cooldown 0 |
| EV-EVOLVE-FINAL-003 | Observation window | Not prod SLA |
| EV-EVOLVE-FINAL-004 | Gate handoff | Not production gate |
| EV-EVOLVE-FINAL-005 | Scope isolation | Not disk tenancy |
| EV-EVOLVE-FINAL-006 | Runtime resilience | — |
| EV-EVOLVE-FINAL-007 | Closed loop | Harness EventBus |

Prior LIVE-001..008 and longitudinal L-001..008 remain green.

---

## 20. Adversarial Validation

Independent critic (MegaBrain `role: critic`) confirmed the outcome path is real, caps prevent infinite recursion, observer does not break runtime, and production claims must not be overstated. Findings captured in `FINDINGS.yaml`.

---

## 21. Performance

Full Vitest ~1.6s on the validation host. Observation is subscribe+ingest; analysis is deferred via microtask outside tests. JSONL storage has **no** TTL/compaction — growth is a known limitation (100 / 1k / 10k not load-certified).

---

## 22. Security / Privacy

- Automatic path capped at PROPOSE.
- SYSTEM scope authorization required.
- Residual risks: fallback scope attribution if emitters omit ids; shared evolution directory; unlabeled gate artifacts defaulting provenance kind.

---

## 23. What Is Actually Live

| Layer | Status |
|-------|--------|
| EventBus → observer → store | Runtime-connected when opted in |
| Cadence → analyze → propose | Runtime-connected when coordinator attached |
| ControlledGateFixture | Harness-only |
| External `.gate.json` reader | Adapter boundary |
| Production Prototype Gate runner | External / not in package |
| Evidence / Eval / User-feedback | NOT_CONNECTED |

---

## 24. What Is Not Production-Proven

Production traffic, multi-tenant disk isolation, production gate decisions, Evidence Bus bridging, and always-on daemon behaviour are **not** proven.

---

## 25. Remaining Gaps

1. Production Prototype Gate runner integration  
2. Evidence adapter  
3. Eval-results adapter  
4. User-feedback adapter  
5. Disk-level tenancy  
6. Broader event vocabulary  

---

## 26. Unsupported Claims

1. “Production proven”  
2. “Fully autonomous self-modifying system”  

---

## 27. Final Architecture

EvolveLoop remains a **longitudinal intelligence layer** beside the Execution Engine: it observes, remembers, correlates, detects, and proposes. The engine’s EventBus and Capability Registry are reused. Cadence and coordinator own automatic analyze. Gate authority stays outside EvolveLoop’s auto-apply path.

---

## 28. Final Baseline

**`baseline-v6-2026-09-19`** — parent V5 intact; source tree hash recorded; 184/184 tests; claim matrix linked.

---

## 29. Final Verdict

**`SUCCESS_WITH_LIMITATIONS`**

The primary property is demonstrated in harness:

> After the system evolves (within the gated/fixture boundary), it can observe consequences and start the next analytical cycle **without a manual `analyze()`**.

Human narrative (only where implemented):

A person uses the system. The system observes what happened. Those events are stored. Across executions, patterns emerge. When a pattern indicates a recurring need, EvolveLoop creates an evolution proposal. That proposal cannot freely change the system: it passes existing gate boundaries. After a change is approved in the harness/adapter sense, the system observes again. The result is recorded and feeds the next analysis cycle automatically when the live coordinator is enabled.

---

## BEFORE / AFTER (compact)

```text
BEFORE
Runtime → EventBus → Persist → automatic analyze (opt-in) → … → Outcome → Persist
                                                                         ↘ manual/partial next analyze

AFTER
Runtime → EventBus → Persist → Cadence → automatic analyze(scope)
→ Need → Candidate → Gate boundary → Observation Window → Outcome
→ Persist → afterOutcome → automatic next analyze(scope) ↺
```
