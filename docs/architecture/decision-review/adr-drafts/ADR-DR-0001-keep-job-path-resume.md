# ADR-DR-0001 — Keep current job-path resume/checkpoint design (scoped)

## Status

DRAFT

## Context

After Controlled Runtime Sync restored `orchestrator/src/jobs/`, Baseline V1 marked Jobs/Resume as OBSERVED and HITL as PARTIALLY_OBSERVED. Research previously treated HITL/jobs as PROTOTYPE; audit had weakened claims while `jobs/` was missing.

E-005 measured interrupt → persist → resume under a job-path fixture with instrumented `JobFileExecutor` STATE_WRITE mutations.

## Observed Evidence

- `resume_success = 1.0` (10/10 treatment runs) — DIRECTLY_OBSERVED  
- `duplicate_mutate = false`; `observed_mutations = 1` on 15/15 runs — DIRECTLY_OBSERVED  
- Checkpoint restore + continuation — MEASURED under fixture  
- SAME_ENGINE and NEW_ENGINE (same Node process) — MEASURED  
- OS kill — NOT_MEASURED  
- Confirm-gated / external product side effects — NOT_MEASURED  
- Full product HITL (approval UX, human wait product flow) — NOT_MEASURED  

## Decision

**KEEP** the current job-path resume/checkpoint mechanism for the tested failure class.

**DEFER** any architecture claiming global exactly-once, universal idempotency, or full HITL completion.

## Scope

```text
scope = JOB_PATH
side_effect = STATE_WRITE (job JSON via JobFileExecutor)
process = same Node process (SAME_ENGINE | NEW_ENGINE)
interrupt = wait_for_jobs_ms=0 end-of-run + resume
```

## What This Decision Does Not Claim

- Exactly-once for all side effects  
- OS/process crash recovery  
- `engine.pause()` semantics  
- Full HITL product readiness  
- Authority enforcement on all providers  

## Consequences

- No new resume/recovery primitive required from E-005 alone  
- Baseline HITL remains **PARTIALLY_OBSERVED**  
- Future OS-kill / confirm-path experiments may refine, not auto-replace, this KEEP  

## Risks

- Over-generalizing fixture success into product guarantees  
- Neglecting Authority gaps because resume worked  

## Open Questions

- OS kill behavior?  
- Confirm-path mutation duplicates?  
- Interaction with soft-policy / Authority unwired providers?  

## Validation Requirements

- Preserve E-005 reproduction commands  
- Any stronger claim requires new experiment IDs (see FUTURE-EXPERIMENTS)  

## Related Experiments

E-005

## Related Research

HITL / jobs PROTOTYPE; DO-NOT-CHANGE orchestrator; Runtime Sync CHANGE-MANIFEST

## Implementation status

NOT IMPLEMENTED (no code change from this ADR)

## Implementation required

NO (KEEP current)
