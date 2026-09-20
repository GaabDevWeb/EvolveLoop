# E-001 — Skill catalog budget prototype

```yaml
id: EXP-001
decision_context: PROTOTYPE
baseline: Current host skill catalog injection (all eligible descriptions) without explicit MegaBrain budget
change: >
  Introduce configurable max_skills / max_description_tokens for catalog prefix;
  measure activation on fixed multi-skill task set
dataset_or_tasks: >
  Curated tasks requiring 1 correct skill among N distractors (use existing skill eval JSON where present)
metrics:
  - activation_precision
  - activation_recall
  - prefix_tokens
  - task_success
expected_improvement: Higher precision and lower prefix tokens at similar success
regression_criteria:
  - task_success drop > agreed ε
  - recall collapse on rare skills
cost: Low (prompt shaping; no new runtime)
latency: Neutral/better if fewer tokens
failure_criteria:
  - Host cannot control catalog → abort experiment; mark DEFER
```

**No implementation in this research pass.** Handoff only if authorized.
