# ADR — Architecture Contract (SE-02)

**Status:** Accepted  
**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Related:** `V2-SE02-ARCHITECTURE-CONTRACT.md`, `ADR-REQUIREMENTS-CONTRACT.md`, `ADR-SOFTWARE-ENGINEERING-LOOP.md`

---

## Context

SE-01 produced machine-verifiable **what**. Software factory next needs a structured **how** before task decomposition — without letting an LLM authorize execution or mutate requirements.

## Decision

1. **ArchitectureSpec exists** as the versioned operational architecture artifact bound to a requirements baseline.
2. **RequirementsSpec and ArchitectureSpec stay separate** — WHAT vs HOW; architecture cannot silently edit requirements.
3. **Architectural proposals are not requirements** — unconstrained tech choices are `ARCHITECTURAL_PROPOSAL`, not user requirements.
4. **Architecture Agent has no execution authority** — only `ARCHITECTURE_PROPOSAL`; no IR execution, filesystem, or deploy.
5. **Architecture is versioned** with immutable baselines and parent lineage.
6. **Traceability is mandatory** for MUST requirements (unmapped → reject).
7. **Validator is deterministic** — offline, no LLM inside the gate.

## Consequences

- SE-03 consumes architecture handoff, not raw PRD.
- Live LLM architecture quality remains opt-in eval, never default routing change.
- Policy (A03/B01/B04) remains outside architecture text authority.

## Alternatives rejected

- Embedding architecture inside RequirementsSpec.
- Treating LLM prose architecture as trusted baseline.
- Generating TaskGraph/code in the same milestone.
