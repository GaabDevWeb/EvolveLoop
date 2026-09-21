# 02 — Skill Dependency Matrix

**Commit:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`

## Declared edges (from prior audits + SKILL contracts — revalidated as claims)

| Source | Target | Relationship | Notes |
|--------|--------|--------------|-------|
| orquestrar | wiki | HARD gate | knowledge-grounding |
| orquestrar | grill-me | HARD conditional | design |
| orquestrar | image-to-code | HARD conditional | if image |
| orquestrar | prd/planner/testing/... | phase gates | policy |
| planner | grill-me | conditional require | |
| frontend-pro | image-to-code | if image | |
| debugger | systematic-debugging | absorbs | |
| technical-library-dossier | agent-browser | requires | |
| wiki | knowledge.search/inspect | optional caps | |
| Engine | filesystem/git/shell/... | deterministic | |

## Cycles
None proven in Engine runtime DAG among provider skills.

## Unavailable edges
- global-skills without provider.yaml → **not loaded by Engine discovery**
- host-only skills → unavailable in pack

## Compatibility
Deterministic providers compose under ExecutionEngine with `workspaceRoot`.
