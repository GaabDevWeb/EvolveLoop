# ADR — Engineering Worker Execution Loop (SE-05)

**Status:** Accepted  
**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Related:** `V2-SE05-ENGINEERING-WORKER.md`, `ADR-SUPERVISOR-AGENT-DELEGATION.md`, `ADR-RUNTIME-ENFORCED-GATES.md`, `ADR-BOUNDED-REPLANNING.md`, `ADR-CHECKPOINT-CRASH-RECOVERY.md`

---

## Context

After SE-04, TaskGraph work can be delegated, but closing `BRIEF → working software` requires a bounded materializer that applies proposals through existing Runtime authorities without granting Agents execution power or inventing a second orchestrator.

## Decision

1. **Introduce `EngineeringWorker`** as a non-Agent materializer under `orchestrator/src/engineering/`.
2. **Reuse DeterministicProvider** for `filesystem.write` and allowlisted `test.run` (shell backend, distinct capability).
3. **Every effect passes `evaluatePreExecute` (A03)** before Provider.execute.
4. **Completion requires `EngineeringValidationResult`** with runtime-verified tests — never Agent self-certification.
5. **Repair ≠ Retry ≠ Replan** — `classifyEngineeringFailure` (separate from A04 `classifyFailure`); replan signals `REPLAN_REQUIRED` without a second Replanner.
6. **WorkerCheckpointStore** provides AT_LEAST_ONCE recovery with content fingerprints for idempotent re-apply.
7. **Sandbox remains NOT_IMPLEMENTED**; scope is path restriction only.

## Consequences

- Real brownfield fixture E2E proves filesystem + `npm test` effects.
- SE-04 SimulatedRuntimeBridge remains for pure decision tests; SE-05 Worker is the real-effect path.
- Live LLM coding quality stays NOT_MEASURED until a rigorous eval exists.

## Alternatives rejected

- Agent-direct `fs`/`child_process`.
- Second Capability Registry / Policy Engine.
- Claiming sandbox or exactly-once.
- Auto git commit as DoD.
