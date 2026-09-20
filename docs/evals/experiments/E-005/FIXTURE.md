# E-005 Fixture

## Purpose

Measure whether job-path interrupt → persist → pickup/complete → resume causes **duplicate** `JobFileExecutor` mutations (pending job JSON writes) relative to an uninterrupted control.

## Objects Under Test

- `ExecutionEngine.run` (`wait_for_jobs_ms`, `resume`)
- `JobFileExecutor` / `CursorSkillProvider` (via plugin loader)
- `JobStore.completeJob` + `jobResultToExecuteResult`
- `saveCheckpoint` / `loadCheckpoint`
- Real `RunState` / graph snapshot in checkpoint (not mocked)

## Mutation Model

```text
mutation = one InstrumentingJobFileExecutor.execute() call
         = append mutation JSONL record
         + JobFileExecutor writes {run_id}.json (production path)
```

- Deterministic, local (tmpdir), reversible (tmpdir discarded)
- **Not** artificially idempotent (no `if alreadyMutated return`)
- `expected_mutations = 1` for single-node IR
- `duplicate_mutate = observed_mutations > 1`

Scope of side effect: **STATE_WRITE** (job file / mutation log), not arbitrary external I/O.

## Interruption Model

```text
wait_for_jobs_ms = 0  →  run ends with blocked_reason=awaiting_external_jobs
                       →  checkpoint persisted
```

Then external `completeJob` + `run({ resume: true })`.

| Mode | Meaning |
|------|---------|
| TREATMENT_SAME_ENGINE | Same `ExecutionEngine` instance, same Node process |
| TREATMENT_NEW_ENGINE | New `ExecutionEngine`, same Node process |
| OS process kill | **NOT_MEASURED** |
| `engine.pause()` mid-loop | Not used as checkpoint interrupt (different API) |

**SAME_PROCESS_SUPPORTED** for checkpoint interrupt/resume in-process.  
**OS_PROCESS_KILL** = NOT_MEASURED.

## Control

Uninterrupted: `wait_for_jobs_ms=10000`, complete pending job while first `run()` still polling → completion. Expect `mutation_count=1`.

## Treatment

Interrupt after first mutation (job write), complete externally, resume (same or new engine). Expect still `mutation_count=1` if resume does not re-invoke provider execute.

## Measurements

| Metric | Definition |
|--------|------------|
| resume_success | treatment second `run` success |
| duplicate_mutate | observed > expected |
| state_restoration | checkpoint present then resume loads graph |
| completion_success | final success |
| continuation identity | feature_id, node id/status, mutation run_id set |

## Isolation

Each rep uses `mkdtemp` under OS tmpdir; artifacts under `raw/dup-mutate/` only. Temp vitest file removed after run.

## Limitations

- Mutation = job-file write instrumentation, not a product filesystem.write under confirm-wait
- OS kill not measured
- LOW_SAMPLE (n=5 per condition)
- Does not prove general exactly-once for all side effects

## Reproduction

See `REPRODUCE.md`.
