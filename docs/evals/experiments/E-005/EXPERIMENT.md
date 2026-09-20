# E-005 — HITL RunState fixture (job-path scope)

## Hypothesis

A minimal job fixture can run → wait (external) → abandon process boundary → restore from checkpoint → resume with `resume_success=1`, without plaintext secrets in persisted state, and without duplicate mutating side-effects when approval gates writes.

## Research Origin

- `docs/research/experiments/E-005-hitl-runstate-fixture.md`
- Links: H-005, GAP-005, P-004/P-009
- Readiness after sync: **PARTIALLY_READY** (jobs restored; full product HITL UX not claimed)

## Baseline

- `baseline-v1-2026-09-18`
- Jobs/Resume/Pickup OBSERVED; HITL PARTIALLY_OBSERVED
- Source revision tree hash: `5600f9df…`

## Experimental Design

**Scope executed:** orchestrator **job path** only (JobFileExecutor → JOB_PENDING → checkpoint → external complete → `--resume`).

**Not executed:** OS process kill; interactive approval UX; mutating write gated by confirm-wait; MegaBrain Evidence Bus.

## Control

Existing package suite `tests/integration/job-resume.test.ts` (2 cases: wait-for-jobs; checkpoint resume).

| Repetitions | Successful | Failed |
|-------------|------------|--------|
| 5 | 5 | 0 |

## Treatment

Isolated harness (temporary under `tests/evals/`, removed after run; canonical source in `E-005/harness/`):

1. Engine run with `wait_for_jobs_ms=0` → `awaiting_external_jobs` + checkpoint
2. Scan checkpoint JSON for secret-like keys/values
3. External `JobStore.completeJob` with evidence
4. **New** `ExecutionEngine` instance + `resume: true` (process-boundary analogue)

| Repetitions | Successful | Failed | Sample |
|-------------|------------|--------|--------|
| 5 | 5 | 0 | LOW_SAMPLE |

## Metrics

| Metric | Result |
|--------|--------|
| resume_success | **1.0** (5/5) |
| checkpoint_present_before_resume | **1.0** |
| secret_exfiltration_in_state | **0** |
| duplicate_mutate_count | **NOT_MEASURED** (no mutating+approval fixture) |

## Procedure

```bash
cd orchestrator
# Control
for i in 1 2 3 4 5; do npx vitest run tests/integration/job-resume.test.ts; done
# Treatment: temporary harness then delete (see raw/)
E005_RAW_DIR=docs/evals/experiments/E-005/raw \
  npx vitest run tests/evals/_e005_experiment_harness.test.ts
rm tests/evals/_e005_experiment_harness.test.ts
```

## Raw Evidence

- `raw/control-job-resume.txt`, `raw/control-summary.json`
- `raw/harness-runs.txt`, `raw/harness-summary.json`
- `raw/last-run-metrics.json`, `raw/metrics-rep-*.json`
- `raw/checkpoint-sample.json`

## Results

Job-path interrupt/persist/pickup-complete/resume works reliably under simulated process boundary. Checkpoint sample contained no secret-pattern hits.

## Interpretation

Within **job-path HITL**, hypothesis components `resume_success` and `secret_exfiltration_in_state=0` are supported. Full research fixture (kill + mutate + approval) remains untested → do not claim full HITL product readiness.

## Limitations

- Process kill = new engine instance, not OS SIGKILL
- No write-mutating capability under approval wait
- `duplicate_mutate_count` unavailable
- LOW_SAMPLE (n=5)
- Confirm authority path still fail-fast (not wait) — out of this measurement

## Conclusion

Job-path resume/checkpoint integrity is empirically effective under tested conditions.

## Result Classification

**SUPPORTED** (scoped to job-path; not full E-005 research fixture)

## Reproducibility

See `raw/` + harness source `E-005/harness/e005-metrics.test.ts`. Environment: Node v24.15.0, Vitest 2.1.9, baseline V1 tree.
