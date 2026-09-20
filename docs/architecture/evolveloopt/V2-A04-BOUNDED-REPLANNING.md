# V2 A04 — Automatic Bounded Replanning

**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Status:** `IMPLEMENTED`  
**Gap:** GAP-A04  

## Problem

```text
failure → Orchestrator.decide() → "replan" → event only → no new IR → spin / stall
```

`requestReplan(ir)` existed but required a human/agent to supply IR.

## Existing Replan API

| Piece | Role |
|-------|------|
| `Orchestrator.decide` | Decision only (`continuar` \| `corrigir` \| `replan`) |
| `ExecutionEngine.requestReplan(ir)` | Manual IR injection (still supported) |
| `PlannerReplan` event | Telemetry |

## Replan Contract

```text
Replanner.replan(ReplanInput) → REPLAN_PROPOSED | REPLAN_REJECTED | REPLAN_UNAVAILABLE
```

- **Does:** propose candidate `CapabilityIR`
- **Does not:** execute capabilities, call LLMs, bypass policy

Implementations:

- `DeterministicReplanner` — `RETRY_WITH_CHANGED_PROVIDER` (exclude failed provider)
- `UnavailableReplanner` — safe no-op

## Trigger Classification

| Disposition | Meaning | Auto-replan? |
|-------------|---------|--------------|
| `RETRYABLE` | Transient / DoD | No (engine retries first) |
| `REPLANABLE` | After retries / provider structural | Yes |
| `POLICY_BLOCKED` | Authority/policy denial | **Never** |
| `HUMAN_REQUIRED` | External jobs | No (`continuar`) |
| `FATAL` | Exhausted budgets | No |

`unrecoverable_failure` after retries ⇒ `REPLANABLE`, unless underlying code is policy-blocked.

## Planner / Replanner Boundary

```text
Agent/Planner / DeterministicReplanner  →  candidate IR
validateExecutableIR                   →  accept/reject
ExecutionEngine                        →  apply + execute
```

`ExecutionEngine` does **not** reason. It detect → request → validate → apply → execute.

## IR Validation

Every candidate passes `validateExecutableIR` before apply. Invalid ⇒ `REPLAN_REJECTED`.

## Plan Versioning

IR metadata:

- `plan_version`, `parent_plan_id`, `replan_id`, `plan_hash`, `execution_id`

Lineage: V1 → V2 (`parent = V1`) correlated by same `execution_id`.

## Anti-Loop

- `maxReplans` (default 3)
- `recent_plan_hashes` — duplicate candidate ⇒ `NO_PROGRESS`
- `lastFailureSignature` — same failure after a replan ⇒ `NO_PROGRESS`
- Engine `max_iterations` still applies

## Progress Detection

Progress requires a **different plan hash** (e.g. `exclude_providers` / `prefer_provider` change). Same hash ⇒ no progress.

## Policy Boundaries

Replan **cannot** convert `AUTHORITY_DENIED` / policy denial into allow. Engine stops with `POLICY_BLOCKED`.

## Side-Effect Risks

**At-least-once** risk remains: failed ≠ no side effect. Completed nodes are preserved by id/capability match; failed nodes may re-run. Full exactly-once is GAP-B04.

## Evidence

Planning evidence on proposal (`buildPlanningEvidence` with replan assumptions). Existing selection/worker evidence continues.

## Telemetry

| Event | When |
|-------|------|
| `ReplanRequested` | Auto-replan starts |
| `ReplanProposed` | Candidate IR ready |
| `ReplanRejected` | Validation / unavailable / policy |
| `ReplanApplied` | Graph replaced (preserving completed) |
| `ReplanExhausted` | max / no-progress |
| `PlannerReplan` | Compatibility |

## Deterministic Test Replanner

`DeterministicReplanner` proves runtime autonomy with provider A→B switch. Not general intelligence.

## Real LLM Replanner Status

```text
NOT_AVAILABLE
```

No LLM replanner wired. `cursor agent` / `@cursor/sdk` remain optional future backends implementing `Replanner` without changing the runtime contract.

## Known Limitations

- Strategies beyond provider exclusion are minimal
- Cost/token budgets still partial (GAP-B01)
- Side-effect idempotency not fully solved (GAP-B04)
- LLM planning autonomy not claimed

## Retry ≠ Replan

| | Retry | Replan |
|-|-------|--------|
| Plan identity | Same | New `plan_version` / hash |
| Action | Same semantic step | Different strategy/path |
| API | `RetryScheduled` | `Replan*` + new IR |

## Test Evidence

```text
npm test → 460/460
```

Includes provider-switch e2e, policy denial, no-replanner safe stop, no-progress, lineage/preserve completed, Intent→replan.

## Fake Autonomy Check

```text
failure → automatic SHOULD_REPLAN → DeterministicReplanner IR
  → validate → apply → continue → success
```

No manual `requestReplan`, no restart, no hand-edited `plan.ir.yaml`.
