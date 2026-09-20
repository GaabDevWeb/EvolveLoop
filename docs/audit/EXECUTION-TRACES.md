# EXECUTION-TRACES

**Date:** 2026-09-18  
**Note:** Full CLI e2e with jobs not runnable on this tree. Traces below are **static call-path OBSERVED** + **unit test execution** where noted.

---

## Trace A — Capability IR unit path (simple)

```yaml
execution_trace:
  id: TRACE-A
  kind: STATIC_CALL_PATH + UNIT_TESTS
  input: CapabilityIR YAML (tests/fixtures or inline in full-cycle — unloadable here)
  entrypoint: ExecutionEngine.run (src/engine/execution-engine.ts:100)
  components:
    - component: IR Validator
      file: src/ir/validator.ts
      symbol: validateIR
      role: reject invalid IR
    - component: GraphStore
      file: src/graph/graph-store.ts
      role: node state
    - component: PolicyEngine
      file: src/policies/policy-engine.ts
      symbol: resolve
      role: ExecutionPolicy knobs
    - component: Scheduler
      file: src/scheduler/scheduler.ts
      symbol: readyNodes / schedule
      role: topological ready set
  transitions: pending → running → satisfied|failed|skipped|waiting
  capability_calls: per ready node.capability
  provider_calls: ProviderRouter.execute
  policy_decisions: gateEnabled / retries / strategy
  evidence: allEvidence[] accumulation
  telemetry: MetricsAccumulator; optional JsonlEventPersister
  validation: validateEvidence on provider evidence
  final_output: RunResult
  execution_evidence: |
    Selected unit tests PASSED 2026-09-18 (ir, registry, policy).
    full-cycle.test.ts FAILED TO LOAD (missing jobs/).
  status_notes:
    jobs_module: NOT_OBSERVED_IN_TREE
```

---

## Trace B — Capability → Provider (Deterministic + Authority)

```yaml
execution_trace:
  id: TRACE-B
  kind: UNIT_TEST_EXECUTED
  input: DeterministicProvider.execute with AuthorityRequest
  entrypoint: DeterministicProvider (src/providers/deterministic/index.ts)
  components:
    - component: CapabilityAuthority
      file: src/authority/capability-authority.ts
      symbol: authorize (line 85)
      role: allow|deny|confirm
    - component: DeterministicProvider
      file: src/providers/deterministic/index.ts
      symbol: authorize call ~184; AUTHORITY_DENIED ~197
      role: enforcement
  transitions: request → authorize → execute|fail
  capability_calls: filesystem|git|shell|knowledge|…
  provider_calls: DeterministicProvider
  policy_decisions:
    authority: deny|confirm|allow
    execution_policy: NOT_ON_THIS_PATH
  evidence: authority evidence builders when emitted
  telemetry: NOT_OBSERVED in unit path
  validation: fail codes AUTHORITY_DENIED / CONFIRMATION_REQUIRED
  final_output: ExecuteResult success|fail
  execution_evidence: |
    npx vitest run tests/unit/authority.test.ts
    tests/unit/deterministic-capabilities.test.ts — PASSED (14 tests) 2026-09-18
```

---

## Trace C — Policy (ExecutionPolicy gate skip)

```yaml
execution_trace:
  id: TRACE-C
  kind: UNIT_TEST_EXECUTED
  input: ExecutionPolicy with gate disabled
  entrypoint: PolicyEngine + Scheduler.readyNodes
  components:
    - component: PolicyEngine
      file: src/policies/policy-engine.ts
      role: resolve policy id → ExecutionPolicy
    - component: Scheduler
      file: src/scheduler/scheduler.ts
      role: mark gate nodes skipped when gateEnabled=false
  transitions: gate node → skipped (not capability deny)
  capability_calls: NOT_OBSERVED (skipped)
  provider_calls: NOT_OBSERVED
  policy_decisions: gateEnabled=false
  evidence: scheduling / gate evidence builders (when engine runs)
  telemetry: NOT_OBSERVED
  validation: N/A
  final_output: skipped node status
  execution_evidence: tests/unit/policy-engine.test.ts PASSED (6 tests)
  note: This is NOT CapabilityAuthority enforcement.
```

---

## Trace D — Evidence validation

```yaml
execution_trace:
  id: TRACE-D
  kind: UNIT_TEST_EXECUTED_WITH_FAILURES
  input: Evidence objects for gate nodes
  entrypoint: validateEvidence (src/evidence/validator.ts)
  components:
    - component: Evidence validator
      file: src/evidence/validator.ts
      role: schema/artefact checks
    - component: Builders
      file: src/evidence/builders.ts
      role: typed evidence construction
  transitions: evidence → valid|invalid
  capability_calls: NOT_OBSERVED
  provider_calls: NOT_OBSERVED
  policy_decisions: NOT_OBSERVED
  evidence: under test
  telemetry: NOT_OBSERVED
  validation: validateEvidence
  final_output: { valid, reason }
  execution_evidence: |
    tests/unit/evidence.test.ts — 2 FAILED 2026-09-18
    (artifact_path_missing expectation drift)
  status: PARTIAL — implementation exists; current tests disagree with validator behavior
```

---

## Trace E — JOB_PENDING (static only on this tree)

```yaml
execution_trace:
  id: TRACE-E
  kind: STATIC_ONLY
  input: CursorSkillProvider / JobFileExecutor / SmartMock asyncMode
  entrypoint: JobFileExecutor.execute → error.code JOB_PENDING (cursor-skill-provider.ts:39)
  components:
    - component: ExecutionEngine.processRunResult
      file: execution-engine.ts ~465
      role: set node waiting on JOB_PENDING
    - component: JobStore / checkpoint
      file: src/jobs/* 
      role: persist/resume
      status: NOT_OBSERVED_IN_TREE
  transitions: running → waiting → (resume) …
  final_output: NOT_OBSERVED end-to-end here
  execution_evidence: job-resume.test.ts cannot load without jobs/
```
