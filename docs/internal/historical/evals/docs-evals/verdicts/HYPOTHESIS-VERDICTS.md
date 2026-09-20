# Hypothesis Verdicts

## Executive Summary

Five original research hypotheses (H-001…H-005) were judged against research, experiment, evidence, claim, and eval layers under baseline `baseline-v1-2026-09-18`.

| Verdict | Count | IDs |
|---------|------:|-----|
| SUPPORTED | 0 | — |
| WEAKENED | 2 | H-001, H-005 |
| REFUTED | 0 | — |
| INCONCLUSIVE | 3 | H-002, H-003, H-004 |

No hypothesis was invented. E-001/E-005 experimental “SUPPORTED (scoped)” classifications remain valid at **subclaim** scope; the **original compound research hypotheses** are weakened by unmeasured success criteria (live `task_success`; process-kill / global exactly-once / full HITL).

Eval PASS results corroborate measured subclaims on the **same experimental basis** (not independent n×2).

---

## Verdict Method

```text
Research → Hypothesis → Experiment → Evidence → Claim → Eval → Verdict
```

Rules applied:

- Evidence only (no architectural preference)
- PROXY stays PROXY
- NOT_MEASURED stays NOT_MEASURED
- BLOCKED ≠ REFUTED
- Eval PASS ≠ hypothesis SUPPORTED
- Same fixture Eval = CORROBORATED, not independent replication
- Compound hypotheses with major untested components → WEAKENED or INCONCLUSIVE

Canonical labels only: `SUPPORTED | WEAKENED | REFUTED | INCONCLUSIVE`.

---

## Hypothesis H-001

### Original Hypothesis

Explicit skill catalog budget improves activation precision and reduces context/token pressure (research HYP-001 / E-001), with task outcome parity as success criterion.

### Evidence

- Research: P-001, E-001 brief  
- Experiment: E-001 offline battery (4 conditions × 5 reps; 176 tasks)  
- Evals: EV-007 PASS, EV-008 PASS (same harness basis)  
- Baseline: CONTROL analogue; invariants intact  

### Experiment Results

| Condition | activation_precision | token_estimate (PROXY) |
|-----------|---------------------:|-----------------------:|
| CONTROL | 0.335 | 1673 |
| T_SKILLS_5 | 0.511 | 382 (−77%) |
| T_SKILLS_10 | 0.420 | 789 (−53%) |
| T_TOKENS_40 | 0.341 | 1010 (**≈−40%**) |

`task_success` = NOT_MEASURED. Token “~40%” = **T_TOKENS_40 only** (see token reconciliation).

### Eval Results

- EV-007: PASS — T5/T10 precision > CONTROL (offline)  
- EV-008: PASS — treatments token_estimate < CONTROL; T40 ≈ −39.6% PROXY  

### Supported Subclaims

- Catalog budget alters offline activation behavior  
- Catalog budget / truncation lowers whitespace `token_estimate` (PROXY)  

### Weakened Subclaims

— (none separately; weakening is at compound level)

### Refuted Subclaims

— none

### Unmeasured Components

- Live `task_success`  
- Live host catalog injection  
- Vendor tokenizer  

### Verdict

**WEAKENED**

### Confidence

**MEDIUM**

### Limitations

Offline ranker ≠ host LLM; PROXY tokens; Eval reuses E-001 basis; sample n=5/condition.

### Decision readiness

`MORE_EVIDENCE_REQUIRED` (for full original H-001 / production budget)

---

## Hypothesis H-002

### Original Hypothesis

Refuse-if-unenforceable when sandbox cannot be applied → fewer falsely labeled safe runs.

### Evidence

Research + GAP-001; E-002 **BLOCKED**; no READY eval executed for sandbox efficacy.

### Experiment Results

BLOCKED (mechanism absent).

### Eval Results

None executed for this hypothesis.

### Supported / Weakened / Refuted Subclaims

None measured.

### Unmeasured Components

Entire efficacy claim.

### Verdict

**INCONCLUSIVE**

### Confidence

**UNKNOWN**

### Limitations

Absence of sandbox ≠ proof that refuse-if-unenforceable would fail.

### Decision readiness

`ARCHITECTURE_REQUIRED` (security model — ADR-DR-0003)

---

## Hypothesis H-003

### Original Hypothesis

Stuck detector cuts thrash cost without harming healthy tasks.

### Evidence

E-003 BLOCKED; no semantic stuck Eval.

### Verdict

**INCONCLUSIVE** — confidence **UNKNOWN** — `ARCHITECTURE_REQUIRED`

---

## Hypothesis H-004

### Original Hypothesis

Compaction hygiene / reinject preserves critical constraints.

### Evidence

E-004 BLOCKED; E-005 checkpoint is **not** compaction evidence.

### Verdict

**INCONCLUSIVE** — confidence **UNKNOWN** — `ARCHITECTURE_REQUIRED`

---

## Hypothesis H-005

### Original Hypothesis

Serialized HITL / job waits survive **process restart** without re-executing completed side effects (idempotency + resume success).

### Evidence

- Experiment E-005: 15/15; `resume_success=1.0`; `duplicate_mutate=false`; STATE_WRITE scope  
- Eval EV-006: PASS (same fixture basis)  
- Baseline: Jobs OBSERVED; HITL PARTIALLY_OBSERVED  

### Experiment Results

CONTROL 5/5 mutation=1; SAME_ENGINE 5/5; NEW_ENGINE 5/5; OS kill NOT_MEASURED.

### Eval Results

EV-006 PASS — corroborates resume + non-duplicate STATE_WRITE under same scope.

### Supported Subclaims

- Job resume restores expected state  
- Job resume avoids duplicate STATE_WRITE  

### Unmeasured Components

- Global exactly-once  
- External side effects beyond STATE_WRITE  
- OS process kill / true process restart  
- Full product HITL  

### Verdict

**WEAKENED** (relative to original process-restart + broad side-effect wording)

### Confidence

**MEDIUM** overall (HIGH on scoped job-path subclaims)

### Limitations

STATE_WRITE only; same-process; LOW_SAMPLE; EV-006 not independent of E-005.

### Decision readiness

`DECISION_READY` for scoped KEEP of job-path resume (aligned with ADR-DR-0001); more evidence required for kill / global claims.

---

## Cross-Hypothesis Findings

- H-001 and H-005 address **different** properties (catalog shaping vs resume). No measured causal link.  
- H-002/H-003/H-004 remain blocked research tracks; architecture prerequisites dominate.  
- Runtime integrity Evals (EV-001…005, EV-009) do not adjudicate H-001…H-005 cores; they bound system stability around the battery.

---

## Contradictions

See `CONTRADICTIONS.md`. No experiment↔eval metric contradiction for overlapping observables. Prior CX-001 token language ambiguity remains resolved at results layer.

---

## ADR Impact

| ADR | Impact |
|-----|--------|
| ADR-DR-0001 | REINFORCED (EV-006 corroborates KEEP scope; DEFER exactly-once still correct) |
| ADR-DR-0002 | REINFORCED (EV-007/008 strengthen offline evidence; DEFER production budget still correct) |
| ADR-DR-0003 | NO_CHANGE |
| ADR-DR-0004 | NO_CHANGE |
| ADR-DR-0005 | NO_CHANGE |

ADRs were **not** modified.

---

## Open Questions

- Live catalog budget → task_success (H-001)  
- Sandbox refuse efficacy (H-002)  
- Stuck semantics + cost (H-003)  
- Compaction constraint survival (H-004)  
- OS-kill resume + non-STATE_WRITE side effects (H-005)  

---

## Claims Still Unsupported

From explicit rejection list + boundaries:

- Production skill budget required  
- Whitespace tokens = vendor cost  
- Global exactly-once guaranteed  
- Full HITL validated  
- Sandbox effectiveness proven  
- Semantic stuck detection proven  
- Compaction correctness proven  

---

## What These Verdicts Do NOT Establish

- Architecture ADOPT / REJECT  
- Production readiness of `max_skills`  
- Global exactly-once / OS-kill recovery  
- Live agent quality improvement from catalog budget  
- Sandbox security  
- Semantic stuck detection  
- Compaction correctness  
- That Eval PASS equals hypothesis SUPPORTED at research wording scope  
