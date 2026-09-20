# Hypothesis Verdicts

**Phase:** Hypothesis Verdict & Evaluation Synthesis  
**Baseline:** `baseline-v1-2026-09-18`  
**Date:** 2026-09-19  

This directory is a **synthesis layer**. It does not modify:

- `docs/evals/baseline/**`
- `docs/evals/experiments/**`
- `docs/evals/results/**`
- `docs/evals/catalog/**`
- `docs/evals/runs/**`
- `docs/research/**`
- `docs/architecture/finalization/**`

## Canonical outputs

| File | Purpose |
|------|---------|
| `HYPOTHESIS-VERDICTS.yaml` | Machine-readable verdicts |
| `HYPOTHESIS-VERDICTS.md` | Human-readable report |
| `CLAIM-EVAL-RECONCILIATION.yaml` | Claim ↔ experiment ↔ eval reconciliation |
| `ADR-EVAL-IMPACT.yaml` | Impact on existing ADRs (no ADR edits) |
| `VERDICT-MATRIX.yaml` | Compact matrix |
| `VERDICT-TRACEABILITY.md` | Research → … → Verdict chain |
| `EVAL-SYNTHESIS.md` | Executive synthesis |
| `CLAIM-COVERAGE.md` | Claim coverage table |
| `CONTRADICTIONS.md` | Cross-source contradictions |

## Hypotheses analyzed

Original research hypotheses only: **H-001 … H-005** (no invented hypotheses).

## Principle

```text
VERDICT ⊂ EVIDENCE
SUPPORTED ≠ implement
PASS ≠ architecture approved
BLOCKED ≠ REFUTED
```
