# 01c — Skill Certification Strategy (post-remediation)

## Principle

Registry presence ≠ certification. Each skill needs:

discovery → trigger → deps → happy → failure → negative → authority → scope → evidence → telemetry → recovery → side effects

## Priority order

1. Hard gates (grill-me, image-to-code, wiki grounding, testing)
2. Deterministic providers (filesystem, git, shell, project, system, knowledge)
3. Autonomous handlers (`test-autonomous-write`, future)
4. Execution workers (backend, frontend-pro, debugger)
5. Orchestration (`orquestrar`, planner, prd)
6. Soft/optional gates
7. Superpowers / host-only (explicitly **BLOCKED** in Engine pack — not FAILED)

## Current board (2026-09-20 remediation)

| Class | Status | N |
|-------|--------|---|
| Deterministic providers | CERTIFIED_WITH_LIMITATIONS | 6 |
| grill-me authenticity | CERTIFIED_WITH_LIMITATIONS (artifact still forgeable by workspace writer) | 1 |
| image-to-code | PARTIAL (same attestation model; fewer regression cases) | 1 |
| Host-only / Superpowers | BLOCKED | 8 |
| Remaining LLM skills | NOT_MEASURED | ~30 |

Do not mark NOT_MEASURED as PASS.
