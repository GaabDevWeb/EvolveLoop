# V2 B01 — Runtime Resource & Recovery Policy

## Problem

Policy fields `cost_budget`, `feature_timeout`, `fail_fast`, `provider_strategy_fallback`
were declared and partially resolved, but not enforced on the ExecutionEngine hot path.
Unbounded retry/replan/fallback and silent orphan events (`ProviderFallbackUsed`) blocked
claiming **bounded** autonomy.

## Existing Policy Architecture

`PolicyEngine` remains the single policy authority. B01 adds budget derivation and
enforcement hooks — no BudgetEngine / TimeoutEngine duplicates.

| Field | Declared | Resolved | Enforced (B01) |
|-------|----------|----------|----------------|
| retries | ✓ | ✓ | ✓ |
| max_parallel | ✓ | ✓ | ✓ (measured) |
| max_iterations | +spec | ✓ | ✓ (`POLICY_DEFAULTS.MAX_ITERATIONS`) |
| max_replans | +spec | ✓ | ✓ |
| max_provider_fallbacks | +spec | ✓ | ✓ |
| provider_strategy_fallback | ✓ | ✓ | ✓ (absent ⇒ disabled) |
| fail_fast | ✓ | ✓ | ✓ (terminal; no retry/fallback/replan) |
| feature_timeout | ✓ | ✓ | ✓ (loop boundary; remaining budget) |
| step_timeout | ✓ | ✓ | ✓ (request + mock soft cancel) |
| cost_budget.max_nodes | ✓ | ✓ | ✓ |
| token_budget | +spec | ✓ | ✓ when usage observed |
| reset_retries_on_replan | +spec | ✓ | ✓ (default true = explicit) |

## Resource Budget

`ExecutionBudget` from `resolveExecutionBudget(policy)` / `PolicyEngine.budget()`.
Named defaults in `POLICY_DEFAULTS` — no anonymous magic numbers in the loop.

## Retry Budget

Per-node `retry_count` vs `PolicyEngine.retriesFor`. Distinct from replan and iteration.
`RetryBudgetExceeded` emitted when retries exhausted before fallback/replan.

## Replan Budget

`max_replans` from policy snapshot (or engine option override). Exhaustion →
`REPLAN_BUDGET_EXCEEDED` + `ReplanBudgetExceeded` (not infinite plan versions).

## Provider Fallback

Same capability, new provider — **not** a replan.

Requires `provider_strategy_fallback` set. Tracks tried providers per node; prevents A→B→A.
Capped by `max_provider_fallbacks`. Events: `ProviderFallbackUsed`, `ProviderFallbackExhausted`.

## Fail Fast

`fail_fast: true` ⇒ first failure terminal: no retry, no fallback, no replan.
Does **not** bypass A03 gates/authority/evidence.

`rapid-prototype` builtin was orphan `fail_fast: true`; set to **false** so retries/replan
used by V2 tests remain valid. Enable via override when terminal-first is desired.

## Timeout Semantics

| Level | Source | Enforcement |
|-------|--------|-------------|
| Feature | `timeouts.feature_timeout` | Loop check; remaining ms shrinks child step timeout |
| Step | `timeouts.step_timeout` / remaining feature | Passed on `ExecuteRequest`; mock observes soft TIMEOUT |
| Autonomous cancel | — | **TIMEOUT_LIMITED** — hard process kill not claimed |

## Concurrency

`max_parallel` slices ready batch; `ConcurrencyLimited` when ready > scheduled.
Measured in tests (max concurrent ≤ 2).

## Token / Cost Budget

- `token_budget`: enforced against **observed** `ExecuteResult.usage.tokens` only.
  Unknown usage → `cost_unknown` / unknown counter — never invented.
- `cost_budget.max_nodes`: blocks further schedule when completed ≥ max.

## Policy Snapshot

Resolved once at `run()` start (`structuredClone`). Mid-run mutations to PolicyEngine
registry do not alter the active snapshot. Replans validate under the same snapshot.

## Resource Accounting

Per `execution_id`: iterations, replans, retries, provider_attempts, fallbacks,
nodes_completed, tokens_used, providers_tried, started_at_ms.

## Failure Strategy Order

```text
failure
  → fail_fast?        → FAIL_FAST (stop)
  → retries left?     → RetryScheduled
  → fallback allowed? → ProviderFallbackUsed
  → else              → unrecoverable → A04 replan if REPLANABLE
  → replan budget     → REPLAN_BUDGET_EXCEEDED
```

A03 gates run before every execute (including post-fallback / post-replan).

## A03 Interaction

```text
select → evaluatePreExecute (A03) → B01 remaining budget check → schedule → provider
```

## A04 Interaction

Replan does not refresh feature timeout or token/cost counters.
`reset_retries_on_replan` defaults true (explicit policy field).

## Evidence

Budget denials emit authority-shaped evidence with limit/observed/reason.

## Telemetry

`FailFastTriggered`, `RetryBudgetExceeded`, `ProviderFallbackUsed`,
`ProviderFallbackExhausted`, `ReplanBudgetExceeded`, `ExecutionTimeout`,
`BudgetExceeded`, `CostBudgetExceeded`, `ConcurrencyLimited`.

## Known Limitations

- Process sandbox: **NOT IMPLEMENTED** (workspace path auth ≠ sandbox).
- Hard cancel of in-flight providers: **TIMEOUT_LIMITED** (observation + soft mock).
- Checkpoint persistence of accounting across crash: **B04**.
- Monetary cost without provider reporting: **UNAVAILABLE** (not invented).

## Test Evidence

```text
npm test -- tests/integration/b01-resource-policy.test.ts
→ 17/17
Full suite: see V2-B01-STATUS / foundation status
```
