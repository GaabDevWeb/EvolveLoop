# POST-PRUNE-TELEMETRY-REPORT

## Estado

Telemetria `SkillLifecycle` (observe-only) instalada na pré-pruning permanece funcional.

## Eventos relevantes à poda

| evento | expectativa pós-poda |
|--------|----------------------|
| skill_removed | documentado no manifesto (não runtime replay) |
| skill_not_found / missing | pedido legado → classificar `REMOVED_INTENTIONALLY` em testes adversariais |
| skill_activation | core skills apenas no happy path |
| gate_required / gate_blocked / gate_satisfied | grill-me + image-to-code inalterados |

## Distinção crítica

```text
legacy skill requested (gsap, …)  → REMOVED_INTENTIONALLY (não REGRESSION)
core agent requires removed dep   → REGRESSION (não observado)
```

## Produção

`sample_size_production_activations: 0` — telemetria recente; **não** usada como prova de melhoria de precisão por catálogo menor.

## Validação

Suite unitária + fixture renomeada (sem depender de path `gsap`) — PASS dentro de `225/225`.
