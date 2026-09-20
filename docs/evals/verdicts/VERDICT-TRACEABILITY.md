# Verdict Traceability

**Baseline:** `baseline-v1-2026-09-18`  
**Rule:** Every verdict must walk back to original evidence. No invented links.

## Required chain

```text
Research
   ↓
Hypothesis
   ↓
Experiment
   ↓
Evidence
   ↓
Claim
   ↓
Eval
   ↓
Verdict
```

---

## H-001 — Skill catalog budget

| Layer | Artifact |
|-------|----------|
| Research | `docs/research/patterns/P-001-*`, `docs/research/experiments/E-001-skill-catalog-budget.md` |
| Hypothesis | `docs/research/hypotheses/H-001-skill-list-budget.md` (+ duplicate `docs/evals/experiments/E-001/HYPOTHESIS.md`) |
| Experiment | `docs/evals/experiments/E-001/` (RESULT, RESULTS.yaml, raw/battery) |
| Evidence | E001-EV-*; `docs/evals/results/EVIDENCE-LEDGER.yaml` |
| Claim | CLM-E001-001…005; `CLAIM-BOUNDARIES.md` |
| Eval | EV-007, EV-008 (`docs/evals/runs/EV-007/`, `EV-008/`) |
| Verdict | **WEAKENED** / MEDIUM — `HYPOTHESIS-VERDICTS.yaml` |

Token axis clarification: `docs/architecture/decision-review/E-001-TOKEN-RECONCILIATION.md` (interpretation only).

Independence: EV-007/008 = **CORROBORATED_SAME_BASIS** with E-001 (not independent n×2).

---

## H-002 — Sandbox refuse-if-unenforceable

| Layer | Artifact |
|-------|----------|
| Research | P-005, GAP-001, `E-002-sandbox-posture-labels.md` |
| Hypothesis | `H-002-sandbox-refuse-unenforceable.md` |
| Experiment | E-002 **BLOCKED** |
| Evidence | Absence probes only (mechanism missing) |
| Claim | — (none in CLAIMS.yaml) |
| Eval | — (blocked future paths; not executed) |
| Verdict | **INCONCLUSIVE** / UNKNOWN |

BLOCKED ≠ REFUTED.

---

## H-003 — Stuck detector

| Layer | Artifact |
|-------|----------|
| Research | P-007, GAP-004, `E-003-stuck-detector-heuristic.md` |
| Hypothesis | `H-003-stuck-detector-halts-thrash.md` |
| Experiment | E-003 **BLOCKED** |
| Evidence | — |
| Claim | — |
| Eval | — |
| Verdict | **INCONCLUSIVE** / UNKNOWN |

---

## H-004 — Compaction hygiene

| Layer | Artifact |
|-------|----------|
| Research | P-008, GAP-002, `E-004-compaction-reinject.md` |
| Hypothesis | `H-004-compaction-preserves-constraints.md` |
| Experiment | E-004 **BLOCKED** |
| Evidence | — (do not use E-005 checkpoint as substitute) |
| Claim | — |
| Eval | — |
| Verdict | **INCONCLUSIVE** / UNKNOWN |

---

## H-005 — HITL / job resume

| Layer | Artifact |
|-------|----------|
| Research | P-004, P-009, GAP-005, `E-005-hitl-runstate-fixture.md` |
| Hypothesis | `H-005-hitl-runstate-resume.md` |
| Experiment | `docs/evals/experiments/E-005/` (15/15 fixture) |
| Evidence | E005-EV-*; `EVIDENCE-LEDGER.yaml` |
| Claim | CLM-E005-001…005 |
| Eval | EV-006 (`docs/evals/runs/EV-006/`) |
| Verdict | **WEAKENED** / MEDIUM (scoped subclaims SUPPORTED) |

Independence: EV-006 = **CORROBORATED_SAME_BASIS** with E-005.

ADR link (impact only): ADR-DR-0001 — see `ADR-EVAL-IMPACT.yaml`.

---

## Cross-cutting system Evals (not hypothesis cores)

EV-001…EV-005, EV-009 measure runtime/regression properties. They bound battery integrity; they do **not** substitute for H-001…H-005 core oracles.

| Eval | Role vs hypotheses |
|------|--------------------|
| EV-001…005 | System property smoke — stability context |
| EV-006 | H-005 corroboration |
| EV-007…008 | H-001 corroboration |
| EV-009 | Regression vs baseline invariants |
| EV-F-* | Blocked — do not drive verdicts beyond INCONCLUSIVE |

---

## Claim reconciliation index

`CLAIM-EVAL-RECONCILIATION.yaml` — maps each CLM-* through experiment + eval to reconciled status.
