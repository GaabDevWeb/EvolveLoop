# ADR: Checkpoint Crash Recovery

- **Status:** Accepted
- **Date:** 2026-09-20
- **Branch:** evolve-v2
- **Related:** GAP-B04, B01 policy snapshot, A02 JobStore leases

## Context

Graph-only checkpoints could not restore budgets, plan lineage, or policy across process death.

## Decision

1. Checkpoint authority is `jobsDir/checkpoints/{feature_id}.json` (schema v2).
2. Recovery ownership via exclusive lease lock (local FS).
3. Delivery: **AT_LEAST_ONCE** for in-flight nodes; idempotency is provider/artifact concern.
4. Side effects after crash are never invented as success.
5. Policy snapshot and plan lineage from B01/A04 survive restart.
6. Atomic rename writes; corrupt/unsupported → fail closed.

## Consequences

- Operators may restart a worker; auto claim+resume does not require manual JSON edits.
- Sandbox and hard cancel remain out of scope.
