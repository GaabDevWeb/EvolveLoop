# H-001 — Skill list budget improves activation quality

```yaml
id: HYP-001
hypothesis: >
  Se introduzirmos um orçamento explícito de catálogo de skills (ex. limites de tokens/contagem
  inspirados em notas Codex 2%/8k) sob condição de muitas skills instaladas, esperamos observar
  melhor precisão de activação e menos context pressure, medido por taxa de skill-correct e
  tokens de prefixo.
based_on:
  - P-001
  - targets/external/codex M10
  - targets/external/anthropic-agent-skills AAS-02
  - targets/external/cline M06
expected_effect: Higher correct-skill activation; lower always-on token overhead
assumptions:
  - Host allows controlling catalog injection
  - Eval set of multi-skill tasks exists
risks:
  - Budget too tight → missed skills
  - Host ignores our catalog shaping
experiment: E-001
success_criteria:
  - Activation precision/recall improves vs baseline catalog
  - Prefix tokens decrease without major task failure rate increase
failure_criteria:
  - No measurable activation change
  - Task success drops beyond agreed threshold
```
