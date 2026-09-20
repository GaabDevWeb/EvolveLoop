# ADR Validation & Architecture Gate

**Date:** 2026-09-19  
**Baseline:** `baseline-v1-2026-09-18` (checksum OK; unmodified)  
**Implementation / runtime / prototype execution:** NONE  

## Executive Summary

All five ADR drafts are **VALID_WITH_LIMITATIONS**: evidence-bounded KEEP/DEFER decisions with no overclaiming of exactly-once, task_success, or sandbox security. No ADR is REJECTED or NEEDS_REVISION as a blocker. Both prototype candidates are **NEEDS_MORE_EVIDENCE** (missing rollback/isolation). Four future experiments remain **VALID**; two are **DEFERRED** as architecture-first work.

```text
Gate outcome: PASS_WITH_REVISIONS
Meaning: decisions may stand as architecture decisions of type KEEP/DEFER;
         non-blocking completeness items listed; no implementation authorized.
```

## Evidence Quality

| Source | Quality | Gate note |
|--------|---------|-----------|
| E-005 | HIGH (scoped) | Direct mutation/resume metrics |
| E-001 | MEDIUM (offline) | PROXY tokens; live NOT_MEASURED |
| Baseline V1 | HIGH | Invariants preserved |
| E-002…E-004 | N/A | Correctly BLOCKED / deferred |

Evidence ledger audit: **PASS_WITH_NOTES**. Traceability: **PASS**. DO-NOT-CHANGE: **PASS**.

## E-001 Review

- Token reconciliation confirmed: `~40%` = `T_TOKENS_40` only; T5/T10 are size-budget axis.  
- ADR-DR-0002 preserves DEFER production budget + KEEP runtime.  
- Does not convert activation → task_success.  
- Does not convert token_estimate → exact vendor tokens.  
- Does not convert offline → live production requirement.  
- Does not prescribe `max_skills`.  

**Decision test:** Evidence does **not** justify production runtime change → ADR correctly DEFERs.  

**Gate:** VALID_WITH_LIMITATIONS.

## E-005 Review

- ADR-DR-0001 KEEP job-path resume within JOB_PATH / STATE_WRITE / same-process.  
- Explicitly DEFERs global exactly-once and full HITL.  
- HITL remains PARTIALLY_OBSERVED.  
- NEW_ENGINE ≠ OS kill preserved.  

**Excessive claim check:** no global idempotency / exactly-once / all-side-effects claims.  

**Gate:** VALID_WITH_LIMITATIONS.

## Sandbox Decision

ADR-DR-0003: DEFER — DEFINE SECURITY MODEL FIRST. No technology prescription. Policy ≠ Authority ≠ Sandbox ≠ Posture.  

**Gate:** VALID_WITH_LIMITATIONS (checklist completeness non-blocking).  
**Implementation:** not approved. ARCHITECTURAL_DECISION_REQUIRED before sandbox.

## Stuck Decision

ADR-DR-0004: DEFER — DEFINE SEMANTICS FIRST. No StuckDetector implementation.  

**Gate:** VALID_WITH_LIMITATIONS.

## Compaction Decision

ADR-DR-0005: DEFER — ARCHITECTURE FIRST. Ownership listed, not answered (correct for this ADR).  

**Gate:** VALID_WITH_LIMITATIONS. Future ownership ADR required before experiments/prototypes.

## ADR Drafts

| ADR | Final gate |
|-----|------------|
| ADR-DR-0001 | VALID_WITH_LIMITATIONS |
| ADR-DR-0002 | VALID_WITH_LIMITATIONS |
| ADR-DR-0003 | VALID_WITH_LIMITATIONS |
| ADR-DR-0004 | VALID_WITH_LIMITATIONS |
| ADR-DR-0005 | VALID_WITH_LIMITATIONS |

Conflicts between ADRs: **none**.

## Prototype Candidates

| ID | Final gate | Execution |
|----|------------|-----------|
| PT-001 | NEEDS_MORE_EVIDENCE | NOT authorized |
| PT-002 | NEEDS_MORE_EVIDENCE | NOT authorized |

Reason: rollback / data-runtime isolation missing from queue entries (§27). Questions remain meaningful.

## Future Experiments

| ID | Final gate |
|----|------------|
| E-001-LIVE | VALID |
| E-005-OS-KILL | VALID |
| E-005-CONFIRM-SIDE-EFFECT | VALID |
| E-002-SEC-MODEL | DEFERRED |
| E-003-STUCK-DEF | VALID |
| E-004-OWNERSHIP | DEFERRED |

Redundancy: none vs completed E-001/E-005.

## Conflicts

None detected among ADR drafts.

## Overclaims Detected

None that survive into Decision sections. Risk sections correctly warn against guarantees. No “production-ready,” “globally,” or “exactly-once proven” claims as accepted conclusions.

## Architecture Churn Risks

| Risk | Gate stance |
|------|-------------|
| Implement max_skills from offline E-001 | Blocked by ADR-DR-0002 |
| Claim exactly-once from E-005 | Blocked by ADR-DR-0001 |
| Sandbox theater / posture labels | Blocked by ADR-DR-0003 |
| StuckDetector without semantics | Blocked by ADR-DR-0004 |
| Compaction without ownership | Blocked by ADR-DR-0005 |
| Second registry/orchestrator | Not proposed; DO-NOT-CHANGE PASS |

## Required Revisions

Non-blocking only — see `REVISION-REQUIRED.md`. **No blocking NEEDS_REVISION.**

## Approved ADR Drafts

As architecture decisions (KEEP/DEFER), with limitations:

- ADR-DR-0001  
- ADR-DR-0002  
- ADR-DR-0003  
- ADR-DR-0004  
- ADR-DR-0005  

“Approved” here means **decision is sufficiently well-founded**, not **implemented**.

## Approved Prototypes

None. PT-001 / PT-002 need queue safety fields before APPROVED_WITH_CONSTRAINTS.

## Deferred Items

- Production skill budget / max_skills  
- Global exactly-once  
- Sandbox / posture productization  
- StuckDetector  
- Compaction/reinject  
- E-002-SEC-MODEL / E-004-OWNERSHIP as runnable experiments  
- Prototype execution  

## Rejected Items

None (no ADR REJECTED / DUPLICATE).

## What Must NOT Be Implemented Yet

```text
- max_skills / budget governor / pruning engine
- OS sandbox / posture enum productization
- StuckDetector
- context compaction / reinject
- global exactly-once architecture
- model routing
- second Capability/Provider/Agent registry
- second orchestrator / evidence SSOT
- PT-001 / PT-002 execution
- any runtime change justified only by this gate
```

## Final Gate State

```text
ADR GATE STATUS: PASS_WITH_REVISIONS
implementation_performed: false
runtime_modified: false
baseline_modified: false
```
