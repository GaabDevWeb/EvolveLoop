# H-003 — Stuck detector cuts thrash cost

```yaml
id: HYP-003
hypothesis: >
  Se um detector de loops sem progresso (ações repetidas sem delta de testes/ficheiros) interromper
  ou escalar sob condição de jobs autónomos longos, esperamos observar menor custo médio em tarefas
  que hoje thrasham, medido por $/task e turn count, sem cair success em tarefas saudáveis.
based_on:
  - P-007
  - GAP-004
  - targets/external/openhands M05
expected_effect: Lower spend on failed thrash trajectories; earlier human escalate
assumptions:
  - Progress metrics available (diff, test, unique tool signature)
risks:
  - False stuck on legitimately repetitive search
experiment: E-003
success_criteria:
  - Thrash tasks halt earlier with cost reduction
  - Healthy tasks false-positive rate below threshold
failure_criteria:
  - High false stuck on normal explore
  - No cost change
```
