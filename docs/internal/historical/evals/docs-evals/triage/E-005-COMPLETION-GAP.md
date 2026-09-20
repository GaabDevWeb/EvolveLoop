# E-005 Completion Gap

## What did E-005 prove?

Under `baseline-v1-2026-09-18`, **job-path** HITL:

| Claim | Evidence |
|-------|----------|
| Engine blocks with `awaiting_external_jobs` | job-resume + harness |
| Checkpoint persisted | `loadCheckpoint` non-null |
| New engine instance + `resume: true` completes successfully | 5/5 treatment |
| `resume_success = 1.0` | metrics JSON |
| No secret-like keys/values in sampled checkpoint | scan = 0 |
| Control suite stable | job-resume 5/5 |

Classification: **SUPPORTED** within job-path scope; confidence **MEDIUM**.

## What did it not prove?

- Full product HITL / approval UX
- OS process kill + restore (only new `ExecutionEngine` instance)
- `duplicate_mutate_count = 0` (**NOT_MEASURED**)
- Confirm-gated write that waits then resumes
- Continuation identity across arbitrary crashes
- Secret absence beyond heuristic regex on one checkpoint shape
- MegaBrain Evidence Bus behavior

## What measurement is missing?

Primary: **`duplicate_mutate_count`** on a mutating capability with interrupt/resume.

Secondary (confidence raise): real process kill; richer secret schema; larger sample; continuation node identity asserts.

## Can that measurement use existing runtime?

**Yes**, for the primary metric:

1. Use existing **jobs wait** path (already proven) **or** Deterministic `filesystem.write` with `allowWrite`/`confirmed` flags set so write proceeds once.
2. Observe filesystem (write count / content hash) before and after resume.
3. Interrupt between first intended write and spurious second write (engine abandon + resume, same as prior harness).

**No new primitive required** if jobs-as-HITL is accepted.

**Confirm-wait** would require runtime/architecture change (confirm currently fails fast at `deterministic/index.ts:199-200`).

## What minimal fixture/harness is required?

```text
FIXTURE:
  - workspace temp dir
  - target file path initially absent
  - IR/job that performs exactly one filesystem.write (or external job script write)
  - mid-flight abandon after pending/waiting OR after first write completed once
  - resume / complete path
METRIC:
  - count of create/write events on target (expect 1)
  - resume_success
  - optional: checkpoint secret scan (already partially done)
```

Do **not** implement confirm-wait in this fixture unless Blocker D is decided.

## What would increase confidence from MEDIUM → HIGH?

| Step | Effect |
|------|--------|
| Measure `duplicate_mutate_count` with fixture above | Closes main research metric gap |
| n≥20 or multi-seed runs | Reduces LOW_SAMPLE |
| Optional OS kill of Node worker holding engine | Closer to research “kill process” |
| Explicit assertion of node id / feature_id continuity | Continuation identity |
| Document jobs-as-HITL SSOT (decision, not code) | Removes confirm-wait ambiguity |

## Traceability

```yaml
traceability:
  experiment: E-005
  original_hypothesis: resume_success=1; duplicate_mutate=0; secrets=0
  research_source: docs/research/experiments/E-005-hitl-runstate-fixture.md
  implementation_state: jobs/checkpoint/resume IMPLEMENTED
  baseline_state: HITL PARTIALLY_OBSERVED
  blocker: FIXTURE_GAP + OBSERVABILITY_GAP (+ optional ARCH for confirm-wait)
  enablement: TEST_FIXTURE / MINIMAL_HARNESS
  future_execution_state: READY_AFTER_FIXTURE
```
