# Eval Definition & Design Report

## Executive Summary

Catalog v1 defines **9 CORE/SECONDARY Evals** (EV-001…EV-009) plus blocked/future entries. Eight are **READY** to run via existing tests/harnesses; **EV-006** needs fixture formalization (`READY_AFTER_FIXTURE`). No Eval was executed. No runtime/baseline changes.

## Baseline

`baseline-v1-2026-09-18` — 103/103, 7/7, 5/5.

## Evidence Inputs

Canonical layer `docs/evals/results/` (ledgers, claims, handoff). Experiments E-001/E-005 read-only.

## Evaluation Principles

Evidence-first; scope-bounded; PROXY/NOT_MEASURED preserved; Eval ≠ decision; reuse tests when they already cover the property.

## Initial Eval Set

| ID | Property | Readiness |
|----|----------|-----------|
| EV-001 | runtime_execution_integrity | READY |
| EV-002 | capability_provider_resolution | READY |
| EV-003 | registry_correctness | READY |
| EV-004 | authority_enforcement_deterministic_path | READY |
| EV-005 | engine_evidence_integrity | READY |
| EV-006 | job_path_resume_state_write_integrity | READY_AFTER_FIXTURE |
| EV-007 | offline_skill_activation | READY |
| EV-008 | catalog_context_overhead_proxy | READY |
| EV-009 | baseline_regression_stability | READY |

## Runtime Evals

EV-001 reuses full-cycle + contracts.

## Capability / Provider Evals

EV-002 — selection + selection evidence; provider correct ≠ task success.

## Registry Evals

EV-003 — reuse registry unit/contract suites.

## Policy / Authority Evals

EV-004 — deterministic enforcement only; Mock/Skill/JobFile gap recorded (MG-011).

## Evidence Evals

EV-005 — Evidence[] only; MegaBrain bus excluded.

## State / Resume Evals

EV-006 — from E-005 claims; STATE_WRITE scope; exactly-once global NOT_EVALUABLE.

## Skill Evals

EV-007 — offline harness; task_success NOT_MEASURED.

## Context Evals

EV-008 — PROXY token_estimate; ~40% = T_TOKENS_40 only.

## Regression Evals

EV-009 — invariants + checksums.

## Measurement Gaps

`MEASUREMENT-GAPS.yaml` (MG-001…MG-011).

## Blocked Evals

EV-F-001…F-006 (environment/runtime/architecture).

## Future Evals

OS-kill (PT-002), live catalog, confirm-path, sandbox/stuck/compaction after prerequisites.

## Coverage

`COVERAGE-MATRIX.md` + `CLAIM-EVAL-COVERAGE.yaml`.

## Reproducibility

Commands in `EVAL-RUNNER-HANDOFF.md` and per-spec `reproducibility` blocks.

## Handoff to Eval Runner

See `EVAL-RUNNER-HANDOFF.md`. Catalog status: **SPECIFIED**.
