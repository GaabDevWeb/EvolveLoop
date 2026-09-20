# PT-002 — Job-path resume after OS process kill (STATE_WRITE)

## Status

HARDENED_PENDING_GATE

## Decision Context

- ADR-DR-0001 ACCEPTED: KEEP job-path resume (scoped); DEFER global exactly-once  
- Prior gate: NEEDS_MORE_EVIDENCE (missing rollback / isolation)  
- Related future experiment: E-005-OS-KILL  
- E-005 measured SAME_ENGINE / NEW_ENGINE in **same Node process** only; OS kill NOT_MEASURED  
- `prototype_success ≠ production_adoption`  
- `prototype_failure ≠ global_rejection`  
- Success must **not** be used to claim global exactly-once or full HITL  

## Question

After a **true OS process termination** mid job-path wait, does resume from durable `jobsDir` checkpoint complete with **observed_mutations = 1** (no duplicate JobFileExecutor STATE_WRITE) and defined resume_success?

## Hypothesis

Under OS kill + process restart, job-path resume remains free of duplicate STATE_WRITE mutation for the E-005-class fixture (mutation_count stays 1; resume succeeds).

## Scope

| Item | Bound |
|------|--------|
| Side effect | STATE_WRITE job JSON via JobFileExecutor only |
| Interrupt | OS process kill / termination (not NEW_ENGINE-in-same-process) |
| Resume | New process loads checkpoint from disposable jobsDir |
| HITL | Job-path only; not confirm UX / full HITL |
| Exactly-once | Fixture-scoped observation only |

## Non-Goals

- Proving global exactly-once  
- Confirm-gated product writes (separate E-005-CONFIRM-SIDE-EFFECT)  
- Replacing jobs/ architecture  
- Using `engine.pause()` as substitute for OS kill  
- Equating NEW_ENGINE with OS kill  

## Preconditions

- ADR-DR-0001 ACCEPTED  
- E-005 fixture reproducible conceptually  
- Ability to SIGKILL/terminate Node process under test harness  
- Disposable `jobsDir` on local filesystem  
- Mutation instrumentation equivalent to E-005 (append-only log; no fake idempotency)  

## Experimental Surface

`ExecutionEngine` + `jobs/` checkpoint/resume + JobFileExecutor STATE_WRITE. No sandbox/security prototype.

## Inputs

- Fixture IR / feature id analogous to E-005 dup-mutate  
- Disposable jobsDir path under ephemeral workspace  
- Kill signal / termination method documented  

## Control

Uninterrupted completion in disposable jobsDir (mutation=1), same as E-005 CONTROL spirit — optional calibration arm.

## Treatment

1. Start run with wait-for-jobs path  
2. OS-terminate process while waiting  
3. Start **new process**  
4. Resume from checkpoint  
5. Complete job externally as in E-005  
6. Count JobFileExecutor mutations  

Minimum INITIAL SAMPLE: document n (suggest ≥5 treatment runs); mark as INITIAL if small.

## Measurements

| Metric | Unit | Source | Collection | Classification | Interpretation |
|--------|------|--------|------------|----------------|----------------|
| os_kill_performed | bool | harness | record PID death | DIRECT | required |
| process_restart | bool | harness | new PID | DIRECT | required |
| observed_mutations | count | mutation log | append log length | DIRECT | expect 1 |
| duplicate_mutate | bool | derived | mutations>1 | DIRECT | expect false |
| resume_success | bool/ratio | run result | final success | DIRECT | define before run |
| checkpoint_present | bool | jobsDir | file exists | DIRECT | after kill |
| wall_clock_duration | s | harness | OBSERVED LATENCY | DIRECT | not benchmark |

## Success Criteria

All of:

1. OS termination MEASURED (not simulated by NEW_ENGINE alone)  
2. New process resume MEASURED  
3. `observed_mutations = 1` on successful treatment runs (or document failures)  
4. `resume_success` defined and recorded  
5. Isolation + rollback verification PASS  
6. No baseline / source Skills / orchestrator source mutation  

## Failure Criteria

| Class | Condition |
|-------|-----------|
| functional failure | Cannot kill/restart or checkpoint missing after kill |
| measurement failure | Mutation log absent/unreliable |
| isolation violation | Writes outside disposable jobsDir into production paths |
| rollback failure | Disposable jobsDir or host state not cleaned |
| unexpected side effect | Claim language upgraded to global exactly-once in artifacts |
| baseline contamination | Baseline checksums change |

## Safety Constraints

- PRODUCTION_STATUS: NOT_IMPLEMENTED  
- Must not claim exactly-once globally from PT-002 alone  
- HITL remains PARTIALLY_OBSERVED regardless of outcome  

## Isolation

```yaml
isolation:
  runtime_isolation: "No orchestrator/src edits; use existing jobs APIs only"
  filesystem_isolation: "Disposable jobsDir under docs/architecture/finalization/prototypes/workspaces/PT-002/ or /tmp/pt-002-*; never default production jobs path"
  network_isolation: "NOT_REQUIRED"
  state_isolation: "Feature ids prefixed pt002-; no shared production checkpoints"
  process_isolation: "Kill only the prototype Node PID; do not kill unrelated user processes"
  data_isolation: "Evidence copies redacted; disposable dir deleted after promotion"
```

## Rollback

```yaml
rollback:
  strategy: "Remove disposable jobsDir workspace; kill any leftover prototype PIDs; restore cwd/env"
  scope: "Ephemeral jobsDir + process only"
  verification: "jobsDir gone or empty; no pt002-* leftovers in production data-dir; baseline checksum OK; orchestrator/src hash unchanged"
  failure_handling: "STOP; mark INVALID; manual cleanup checklist; do not delete baseline to 'fix'"
```

## Cleanup

- Delete disposable jobsDir after evidence export  
- Retain summary metrics JSON only under finalization or future experiment raw when authorized  
- Do not rewrite E-005 historical raw  

## Data Handling

| Data | Lives | Survives | Deleted |
|------|-------|----------|---------|
| Mutation logs | disposable jobsDir | summary metrics | raw dirs |
| Checkpoints | disposable | none required | yes |
| PIDs/logs | ephemeral | redacted | yes |

## Runtime Boundaries

- Existing jobs/resume only  
- No new recovery primitive  
- Instrumenting wrapper allowed **only** in disposable test harness files that are removed after campaign (must not land in production src permanently without separate ADR) — prefer copy-under-tests pattern used historically for E-005, deleted after  

## Must Not Change

- `docs/evals/baseline/**`  
- ADR-DR-0001 KEEP decision interpretation (may refine with new evidence, not silently reverse)  
- Global exactly-once claims  
- `.cursor/skills/**`  

## Reproducibility

Record: OS, node version, kill method, jobsDir path, feature_id, mutation log hashes, run_ids, seed if any.

## Evaluation

Pass if treatment arms meet mutation=1 and resume_success under OS kill. Fail/INVALID on isolation or measurement failure. Do not generalize beyond STATE_WRITE job-path.

## Expected Evidence

- Kill/restart proofs  
- Mutation counts per run  
- Checkpoint presence after kill  
- Isolation/rollback verification  

## Known Limitations

- LOW_SAMPLE likely  
- STATE_WRITE only  
- OS-specific kill behavior  
- Does not cover confirm-path side effects  

## Open Questions

- Exact kill signal (SIGKILL vs SIGTERM) policy for the campaign?  
- Who completes the external job after restart?  

## Related ADRs

ADR-DR-0001

## Related Experiments

E-005; E-005-OS-KILL

## Prototype Gate Readiness

| Dimension | Assessment |
|-----------|------------|
| Question | clear |
| Hypothesis | clear |
| Scope | bounded |
| Success | measurable |
| Failure | defined |
| Isolation | adequate |
| Rollback | defined |
| Measurement | adequate |
| Baseline protection | yes |
| Runtime contamination risk | low–medium (process kill must target only prototype PID) |

## Hardening Decision

```text
READY_FOR_GATE
```

Not APPROVED. Next Prototype Gate decides.
