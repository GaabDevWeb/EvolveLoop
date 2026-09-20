# ADR — Automatic Bounded Replanning Boundary

**Status:** Accepted (`evolve-v2`)  
**Date:** 2026-09-20  
**Relates:** GAP-A04  

## Decision

1. **`Replanner` ≠ `ExecutionEngine`.** The engine never generates free-form plans or calls an LLM. It classifies failures, asks a `Replanner` for a candidate `CapabilityIR`, validates, applies, executes.
2. **`Retry` ≠ `Replan`.** Retries reuse the same plan/node identity. Replans introduce new `plan_version` / `plan_hash` / lineage.
3. **Policy denial is never bypassed** by replanning.
4. **Reuse `CapabilityGraph` + `validateExecutableIR` + `requestReplan`** — no second IR type.

## Consequences

- Deterministic replanners (and future LLM backends) plug into one contract.
- Absence of a replanner is safe (`REPLAN_UNAVAILABLE`), not infinite retry.
- Bounded by `maxReplans`, hash anti-loop, and failure-signature no-progress.
