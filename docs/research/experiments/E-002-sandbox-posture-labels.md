# E-002 — Sandbox posture labeling / refuse-unenforceable

```yaml
id: EXP-002
decision_context: PROTOTYPE
baseline: Policy allows shell/MCP without explicit enforceability attestation
change: >
  Add posture enum {enforced_sandbox, host_unknown, refused}; refuse claimed-enforced when signal absent;
  log label on each mutating tool
dataset_or_tasks: Fixture scripts attempting file read outside workspace + benign in-workspace commands
metrics:
  - false_safe_label_rate
  - refusal_correctness
  - user_completable_task_rate
expected_improvement: false_safe_label_rate → 0 on fixtures
regression_criteria:
  - Benign tasks systematically unblockable
cost: Medium (host capability discovery)
latency: Negligible
failure_criteria:
  - Cannot detect enforcement → keep UNKNOWN; do not fake labels
```

**Links:** H-002, GAP-001, P-005.
