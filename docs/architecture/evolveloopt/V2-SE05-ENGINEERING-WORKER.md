# SE-05 — Engineering Worker / Implementation Execution Loop

**Status:** IMPLEMENTED  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Code:** `orchestrator/src/engineering/`  
**Depends on:** SE-04 Supervisor, DeterministicProvider (`filesystem.*`, `test.run`), A03, B01, B04, A04

---

## Problem

SE-04 could delegate and obtain Agent decisions, but implementation proposals did not materialize into **verifiable workspace changes + real tests + structured validation**.

---

## Architecture

```text
Agent = reasons / proposes
Supervisor = delegates / lifecycle
EngineeringWorker = materializes via authorities
Runtime (A03/B01/DeterministicProvider) = authorizes & executes
Evidence / Telemetry = prove & observe
```

**Sandbox = NOT_IMPLEMENTED** (path restriction ≠ sandbox).

---

## Loop

```text
ImplementationProposal
  → validate (scope, capabilities, bindings)
  → filesystem.write (A03 → DeterministicProvider)
  → test.run allowlist (npm test / node --test / …)
  → EngineeringValidationResult
  → COMPLETE | REPAIR | BLOCK | REPLAN_REQUIRED
```

Failure path:

```text
TEST_FAIL → classifyEngineeringFailure → repair (≠ retry ≠ replan)
  → A04 signaled only as REPLAN_REQUIRED (no second Replanner)
```

---

## Contracts

| Artifact | Role |
|----------|------|
| `EngineeringWorkRequest` | Bound least-privilege work contract |
| `ImplementationProposal` / ops | Deterministic create/replace/patch/append/delete/rename |
| `TestExecutionResult` | Runtime-verified only (`verified_by_runtime: true`) |
| `EngineeringValidationResult` | Completion authority |
| `EngineeringWorkerCheckpoint` | AT_LEAST_ONCE recovery (fingerprints) |

---

## Authority

- Agent never calls Provider / Capability / `fs` / shell.
- Worker never raises B01 budgets.
- POLICY_BLOCKED / CONFIRMATION_REQUIRED → BLOCK (not fake success).
- Fake “tests passed” without runtime execution cannot COMPLETE.

---

## Fixture E2E

`tests/fixtures/se05-brownfield/` — brownfield `multiply` + incomplete `add`.

Happy path writes real files and runs `npm test` (`node --test`).

Negative path: wrong `add` → real test fail → repair proposer → PASS; failure events retained in telemetry.

---

## Limitations

- Git commit/push not required / not automatic.
- Full ExecutionEngine DAG fan-out optional behind future PlanEmitter.
- Live Ollama quality: **NOT_MEASURED**.
- Exactly-once not claimed.
- Sandbox NOT_IMPLEMENTED.

---

## Metrics (future)

task completion, test pass rate, repair success, replan rate, duplicate effect rate, recovery correctness, policy bypass rate, scope violations — do not fabricate numbers.
