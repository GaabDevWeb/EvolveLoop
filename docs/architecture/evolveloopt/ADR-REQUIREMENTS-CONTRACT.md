# ADR — Requirements Contract (SE-01)

**Status:** Accepted  
**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Related:** `V2-SE01-REQUIREMENTS-CONTRACT.md`, `ADR-SOFTWARE-ENGINEERING-LOOP.md`, `ADR-AGENT-RUNTIME-BOUNDARY.md`

---

## Context

The Software Engineering Loop needs a first operational artifact before architecture and tasks. Free-text PRDs are necessary for humans but insufficient as the sole machine contract: they are ambiguous, unversioned, and easy for an LLM to “approve” without Runtime authority.

## Decision

1. **RequirementsSpec exists** as the normalized, versioned, traceable operational contract (`what`, not `how` unless the user stated `how` as a constraint).
2. **PRD is not the runtime contract** — it is an input source. Agents extract/propose; Runtime validates and baselines.
3. **LLM output is not trusted directly** — only `REQUIREMENTS_PROPOSAL` → Builder → deterministic Validator. LLM cannot set `baseline=true` or silently accept clarifications.
4. **Requirements are versioned** with immutable written artifacts and `parent_version` lineage so client PRD changes produce explicit change sets.
5. **Policy is separate** — hostile PRD text cannot disable A03/B01/B04/evidence; flagged as `POLICY_BOUNDARY`.
6. **Requirements are traceable** — stable `REQ-*` ids, source spans, optional `intent_id`, handoff map for Architecture/Tasks/Tests/Delivery.

## Consequences

- SE-02 Architecture Agent consumes baseline handoff, not raw PRD alone.
- Eval/metrics stay multi-signal (no single completeness %).
- Live LLM eval remains opt-in and does not change defaults or routing.

## Alternatives rejected

- Treating PRD markdown as SSOT for execution.
- Letting the LLM emit “approved requirements” without Runtime gates.
- Building a second Agent runtime for requirements.
