# SE-04 — Supervisor / Agent Delegation Runtime

**Status:** IMPLEMENTED  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Code:** `orchestrator/src/supervisor/`  
**Depends on:** SE-03 EngineeringTaskGraph, AgentExecutor, A03, B01, B04, A04

---

## Problem

An `EngineeringTaskGraph` was a validated work definition without an operational path to assign tasks to Agents, obtain structured decisions, and drive Runtime effects under existing authority boundaries.

---

## Context

```text
Requirements → Architecture → EngineeringTaskGraph
  → Supervisor → AgentExecutor → AgentDecision
  → Runtime (A03/B01) → Capability/Provider → Evidence/Telemetry
  → Task completion / A04 replan / B04 recovery
```

Invariants preserved:

| Distinction | Rule |
|-------------|------|
| Agent ≠ Role ≠ Capability | Eligibility uses contracts; Runtime authorizes |
| Task ≠ Execution | TaskRuntime overlay ≠ ExecutionEngine node state |
| TaskGraph ≠ CapabilityGraph | No fusion |
| Agent Decision ≠ Runtime Effect | RuntimeBridge only |
| Telemetry ≠ Evidence | Both emitted; Evidence proves |
| Retry ≠ Replan ≠ Redelegation | Distinct transitions |
| Checkpoint ≠ TaskGraph | AssignmentStore + SupervisorState |

---

## Boundary

**Supervisor does:** readiness, eligibility, claim/lease, delegation lifecycle, decision validation, RuntimeBridge handoff, evidence/telemetry, recovery hooks.

**Supervisor does not:** call Providers, execute Capabilities, bypass A03/B01, mutate Requirements/Architecture/TaskGraph baselines, auto-confirm A03 pauses.

**Agent does:** reason via AgentExecutor / ReasoningProvider.

**Agent does not:** call Provider/Capability, invent permissions, escape scope, approve own decisions, mark Runtime success.

---

## Domain model

- `AgentAssignment` — ownership + lease + attempt + lineage (`evolveloop.io/se/v1`)
- `DelegationRequest` — least-privilege task context (`context_authority: none`)
- `DelegationResult` — outcomes: `DECISION_PRODUCED | NEEDS_EXECUTION | BLOCKED | FAILED | INVALID | REQUIRES_REPLAN | WAITING_CONFIRMATION`
- `SupervisorState` — task runtime overlay + fingerprints (idempotency)

---

## Lifecycle (assignment)

```text
PENDING → CLAIMED → RUNNING → WAITING_RUNTIME → SUCCEEDED
                              ↘ FAILED | BLOCKED
CLAIMED|RUNNING|WAITING_RUNTIME → RECOVERING → CLAIMED (reclaim)
```

Invalid transitions throw `InvalidAssignmentTransitionError`.

---

## Authority model

1. Eligibility: deterministic role + capability allow/deny (no LLM).
2. Decision validation: schema + scope + forbidden caps + binding ids.
3. Effects: `SimulatedRuntimeBridge` / RuntimeBridge → `evaluatePreExecute` (A03).
4. Confirmation: `WAITING_CONFIRMATION` — Supervisor never auto-confirms.
5. POLICY_BLOCKED remains `BLOCKED` (never rewritten as success).

---

## Integrations

| Layer | Integration |
|-------|-------------|
| AgentExecutor | Only reasoning path |
| A03 | `evaluatePreExecute` in RuntimeBridge |
| B01 | max parallel assignments; budgets remain Runtime-owned |
| B04 | AssignmentStore lease + recover (at-least-once) |
| A04 | `REQUIRES_REPLAN` / `REPLAN_REQUEST` — Supervisor does not mutate graph |
| Evidence | `buildDelegationEvidence` |
| Telemetry | Delegation* / Agent* / Runtime* EventTypes |

---

## Failure semantics

| Class | Outcome |
|-------|---------|
| Agent / Reasoning failure | `FAILED` |
| Invalid decision | `INVALID` → assignment `FAILED` |
| Policy deny | `BLOCKED` / `POLICY_BLOCKED` |
| Confirmation | `WAITING_CONFIRMATION` |
| Runtime provider fail after ALLOW | `FAILED` |
| Replan signal | `REQUIRES_REPLAN` |

---

## Concurrency & claiming

- Exclusive lock file + lease (`AssignmentStore.claimAssignment`)
- Dual Supervisor claim while lease active → reject
- Expired lease → `recover()` releases lock, `RECOVERING`, reclaim allowed
- Diamond deps: A∥B then C

---

## Security / context

Delegation omits secrets, other tasks, full filesystem. Scope escape and capability escalation rejected in validation.

---

## Current limitations

- RuntimeBridge is gate + simulated effect (not full ExecutionEngine DAG fan-out).
- Live Ollama quality: **NOT_MEASURED**.
- Not exactly-once — at-least-once with fingerprint idempotency.
- No agent marketplace / RL routing.

---

## Future extension points

- PlanEmitter: Task → CapabilityIR
- Ranking plug-in on `selectEligibleAgents`
- Full ExecutionEngine wiring behind RuntimeBridge
- Eval harness metrics (completion rate, bypass rate, …)

---

## Eval plan (initial)

Metrics deferred to measured methodology: task completion rate, valid delegation rate, invalid decision rate, duplicate execution rate, recovery correctness, routing correctness, policy bypass rate, scope violation rate. Live LLM: **NOT_MEASURED**.
