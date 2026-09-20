# V2 B04 — Checkpoint / Resume / Crash Recovery

## Problem

B01 made budgets real, but a process death still lost accounting / plan lineage /
policy snapshot. Existing checkpoint was graph-only (v1), non-atomic, and
`--resume` did not reconstruct execution budgets.

## Existing State Model

| Entity | Pre-B04 | B04 |
|--------|---------|-----|
| EngineCheckpoint | graph + policy_id | schema v2 + IR + policy_snapshot + accounting |
| SkillJob | claim/lease AT_LEAST_ONCE | unchanged |
| Node running after crash | ambiguous | reconciled → pending (RETRYABLE) |
| waiting (external job) | kept | REQUIRES_RECONCILIATION (status kept) |

## Checkpoint Model

`checkpoint_schema_version: 2` with identity:

```text
checkpoint_id, revision (monotonic), feature_id, execution_id,
plan_version, plan_hash, current_ir, policy_snapshot, graph, accounting
```

## Persistence Semantics

**AT_LEAST_ONCE** for in-flight provider work after crash.
Exactly-once is **not** claimed.

## Atomicity

`write temp → fsync (best effort) → rename`. Crash during write leaves prior valid file.

## Versioning

Unsupported/legacy/corrupt → `CheckpointRejected` / `RECOVERY_FAILED` (no guess).

## Recovery Discovery

`listRecoverableExecutions(jobsDir)` + optional `auto_recover`.

## Lease / Ownership

`claimExecutionRecovery` / `.recovery.lock` — one recovery owner; expired lease stealable.

## In-Flight Reconciliation

```text
satisfied → SAFE_TO_RESUME
running → pending (RETRYABLE), keep retry_count
waiting → keep waiting (external job poll)
```

## Crash Semantics

Real SIGKILL tested: A complete → hang on B → kill → new process resume → C complete.
A not re-executed; B may retry (AT_LEAST_ONCE).

## Retry / Replan Accounting

Persisted in checkpoint; restored on resume — counters do not reset to zero.

## Policy Snapshot

Restored from checkpoint; post-crash config/overrides do not replace P1.

## Resource Accounting

iterations, replans, retries, tokens, started_at_ms (absolute wall clock for deadlines).

## Plan Lineage

`current_ir` + `plan_hash` + `replan_count` persisted on replan_applied.

## Side-Effect Semantics

Idempotent artifact overwrite recommended for AT_LEAST_ONCE. Ambiguous remote side effects → REQUIRES_RECONCILIATION (not invented success).

## Autonomous Skill Recovery

JobStore lease expiry remains; engine checkpoint covers DAG + budgets.

## External Executor Limitations

External agents after job write are outside engine control — EXTERNAL_EXECUTION_LIMITATION (A03).

## Corruption Handling

Corrupt JSON / wrong schema → safe failure.

## Multi-Worker Recovery

Two-worker claim test: second gets `active_lease`.

## Real Process-Kill Test

`tests/integration/b04-checkpoint-recovery.test.ts` + `tests/helpers/b04-crash-worker.ts`.

## Known Limitations

```text
process sandbox = NOT_IMPLEMENTED
hard provider cancellation = LIMITED
exactly-once = NOT claimed (AT_LEAST_ONCE)
checkpoint does not mark node running mid-execute (last completed persist)
```

## Test Evidence

```text
npm test -- tests/integration/b04-checkpoint-recovery.test.ts
→ includes SIGKILL + restart (PASS)
```
