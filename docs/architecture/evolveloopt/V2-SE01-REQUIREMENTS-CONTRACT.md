# SE-01 — Requirements Contract

**Status:** IMPLEMENTED  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Code:** `orchestrator/src/requirements/`

---

## Purpose

Transform Brief + PRD + Constraints + Workspace Context into a machine-verifiable **RequirementsSpec**: structured, validatable, versioned, and traceable.

Establish a hard boundary between natural language and operational requirements. The Software Factory must not treat free-text PRD as the sole runtime contract.

---

## Scope

**In scope (SE-01):**

- `RequirementsSpec` schema and identity
- Deterministic validator / builder / versioning / YAML artifact store
- `REQUIREMENTS_PROPOSAL` AgentDecision → RequirementsBuilder
- Evidence + telemetry
- Offline golden / adversarial tests
- Optional live path (AgentExecutor + ReasoningProvider) — opt-in only

**Out of scope:**

- ArchitectureSpec, EngineeringTaskGraph, application code generation
- Multi-agent delegation
- Changing ExecutionEngine / A03 / B01 / B04 unless unavoidable (not required)

---

## RequirementsSpec

```text
kind: RequirementsSpec
apiVersion: evolveloop.io/se/v1
requirements_id + version
requirements[] / constraints[] / assumptions[] / open_questions[] / out_of_scope[]
```

Persisted as YAML under a filesystem artifact store (`requirements://{id}@{version}`).

---

## Requirement Identity

Stable ids: `REQ-001`, `REQ-002`, …  
Survive versioning, planning, implementation, test, replan, delivery.

`requirement_hash` is a **content fingerprint**, not human identity.

---

## Versioning

- `requirements_id` + `version` (integer ≥ 1)
- Baseline marks immutability (`baseline: true`)
- Changes create `version N+1` with `parent_version = N`
- Disk writes refuse overwrite of an existing version file

---

## Sources

Each requirement has `source.type`:

`PRD | BRIEF | USER_CLARIFICATION | CONSTRAINT | ARCHITECTURE_DECISION | INFERENCE | ASSUMPTION | KNOWLEDGE`

Optional `section` / `reference` / `artifact_id` / `knowledge_id`.  
Do not invent references. Inferences use `generated: true` + `INFERENCE`.

---

## Types

`FUNCTIONAL`, `NON_FUNCTIONAL`, `CONSTRAINT`, `SECURITY`, `DATA`, `INTEGRATION`, `UI`, `API`, `PERFORMANCE`, `OPERATIONAL`, `NEGATIVE`, `TECHNICAL_CONSTRAINT`, `TECHNICAL_PROPOSAL`

---

## Priority

`MUST | SHOULD | COULD | OUT_OF_SCOPE | MUST_NOT | SHOULD_NOT`

`OUT_OF_SCOPE` is an explicit exclusion, not absence.

---

## Status

`PROPOSED | ACCEPTED | CLARIFICATION_REQUIRED | REJECTED | DEFERRED | AMBIGUOUS | DUPLICATE_CANDIDATE`

LLM cannot silently move `CLARIFICATION_REQUIRED` → `ACCEPTED` without Runtime evidence.  
LLM cannot set `baseline: true` on proposals.

---

## Acceptance Criteria

Verifiable bullets preferred for MUST / MUST_NOT. Missing criteria → warning (or error under strict policy).

---

## Constraints

Separated from functional requirements via `constraints[]` and `TECHNICAL_CONSTRAINT` types.  
Preserved input constraints are validated (`CONSTRAINT_DROPPED`).

---

## Assumptions

`RequirementAssumption` with id, statement, reason, source, risk, confidence.  
Assumptions never auto-approve requirements.

---

## Open Questions

`open_questions[]` with priority `BLOCKING | HIGH | MEDIUM | LOW`.  
`BLOCKING` → readiness `HUMAN_REQUIRED` (blocks architecture gate).

---

## Out of Scope

`out_of_scope[]` + requirements with priority `OUT_OF_SCOPE`. Future Task Decomposer must not create tasks for these.

---

## Conflicts

Deterministic stack conflict detection (e.g. PostgreSQL vs SQLite) → `REQUIREMENT_CONFLICT`.  
No silent winner selection.

Dependency rule: MUST depending on OUT_OF_SCOPE → conflict.

---

## Dependencies

`dependencies: string[]` of requirement ids. Unknown ids → `INVALID_DEPENDENCY`.

---

## Traceability

`intent_id` on requirements; source section/reference; architecture handoff includes traceability map.

Future: Task → REQ, Test → REQ, Delivery coverage (not computed in SE-01).

---

## Evidence

Planning-shaped Evidence via `buildRequirementsEvidence` — source/version/validation/open questions/assumptions/conflicts.

---

## Validation

`validateRequirementsSpec` — **no LLM**. Schema, identity, deps, conflicts, duplicates, policy boundary, readiness:

`READY | NOT_READY | READY_WITH_ASSUMPTIONS | HUMAN_REQUIRED`

Gate: `requirementsGateAllowsArchitecture`.

---

## Persistence

`RequirementsArtifactStore` — YAML files + index; immutable versions.

---

## Runtime Boundary

```text
LLM → REQUIREMENTS_PROPOSAL → RequirementsBuilder → RequirementsValidator → Spec / Baseline
```

Runtime owns validation, versioning, identity, persistence, policy, state.  
LLM may interpret / extract / propose only.

---

## Security

PRD content that says “disable evidence / skip tests / unrestricted filesystem” is evaluated as requirement text and flagged `POLICY_BOUNDARY`. It does **not** alter A03 / B01 / B04.

User requirements ≠ runtime authorization.

---

## Future Handoffs

`toArchitectureHandoff(spec)` → accepted requirements, constraints, assumptions, open questions, out-of-scope, traceability.

Prepared lineage for task `implements: REQ-*` and test `verified by` (SE-02+).

---

## Test Evidence

`orchestrator/tests/unit/requirements-se01.test.ts` — golden (CRUD, ambiguous, conflict, negative, OOS, duplicates), versioning, adversarial, prompt injection, AgentDecision integration, telemetry.

Live eval remains opt-in (`REASONING_MODE=live`); not required for SE-01 DoD offline.

---

## Known Limitations

- Duplicate detection is lexical/Jaccard heuristic (candidates only).
- Deterministic extractor covers golden phrases; arbitrary prose needs LLM proposal path.
- Requirement coverage metric and change-impact → task/code/test not implemented (contract only).
- Project replan on requirements change deferred (A04 extension).
