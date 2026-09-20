# SE-03 — Engineering Task Graph

**Status:** IMPLEMENTED  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Code:** `orchestrator/src/tasks/`  
**Depends on:** SE-01 RequirementsSpec, SE-02 ArchitectureSpec

---

## Purpose

Transform validated Requirements + Architecture into a versioned, validatable **EngineeringTaskGraph** — the engineering work definition that a future Supervisor / PlanEmitter can map toward executable IR.

```text
RequirementsSpec + ArchitectureSpec
  → TASK_GRAPH_PROPOSAL → TaskGraphBuilder → TaskGraphValidator → Baseline
```

**No task execution. No application code generation. No agent delegation.**

---

## Requirements → Tasks

Every MUST requirement must have ≥1 task or an explicit `coverage_justifications` entry (`architecture-only`, `already-satisfied`, `out-of-implementation-scope`, `external`, `existing-no-change`).

---

## Architecture → Tasks

Proposed components need implementing tasks. EXISTING without pending requirements may be justified as `existing-no-change`. Changes use `action: MODIFY` rather than CREATE.

---

## Task Identity

Stable `TASK-001` … with optional replacement ids `TASK-001R1` (`parent_task_id` + `replacement_reason`).  
Retries keep the same task id (attempt is Runtime state — not in baseline).

---

## Task Types

`IMPLEMENTATION | TEST | DOCUMENTATION | DATABASE | CONFIGURATION | INTEGRATION | MIGRATION | VALIDATION | RESEARCH`

Actions: `CREATE | MODIFY | DELETE | MIGRATE | CONFIGURE | TEST | DOCUMENT | VALIDATE`

---

## Dependencies

Explicit `dependencies[{task_id, reason?}]`. Validator rejects unknown, self, and cycles.

Derived metadata: `critical_path`, `parallelizable_groups` (heuristic — not authority).

---

## Inputs / Outputs

`TaskArtifactRef` for inputs/outputs when needed. Evidence requirements declare how completion is proven later.

---

## Capabilities

`required_capabilities[]` are **suggestions**. Availability/authorization remain Runtime (A03). Forbidden patterns (`unrestricted.*`) rejected.

Tasks ≠ capabilities: “Create migration” is a task that may use `filesystem.write`.

---

## Agent Roles

`preferred_agent_role` / `compatible_agent_roles` = routing metadata only — not authorization.

---

## Scope / File Ownership

`scope` / `owned_paths`. Overlapping paths without a serializing dependency → `TASK_SCOPE_CONFLICT`.

Task scope ≠ workspace authority (A03).

---

## Parallelism

Representable via independent nodes + derived groups. Safety also considers path ownership (partial heuristic).

---

## Definition of Done / Acceptance Criteria

MUST tasks require DoD bullets. Acceptance criteria describe required behavior; DoD describes completion evidence.

---

## Risk / Side Effects

Risk: `LOW|MEDIUM|HIGH|CRITICAL`. Side effects: `READ_ONLY|LOCAL_WRITE|BUILD_EXECUTION|DATABASE_WRITE|NETWORK|DEPLOYMENT|EXTERNAL_MUTATION`.  
Risk does not grant authority. Production deploy tasks warn `NO_AUTO_DEPLOY`.

---

## Requirements / Architecture Traceability

`requirement_ids[]`, `architecture_component_ids[]`, `architecture_decision_ids[]`, `interface_ids[]`.

---

## Validation / Health

Deterministic `validateTaskGraph` → `READY | READY_WITH_WARNINGS | BLOCKED | INVALID`.

Detects: coverage gaps, orphans, cycles, scope conflicts, under/over decomposition, policy hostility, secrets, OOS tasks.

---

## Versioning / Replanning

Immutable YAML baselines (`taskgraph://{id}@{version}`). Diff: added/removed/modified + dependency/capability/scope changes.  
`parent_graph_id` / `replan_reason` / `decision_id` prepared for A04. Task replacement via `replaceTask`.

---

## Brownfield

EXISTING → MODIFY when requirements apply; otherwise justify `existing-no-change`. No greenfield recreate-everything.

---

## Evidence / Telemetry

`buildTaskGraphEvidence`; events `TaskGraphGenerationStarted|ProposalProduced|ValidationFailed|BaselineCreated|VersionCreated`.

---

## Evaluation

Offline: `tests/unit/task-graph-se03.test.ts`. Live Ollama path opt-in → `NOT_MEASURED` by default. No single score.

---

## CapabilityGraph vs EngineeringTaskGraph

| | EngineeringTaskGraph | CapabilityGraph (IR) |
|--|----------------------|----------------------|
| Purpose | Engineering work definition | Runtime-executable capability DAG |
| Node identity | `TASK-*` work units | Capability invocations |
| State | Definition baseline | Execution status / retries / providers |
| Authority | None | Scheduled under A03/B01 |

Mapping hints: `toIrMappingHints` — future PlanEmitter input. **Do not duplicate IR execution state in the task graph.**

---

## Known Limitations

- Parallelism safety is path-heuristic (not full alias analysis).
- Deterministic extractor covers golden shapes; arbitrary designs need LLM proposals.
- Supervisor / actual IR emission / task execution = SE-04+.
