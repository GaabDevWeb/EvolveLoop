# ADR-DR-0001 — Keep current job-path resume/checkpoint design (scoped)

## Status

ACCEPTED

## Date

2026-09-19

## Context

After Controlled Runtime Sync restored `orchestrator/src/jobs/`, Baseline V1 marked Jobs/Resume as OBSERVED and HITL as PARTIALLY_OBSERVED. Research previously treated HITL/jobs as PROTOTYPE; audit had weakened claims while `jobs/` was missing on this tree.

E-005 measured interrupt → persist → resume under a job-path fixture with instrumented `JobFileExecutor` STATE_WRITE mutations.

ADR Validation Gate (2026-09-19): VALID_WITH_LIMITATIONS → non-blocking revision = add reversibility block.

## Problem

Whether E-005 evidence justifies replacing or extending the job-path resume/checkpoint mechanism, or claiming stronger recovery guarantees (exactly-once, OS-kill, full HITL).

## Decision

1. **KEEP** the current job-path resume/checkpoint mechanism for the tested failure class.  
2. **DEFER** any architecture claiming global exactly-once, universal idempotency, or full HITL completion.

## Evidence

| Claim | Classification | Source |
|-------|----------------|--------|
| resume_success = 1.0 (10/10 treatment) | DIRECTLY_OBSERVED | E-005 |
| duplicate_mutate = false; mutations=1 on 15/15 | DIRECTLY_OBSERVED | E-005 |
| Checkpoint restore + continuation under fixture | MEASURED | E-005 |
| SAME_ENGINE and NEW_ENGINE (same Node process) | MEASURED | E-005 |
| OS kill | NOT_MEASURED | E-005 |
| Confirm-gated / external product side effects | NOT_MEASURED | E-005 |
| Full product HITL | NOT_MEASURED | E-005 + baseline |
| HITL product status | MEASURED as PARTIALLY_OBSERVED | Baseline V1 |

## Evidence Scope

| Dimension | Value |
|-----------|--------|
| System | CursorSKILLS Agent System (`@agents/orchestrator`) |
| Runtime | ExecutionEngine + jobs/ (job-store, pickup, resume, checkpoint) |
| Workload | E-005 duplicate_mutate fixture (JobFileExecutor STATE_WRITE) |
| Experiment | E-005 |
| Sample | 5 CONTROL + 5 SAME_ENGINE + 5 NEW_ENGINE |
| Environment | Same Node process; wait_for_jobs_ms=0 interrupt then resume |
| Metric | resume_success, observed_mutations, checkpoint presence |

## What This Decision Establishes

- Current job-path resume is **sufficient for the tested failure class** (in-process interrupt → complete → resume without second STATE_WRITE mutation under the fixture).  
- No new resume/recovery primitive is required **from E-005 alone**.  
- Baseline HITL remains **PARTIALLY_OBSERVED**.

## What This Decision Does NOT Establish

- Global exactly-once semantics  
- Universal idempotency  
- OS/process crash recovery  
- External side-effect safety beyond job JSON STATE_WRITE  
- `engine.pause()` interrupt semantics  
- Full HITL (approval, rejection, human wait, confirm UX)  
- Authority enforcement on all providers  

## Alternatives Considered

| Alternative | Why not chosen |
|-------------|----------------|
| Replace jobs/checkpoint with new recovery subsystem | No evidence existing path failed under fixture |
| Claim exactly-once globally | Forbidden by E-005 limitations |
| Upgrade HITL to fully observed | Confirm/human paths NOT_MEASURED |

## Consequences

- Future work may refine via OS-kill / confirm-path experiments (PT-002 / E-005-OS-KILL), not auto-replace this KEEP.  
- Product docs must not equate job-path success with full HITL readiness.

## Risks

- Over-generalizing fixture success into product guarantees  
- Neglecting Authority soft-policy gaps because resume worked  

## Reversibility

```yaml
reversibility:
  reversible: N/A
  rollback_concept: N/A — decision is KEEP current mechanism; no change applied
  compatibility_risk: none from this ADR
  state_migration: none
  data_migration: none
  note: If a future ADR reverses KEEP toward a new recovery design, that ADR must supply REQUIRES_IMPLEMENTATION_PLAN
```

## Validation Requirements

- Preserve E-005 reproduction (`docs/evals/experiments/E-005/REPRODUCE.md`)  
- Stronger claims require new experiment IDs (E-005-OS-KILL, E-005-CONFIRM-SIDE-EFFECT)  
- Baseline HITL label must not silently upgrade  

## Implementation Status

```text
IMPLEMENTATION_STATUS: NOT_IMPLEMENTED
```

(No code change from this ADR. Mechanism already existed; decision is KEEP.)

## Open Questions

- OS kill behavior after process restart?  
- Confirm-path mutation duplicates?  
- Interaction with Authority-unwired providers?  

## Related Experiments

E-005 (COMPLETE); future E-005-OS-KILL, E-005-CONFIRM-SIDE-EFFECT; PT-002

## Related Research

HITL / jobs PROTOTYPE; Runtime Sync; DO-NOT-CHANGE orchestrator

## Related Principles

Runtime orchestrates; Capability does; Evidence proves; Policy Decision ≠ Enforcement

## Related Anti-Patterns

AP-006 dual orchestration — do not add second recovery orchestrator from E-005 alone
