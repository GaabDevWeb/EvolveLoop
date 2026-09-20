# EVAL-REGRESSION-REPORT

## Execução

```text
cd orchestrator && npm test
→ 40 files / 225 tests PASS
```

Inclui evals existentes (`engine-scenarios`, `evolveloop-live-evals` se no suite, etc.) + novos pós-poda.

## Categorização

| eval / bloco | status |
|--------------|--------|
| engine-scenarios | PASS |
| post-prune-catalog | PASS |
| post-prune-mass-scenarios | PASS |
| policy / megabrain gates | PASS |
| full-cycle / integration | PASS |
| contracts / registry | PASS |

## Regressões atribuíveis a skills removidas

**Nenhuma.**

Nenhuma correção de teste foi feita para mascarar FAIL — apenas asserções novas de ausência + fixture de telemetria sem path removido.

## NOT_APPLICABLE

Evals que dependiam de conteúdo interno das 7 skills removidas: N/A (skills fora do core; não havia evals canónicos dedicados no orchestrator).
