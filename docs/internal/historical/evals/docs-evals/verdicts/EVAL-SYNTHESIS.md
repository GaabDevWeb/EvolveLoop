# Evaluation Synthesis

**Phase:** Hypothesis Verdict & Evaluation Synthesis  
**Baseline:** `baseline-v1-2026-09-18`  
**Inputs:** research hypotheses, E-001/E-005 experiments, evidence/claims ledgers, eval battery  

This document answers factual synthesis questions only. It does **not** authorize implementation.

---

## Which hypotheses were supported?

**None** at the level of the **original compound research statements**.

Supported **subclaims** (scoped):

| Subclaim | Parent | Basis |
|----------|--------|-------|
| Offline catalog budget ↔ activation precision | H-001 | E-001 + EV-007 |
| Offline catalog budget ↔ lower token_estimate (PROXY) | H-001 | E-001 + EV-008 |
| Job-path resume restores state | H-005 | E-005 + EV-006 |
| No duplicate STATE_WRITE on resume | H-005 | E-005 + EV-006 |

---

## Which were weakened?

| ID | Why |
|----|-----|
| **H-001** | Activation + PROXY token effects sustained; live `task_success` (success criterion) NOT_MEASURED |
| **H-005** | Job-path STATE_WRITE resume sustained; original process-restart / global side-effect / full HITL components NOT_MEASURED |

---

## Which were refuted?

**None.**

No valid experiment/Eval contradicted a central prediction under relevant conditions.

---

## Which remain inconclusive?

| ID | Why |
|----|-----|
| **H-002** | E-002 BLOCKED — sandbox/posture absent |
| **H-003** | E-003 BLOCKED — stuck semantics/detector absent |
| **H-004** | E-004 BLOCKED — compaction pipeline absent |

BLOCKED ≠ REFUTED.

---

## Which claims became stronger?

Reinforced by Eval (same-basis corroboration):

- CLM-E001-001, CLM-E001-002  
- CLM-E005-001, CLM-E005-002, CLM-E005-003  

Partially reinforced:

- CLM-E001-005 (scope reminder)  
- CLM-E005-004 (same-process yes; OS kill no)  

---

## Which remain unsupported?

Explicitly not authorized (see CLAIM-BOUNDARIES + unsupported list):

- Production skill budget required  
- Whitespace tokens = vendor cost  
- Global exactly-once  
- Full HITL validated  
- Sandbox effectiveness  
- Stuck detector efficacy  
- Compaction correctness  
- Live task_success improvement from catalog budget  

NOT_EVALUATED claims: CLM-E001-003, CLM-E001-004, CLM-E005-005.

---

## Which architectural questions remain unanswered?

1. Should production runtime gain `max_skills` / catalog budget? → still **DEFER** (needs live evidence).  
2. Is OS-kill job resume reliable? → **NOT_MEASURED** (PT-002 / Prototype Gate).  
3. Security model before sandbox? → still prerequisite (ADR-DR-0003).  
4. Stuck semantics? → still prerequisite (ADR-DR-0004).  
5. Context ownership before compaction? → still prerequisite (ADR-DR-0005).  

These are **open questions**, not decisions from this phase.

---

## Evidence independence (critical)

```text
E-001 ──CORROBORATED──► EV-007 / EV-008   (same offline harness)
E-005 ──CORROBORATED──► EV-006           (same STATE_WRITE fixture)
```

Do **not** count as 20+30 independent observations.

---

## What next (informational only)

```text
HYPOTHESIS VERDICTS
       ↓
ARCHITECTURE IMPACT
       ↓
IMPLEMENTATION DECISION
```

This file stops at verdicts. No ADRs rewritten. No runtime changes. No new E-\* / EV-\*.
