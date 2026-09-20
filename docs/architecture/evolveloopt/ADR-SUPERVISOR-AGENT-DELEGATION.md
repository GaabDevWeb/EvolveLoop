# ADR — Supervisor / Agent Delegation (SE-04)

**Status:** Accepted  
**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Related:** `V2-SE04-SUPERVISOR-DELEGATION.md`, `ADR-TASK-GRAPH-BOUNDARY.md`, `ADR-AGENT-RUNTIME-BOUNDARY.md`, `ADR-RUNTIME-ENFORCED-GATES.md`, `ADR-CHECKPOINT-CRASH-RECOVERY.md`, `ADR-BOUNDED-REPLANNING.md`

---

## Context

SE-03 produced an `EngineeringTaskGraph` that must become operationally delegable without granting Agents or the Supervisor new execution authority. Existing AgentExecutor, A03 gates, B01 budgets, B04 checkpoint/job lease patterns, Evidence, and Telemetry must be reused — not duplicated.

## Decision

1. **Introduce `orchestrator/src/supervisor/`** as the bounded context for readiness, eligibility, claim/lease, delegation lifecycle, decision validation, and RuntimeBridge handoff.
2. **AgentExecutor remains the only reasoning entry** — Supervisor maps `DelegationRequest` → `AgentExecutionRequest`.
3. **RuntimeBridge is the only effect path** from validated `AgentDecision` — never Supervisor→Provider or Agent→Capability.
4. **Task runtime overlay** (`TaskRuntimeStatus` / `SupervisorState`) stays separate from CapabilityGraph / ExecutionEngine node state.
5. **Claim/lease** mirrors JobStore at-least-once semantics; dual claim under active lease fails.
6. **Engineering decision aliases** (`IMPLEMENTATION_PROPOSAL`, `REPLAN_REQUEST`, …) map into existing `AgentDecision` types or explicit outcomes — they do not duplicate SE-01..03 baseline proposal authority on the delegation path.
7. **A04** is signaled via `REQUIRES_REPLAN`; Supervisor does not mutate TaskGraph.
8. **A03 CONFIRMATION_REQUIRED** maps to `WAITING_CONFIRMATION` without auto-confirm or confirmation inheritance.

## Consequences

- SE-04 tests prove E2E chain, adversarial authority, recovery, diamond concurrency, and idempotency fingerprints.
- Live Ollama eval remains opt-in / NOT_MEASURED until a rigorous methodology exists.
- Future PlanEmitter can consume completed assignments without changing authority boundaries.

## Alternatives rejected

- Embedding Supervisor inside ExecutionEngine.
- Second Policy Engine / Capability Registry / Evidence stack.
- Treating Agent “done” as Task completion without validation/runtime evidence when effects are required.
- Exactly-once claims without a proven protocol.
