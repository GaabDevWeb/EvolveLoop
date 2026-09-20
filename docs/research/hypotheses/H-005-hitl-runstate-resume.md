# H-005 — Serialized HITL resume reliability

```yaml
id: HYP-005
hypothesis: >
  Se jobs serializarem waits de aprovação (RunState-like) sob condição de restart do processo,
  esperamos observar resume correcto sem re-executar side effects concluídos, medido por
  idempotency tests e taxa de resume success.
based_on:
  - P-004
  - P-009
  - GAP-005
  - targets/external/openai-agents-sdk M09
  - targets/external/langgraph LG-INTERRUPT-HITL
expected_effect: Reliable cross-process HITL; fewer duplicate side effects
assumptions:
  - Side-effectful capabilities are idempotent or checkpointed
risks:
  - Secrets in serialized state (openai AP-secret-in-runstate)
experiment: E-005
success_criteria:
  - Resume-after-kill succeeds on fixture jobs
  - No duplicate mutating tool calls post-resume
failure_criteria:
  - State corrupt / unreadable
  - Duplicate mutations
```
