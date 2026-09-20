# Eval Catalog

## Purpose

Formal evaluation specifications for the Agent System, derived from Baseline V1 and the canonical evidence layer. **Specified only — not executed.**

## Baseline

`baseline-v1-2026-09-18`

## Evaluation Principles

- Eval ≠ Experiment ≠ Unit test ≠ ADR ≠ Benchmark  
- Evidence-first; PROXY stays PROXY; NOT_MEASURED stays NOT_MEASURED  
- PASS/FAIL produce evidence, not architecture decisions  
- Prefer REUSE_EXISTING_TEST_COVERAGE over duplicate suites  
- Fixture isolation; never write baseline/runtime  

## Runtime Evals

- **EV-001** Runtime Execution Integrity — READY  

## Capability Evals

- **EV-002** Capability/Provider Resolution — READY  

## Provider Evals

Covered under EV-002 (provider dispatch via selection); no separate duplicate Eval.

## Registry Evals

- **EV-003** Registry Correctness — READY (reuse)

## Policy Evals

- **EV-004** Policy/Authority (deterministic enforcement) — READY  

## Evidence Evals

- **EV-005** Engine Evidence[] integrity — READY (≠ MegaBrain bus)

## State / Resume Evals

- **EV-006** Job resume + STATE_WRITE non-duplication — READY_AFTER_FIXTURE  

## Skills Evals

- **EV-007** Offline skill activation — READY  

## Context Evals

- **EV-008** Catalog context overhead (PROXY) — READY  

## Regression Evals

- **EV-009** Baseline invariants — READY  

## Blocked Evals

- EV-F-001 live task success — BLOCKED_BY_ENVIRONMENT  
- EV-F-002 global exactly-once — BLOCKED_BY_RUNTIME  
- EV-F-004 sandbox — BLOCKED_BY_ARCHITECTURE  
- EV-F-005 stuck — BLOCKED_BY_ARCHITECTURE  
- EV-F-006 compaction — BLOCKED_BY_ARCHITECTURE  

## Future Evaluations

- EV-F-003 OS-kill resume — READY_AFTER_FIXTURE (PT-002 pending gate)  

## Known Measurement Limits

See `MEASUREMENT-GAPS.yaml` and `docs/evals/results/CLAIM-BOUNDARIES.md`.
