# E-003 — Stuck detector heuristic

```yaml
id: EXP-003
decision_context: PROTOTYPE
baseline: Jobs run until max turns/cost only
change: >
  Prototype detector: repeated tool signature window + zero file/test delta → escalate/stop
dataset_or_tasks: >
  Mix of known thrash transcripts (synthetic) and healthy multi-step coding tasks
metrics:
  - mean_cost_thrash
  - false_stuck_rate
  - time_to_halt
expected_improvement: Lower thrash cost; false_stuck below threshold
regression_criteria:
  - false_stuck_rate above threshold on healthy set
cost: Low–medium
latency: Detector overhead small
failure_criteria:
  - Heuristic inseparable from normal explore → DEFER
```

**Links:** H-003, GAP-004. Inspired by EXTERNAL openhands M05 (do not import their code blindly).
