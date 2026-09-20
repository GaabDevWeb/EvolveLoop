# H-004 — Compaction hygiene preserves constraints

```yaml
id: HYP-004
hypothesis: >
  Se marcarmos Policy/Evidence/active-skill spans como non-droppable (ou re-inject post-compact)
  sob condição de sessões longas com compactação, esperamos observar menos violações de process
  skills após compact, medido por checklist de constraints still-present + task compliance.
based_on:
  - P-008
  - GAP-002
  - targets/external/anthropic-agent-skills AAS-09
  - LOCAL/superpowers M-BOOTSTRAP re-inject notes
expected_effect: Critical instructions survive compaction more often
assumptions:
  - Hook or orchestrator can observe compact events OR periodically re-assert
risks:
  - Re-inject blows tokens; fights host compact
experiment: E-004
success_criteria:
  - Constraint survival rate ↑ after compact events
  - No severe task regression
failure_criteria:
  - Constraints still vanish
  - Token overhead unacceptable
```
