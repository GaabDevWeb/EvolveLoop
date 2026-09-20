# E-005 — Resume / Duplicate Mutation

## Hypothesis

After job-path interrupt and resume, the existing mechanism completes successfully **without** re-invoking job-file mutation more than once (`duplicate_mutate = false`; `observed_mutations = 1`).

## Baseline

`baseline-v1-2026-09-18` — Jobs/Resume/Pickup OBSERVED; prior E-005 run had `duplicate_mutate = NOT_MEASURED`.

## Fixture

See `FIXTURE.md`. Instrumented wrapper around real `JobFileExecutor` (append-only mutation log; no fake idempotency).

## Control

5 runs: uninterrupted `wait_for_jobs_ms=10000` + external complete.  
**observed_mutations = 1** on all runs.

## Treatment

- **TREATMENT_SAME_ENGINE** ×5: `wait=0` interrupt → complete → `resume` on **same** engine  
- **TREATMENT_NEW_ENGINE** ×5: same but **new** engine instance  

Both: **observed_mutations = 1**; **resume succeeded** on all runs.

## Metrics

| Metric | Definition | Expected | Observed | Sample |
|--------|------------|----------|----------|--------|
| resume_success | treatment final run success | 1.0 | **1.0** | 10 treatment runs |
| duplicate_mutate | observed > 1 | false | **false** (all) | 15 runs |
| state_restoration | checkpoint then resume | true | **true** | treatment |
| completion_success | final success | true | **true** | all |
| same_run_continuation | node reaches satisfied | true | **true** | treatment |

## Results

```text
CONTROL:                 5/5 mutation=1, success
TREATMENT_SAME_ENGINE:   5/5 mutation=1, resume ok
TREATMENT_NEW_ENGINE:    5/5 mutation=1, resume ok
```

Raw: `raw/dup-mutate/`.

## Duplicate Mutation

**MEASURED.** No run observed `observed_mutations > 1`.  
`duplicate_mutate = false` under this fixture.

Does **not** mean the system is globally idempotent.

## State Integrity

**MEASURED.** Checkpoint present after interrupt; resume restored waiting graph and completed via job result without second provider execute.

## Resume Success

**1.0** (10/10 treatment runs).

## Continuation Identity

- `feature_id` constant (`e005-dup-mutate`)
- Node `test-only` → `satisfied` after resume
- Mutation log shows a **single** `run_id` per treatment rep (one job-file write)

## Limitations

- Side effect scope = **STATE_WRITE** (job JSON), not confirm-gated product writes
- OS process kill **NOT_MEASURED**
- `engine.pause()` not used as interrupt mechanism
- LOW_SAMPLE (n=5 per arm)
- Job-path only / not full product HITL

## Evidence

| ID | Artifact |
|----|----------|
| E005-DM-01 | `raw/dup-mutate/summary-metrics.json` |
| E005-DM-02 | `raw/dup-mutate/execution-matrix.json` |
| E005-DM-03 | per-rep `*-rep-*.json` |
| E005-DM-04 | invariant logs (103/7/5) |

## Conclusion

Under the tested job-path fixture, interruption followed by resume **did not** cause a second `JobFileExecutor.execute` / job-file mutation. Resume succeeded; checkpoint restore behaved consistently.

## Result Classification

**SUPPORTED** (scoped to job-path STATE_WRITE mutation + in-process interrupt/resume)

## Confidence

**HIGH** for this fixture scope (control + two treatment arms, clear metric, repeatable).  
Still not a claim of exactly-once for all side effects or OS-kill scenarios.

## Reproduction

`REPRODUCE.md`
