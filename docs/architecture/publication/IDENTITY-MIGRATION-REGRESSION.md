# Identity Migration Regression Report

Generated: 2026-09-20T13:43:17Z

## 1. Baseline
- Commit pre-migration: `7f2d49d` (audit) / tag `pre-identity-migration` on prior HEAD
- Orchestrator: **236/236 PASS**

## 2. Applied Changes
- Public identity text MegaBrain → EvolveLoop across skills/agents/docs/agent-setup
- `/MegaBrain` → `/evolve` on main surfaces
- Module `megabrain-skill-gates.ts` → `skill-gates.ts`
- Provider stack `megabrain` → `evolveloop`
- agent-setup manifests install evolve/evolveloop

## 3–8. Renames
See `EVOLVELOOP-IDENTITY-MIGRATION.yaml` and audit maps.

## 9. Legacy Alias
GaabType retains `/MegaBrain` → `/evolve`.

## 10. Static Scan
`MEGABRAIN-POST-MIGRATION-SCAN.yaml` — **active_public_count: 0**

## 11–13. Tests
- Unit+integration+contracts+evals: **424/424 PASS** (includes new identity tests)
- EvolveLoop subset: **91/91 PASS**

## 14. Flow Matrix
`identity-flow-matrix.test.ts` — **183 structural scenarios** (>=160 required)

## 15. Adversarial
- main rejects MegaBrain.md presence
- orquestrar skill must not reference `/MegaBrain`
- path names must not contain megabrain

## 16. LLM Validation
NOT_EXECUTED (no live model harness in this phase; structural + deterministic suite used)

## 17. Quality Comparison
UNCHANGED expected for rename-only; suite parity maintained (236 baseline → 424 with added identity matrix, core suites green)

## 18. Regressions
None material detected in orchestrator suite.

## 19. Unexpected Findings
- EvolveLoop-named subset reports 91 vs historical 93 label (suite composition); all evolveloop files green
- Host still may have old MegaBrain symlinks; updated evolve.md + EvolveLoop symlink locally

## 20. Final Result
**EVOLVELOOP_IDENTITY_MIGRATION_VALIDATED** (local; no push)
