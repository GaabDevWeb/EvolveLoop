# Handoff entre agentes (alinhar a `[ENTREGA CONSOLIDADA]` existente)

Usar o formato da skill consumidora quando existir. Este template é o mínimo estruturado para composição:

```yaml
handoff:
  from: "{{FROM_AGENT_ID}}"
  to: "{{TO_AGENT_ID}}"
  task: ""
  context:
    required_paths: []
    assumptions: []
  completed: []
  pending: []
  evidence:
    - path: "memory/<feature_id>/evidence/..."
  artifacts: []
  validation:
    status: pass | fail | blocked
    notes: ""
  constraints: []
  warnings: []
```

Se o destino for pipeline MegaBrain, preferir o bloco textual `[ENTREGA CONSOLIDADA]` + `[ENCERRAMENTO]` da skill de origem.
