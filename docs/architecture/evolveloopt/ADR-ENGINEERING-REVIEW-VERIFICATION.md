# ADR — Engineering Review & Verification (SE-06)

**Status:** Accepted  
**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Related:** `V2-SE06-ENGINEERING-REVIEW.md`, `ADR-ENGINEERING-WORKER-EXECUTION-LOOP.md`, `ADR-SUPERVISOR-AGENT-DELEGATION.md`

---

## Context

SE-05 closed implementation → tests → validation, but lacked an independent structured review that can fail even when tests pass, and that cannot be bypassed by implementer self-certification.

## Decision

1. Add `EngineeringReviewer` under `orchestrator/src/engineering/review/` — analysis only.
2. Extend `EngineeringValidationResult` with review fields; Validation remains the completion authority.
3. Deterministic checks are the default proof path; Agent review is optional and fail-closed when unavailable.
4. Review version is bound to `implementation_version`; APPROVED(v1) does not approve v2.
5. Repair/replan recommendations reuse SE-05 Worker and A04 signals — no second repair engine.
6. `ForbiddenReviewerExecutor` documents and tests that Reviewer→Provider/Capability/fs/shell is forbidden.

## Consequences

- `tests PASS + review FAIL` is a first-class outcome.
- Live LLM review remains NOT_MEASURED until a rigorous methodology exists.
- Security checks are limited heuristics, not a claim of complete security coverage.

## Alternatives rejected

- Merge Review into Validation as a single blob.
- Let Reviewer execute capabilities.
- Auto-approve when reviewer LLM is down.
- Treat Agent “looks good” as APPROVED without deterministic criteria.
