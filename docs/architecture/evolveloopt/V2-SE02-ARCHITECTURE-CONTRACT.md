# SE-02 — Architecture Contract

**Status:** IMPLEMENTED  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Code:** `orchestrator/src/architecture/`  
**Depends on:** SE-01 RequirementsSpec

---

## Purpose

Transform a validated **RequirementsSpec** into a structured, verifiable, versioned **ArchitectureSpec** (HOW), without generating application code or a Task Graph.

```text
RequirementsSpec → ARCHITECTURE_PROPOSAL → ArchitectureBuilder → ArchitectureValidator → Baseline
```

---

## Requirements Boundary

| Layer | Authority |
|-------|-----------|
| RequirementsSpec | **WHAT** must be satisfied (immutable baseline) |
| ArchitectureSpec | **HOW** it may be structured (proposal until Runtime baseline) |

Architecture must not silently rewrite requirements. Conflicts → `ARCHITECTURE_CONFLICT` / feedback proposals only.

---

## ArchitectureSpec

`kind: ArchitectureSpec` · `apiVersion: evolveloop.io/se/v1`  
Mandatory `requirements_reference: { requirements_id, requirements_version }`.

Supports (when applicable): components, interfaces, data model, technology choices, decisions (ADR-*), assumptions, open questions, risks, NFR responses, security, observability, testing strategy, deployment, brownfield delta, architecture feedback.

---

## Identity

`architecture_id` + stable component ids (`CMP-*`), interfaces (`IF-*`), decisions (`ADR-*`), technologies (`TECH-*`).

---

## Versioning

Integer `version` with `parent_version` lineage. Baselines are immutable; disk YAML refuses overwrite.

---

## Source Lineage

Technology/decisions distinguish:

- `CONSTRAINT` / requirements-derived
- `ARCHITECTURAL_PROPOSAL` (agent-generated)

---

## Components

Responsibility + optional `non_responsibilities`, deps, tech, `requirement_ids`, `origin: EXISTING | PROPOSED`, `dod_hints` for SE-03.

---

## Dependencies

Directed component graph. Validator detects unknown deps, self-deps, cycles (reject by default).

---

## Interfaces

Provider/consumer/protocol (REST, HTTP, database, function-call, …) — not REST-universal by fiat.

---

## Data Model

Entities, ownership (read/write), persistence mechanism, migration strategy (declarative only — no SQL generated).

---

## Security Architecture

Authn/authz, trust boundaries, secret handling policy text, audit — **does not replace A03**.

---

## Observability

Logs/metrics/traces/evidence pointers — reuses Runtime Evidence, no second telemetry stack.

---

## Deployment

Model + environments when relevant; never executes deploy.

---

## Technology Choices

`kind: CONSTRAINT | ARCHITECTURAL_PROPOSAL` + `justified`. Unjustified heavy tech → `UNJUSTIFIED_TECHNOLOGY`.

---

## Decisions / Alternatives / Trade-offs

`ArchitectureDecision` with chosen, alternatives, tradeoffs, risk/mitigation.

---

## Assumptions / Open Questions / Risks

Blocking questions → readiness `BLOCKED`. Assumptions → `READY_WITH_ASSUMPTIONS` when policy allows.

---

## Requirements Traceability

`traceability[]` + component/decision `requirement_ids`. Unmapped MUST → `UNMAPPED_REQUIREMENT`.

Out-of-scope compliance → `ARCHITECTURE_SCOPE_VIOLATION`.

---

## Validation

Deterministic `validateArchitectureSpec` (no LLM). Readiness: `READY | READY_WITH_ASSUMPTIONS | BLOCKED | INVALID`.

Gate: `architectureGateAllowsTaskDecomposition` (SE-03 must not start when blocked).

---

## Baseline / Version Diff

`createArchitectureBaseline`, `diffArchitectureVersions`, `ArchitectureArtifactStore` (`architecture://{id}@{version}`).

---

## Existing vs Proposed / Brownfield

`field_context`, `origin`, `existing_path`, `architecture_delta` (add/modify/remove/replace/migrate) — no migration execution.

---

## Future Task Decomposition

`toTaskDecompositionHandoff` exposes components, interfaces, deps, decisions, constraints, NFRs, testing strategy, DoD hints — **no tasks generated in SE-02**.

---

## Test Evidence

`orchestrator/tests/unit/architecture-se02.test.ts` — golden API/CRM, constraint/scope/cycle/unmapped, brownfield, adversarial, AgentDecision integration, telemetry.

Live eval remains opt-in (`NOT_MEASURED` by default).

---

## Known Limitations

- Deterministic extractor covers golden shapes; arbitrary design needs LLM proposal path.
- Semantic “over-architecture” beyond unjustified heavy tech is heuristic-light by design.
- Full REQ→architecture change impact analysis deferred.
- SE-03 Task Graph not implemented.
