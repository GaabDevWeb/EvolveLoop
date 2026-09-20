# E-004 — Post-compaction constraint re-inject

```yaml
id: EXP-004
decision_context: PROTOTYPE
baseline: Rely on host compaction alone
change: >
  On compact/clear events (or periodic), re-inject minimal Policy+active skill pin; compare constraint survival
dataset_or_tasks: Long synthetic sessions forcing compact; checklist of must-keep rules
metrics:
  - constraint_survival_rate
  - extra_tokens_per_reinject
  - task_compliance_after_compact
expected_improvement: Higher survival and compliance
regression_criteria:
  - Token overhead exceeds budget
  - Double-injection confusion
cost: Low
latency: Small bump per reinject
failure_criteria:
  - No compact hook available → UNKNOWN/DEFER
```

**Links:** H-004, GAP-002, P-006/P-008.
