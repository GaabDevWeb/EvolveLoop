# Results Traceability

## E-001

```text
Research: progressive disclosure / skill catalog budget
   ↓
Hypothesis: max_skills / max_description_tokens → ↑ precision/recall, ↓ tokens @ similar task_success
   ↓
Baseline V1: Skills packages exist; no engine budget API; baseline-v1-2026-09-18
   ↓
Experiment E-001 offline battery (4 conditions × 5 reps)
   ↓
Runs: CONTROL×5, T_SKILLS_5×5, T_SKILLS_10×5, T_TOKENS_40×5
   ↓
Raw Evidence: raw/battery/{battery-summary,all-runs,CONDITION/run-*.json}
   ↓
Metrics: E001-M-001…M-013 (DIRECT / PROXY / NOT_MEASURED)
   ↓
Claims: CLM-E001-001…005 (scoped offline)
```

Evidence IDs: E001-EV-001…004  
Artifact SHA256: see EVIDENCE-LEDGER.yaml integrity block.

---

## E-005

```text
Research: HITL / jobs / checkpoint
   ↓
Hypothesis: interrupt→resume without duplicate mutate; secrets=0
   ↓
Baseline V1: Jobs/Resume OBSERVED; HITL PARTIALLY_OBSERVED; duplicate_mutate was gap
   ↓
Runtime Sync restored jobs/ → fixture enablement
   ↓
Experiment E-005 fixture (CONTROL + SAME_ENGINE + NEW_ENGINE)
   ↓
Runs: 15
   ↓
Raw Evidence: raw/dup-mutate/{summary-metrics,execution-matrix,*-rep-*.json}
   ↓
Metrics: E005-M-001…007
   ↓
Claims: CLM-E005-001…005 (job-path STATE_WRITE scoped)
```

Evidence IDs: E005-EV-001…003  

---

## E-002 / E-003 / E-004

```text
Research PROTOTYPE
   ↓
Baseline NOT_IMPLEMENTED (relevant primitive)
   ↓
Experiment BLOCKED (runs=0)
   ↓
No raw metrics / no supported claims in this layer
```

---

## Cross-experiment

No causal link asserted between E-001 and E-005. They concern distinct properties (catalog shaping vs job resume).
