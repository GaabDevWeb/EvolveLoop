# E-005 — HITL RunState fixture

```yaml
id: EXP-005
decision_context: PROTOTYPE
baseline: Approval gates without mandatory serialize/resume across process kill
change: >
  Minimal job fixture: run → wait_approval → kill process → restore → resume; assert no duplicate mutate
dataset_or_tasks: One mutating capability (write file) + one read-only; approval required before write
metrics:
  - resume_success
  - duplicate_mutate_count
  - secret_exfiltration_in_state (must be 0)
expected_improvement: resume_success=1; duplicate_mutate_count=0
regression_criteria:
  - Secrets persisted in plaintext state
cost: Medium
latency: N/A (correctness prototype)
failure_criteria:
  - Cannot integrate with orchestrator jobs → keep GAP open
```

**Links:** H-005, GAP-005, P-004/P-009. Watch EXTERNAL openai-agents AP-secret-in-runstate.
