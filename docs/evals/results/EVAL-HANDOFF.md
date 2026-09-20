# Eval Handoff

**From:** Results & Evidence Consolidation  
**Baseline:** `baseline-v1-2026-09-18`  
**Do not re-parse ad-hoc experiment folders as SSOT — use this layer.**

## What should Evals measure next?

| Target | Class |
|--------|--------|
| Live task_success under controlled catalog injection | DIRECTLY_EVALUABLE if host harness exists; else NEEDS_ENVIRONMENT |
| Live skill activation vs offline ranker | NEEDS_MORE_INSTRUMENTATION / host logs |
| Vendor or declared tokenizer vs whitespace PROXY | DIRECTLY_EVALUABLE once tokenizer policy set |
| OS-kill job-path resume (mutation_count) | DIRECTLY_EVALUABLE via PT-002 after Prototype Gate |
| Confirm-path side-effect duplication | NEEDS_MORE_INSTRUMENTATION |
| Global exactly-once | NEEDS_MORE_INSTRUMENTATION / RUNTIME (multi-surface) |
| Sandbox posture / false_safe labels | NEEDS_ARCHITECTURE then RUNTIME |
| Semantic stuck | NEEDS_ARCHITECTURE (semantics) then INSTRUMENTATION |
| Compaction reinject survival | NEEDS_ARCHITECTURE (ownership) then RUNTIME |

## What claims need validation?

- CLM-E001-001/002 under **live** conditions (currently offline only)  
- CLM-E005-001 under **OS kill** (currently same-process only)  

## What claims are already sufficiently bounded?

- Offline E-001 associations (use as regression bounds for offline harness, not production SLOs)  
- E-005 STATE_WRITE fixture non-duplication (fixture regression eval)  
- Explicit NOT_MEASURED boundaries for task_success / OS kill / full HITL  

## What remains unmeasured?

See METRIC-LEDGER entries with `measurement_type: NOT_MEASURED`.

## What baseline metrics are available?

From baseline V1: tests 103/103, contracts 7/7, full-cycle 5/5; Jobs/Resume OBSERVED; HITL PARTIALLY_OBSERVED; sandbox NOT_IMPLEMENTED.

## What experiment metadata must Evals consume?

```text
docs/evals/results/RESULTS-INDEX.yaml
docs/evals/results/EVIDENCE-LEDGER.yaml
docs/evals/results/METRIC-LEDGER.yaml
docs/evals/results/CLAIMS.yaml
docs/evals/results/CLAIM-BOUNDARIES.md
docs/evals/results/EXPERIMENT-RESULTS.yaml
```

Plus original raw paths referenced by evidence IDs (read-only).

## Rules for Evals phase

1. Do not upgrade PROXY → DIRECT without new measurement.  
2. Do not treat NOT_MEASURED as 0/false.  
3. Do not expand fixture claims to global guarantees.  
4. Do not modify baseline or raw evidence.  
5. Do not implement features to “make evals pass.”
