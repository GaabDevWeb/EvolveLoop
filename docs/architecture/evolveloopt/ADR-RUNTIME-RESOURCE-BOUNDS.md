# ADR: Runtime Resource Bounds

- **Status:** Accepted
- **Date:** 2026-09-20
- **Branch:** evolve-v2
- **Related:** GAP-B01, A03, A04, PolicyEngine

## Context

Autonomy without resource bounds is unbounded loops (retry/replan/fallback/time).
Policy fields existed as orphans. Agents must not own recovery limits.

## Decision

1. Budgets belong to **runtime PolicyEngine** → `ExecutionBudget`, enforced by ExecutionEngine.
2. Retry, provider fallback, and replan remain **distinct** strategies with explicit order.
3. Policy is **snapshotted** once per `run()`; replans inherit the same snapshot.
4. Runtime owns enforcement; agents only propose IR/actions.
5. Absent usage metrics ⇒ unknown — never invent cost/tokens.

## Consequences

- `fail_fast` is real; `rapid-prototype` default set to false to preserve intentional recovery.
- Named `POLICY_DEFAULTS` replace loop magic numbers.
- Hard process sandbox / crash-resume accounting deferred (B04).
