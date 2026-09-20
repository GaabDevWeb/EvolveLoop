# ADVERSARIAL-VALIDATION

## Suite

| caso | esperado | resultado |
|------|----------|-----------|
| request skill by exact name (gsap, …) | não resolvível no pack | PASS |
| request indireto (motion/linkedin) | sem load fantasma | PASS |
| old command reference | nenhum command aponta removida | PASS |
| old agent reference | nenhum agent exige removida | PASS |
| stale documentation | DOCUMENTED_STALE / INTENTIONAL | PASS |
| removed as fallback | sem fallback para removidas | PASS |
| alias / provider / --discovery | sem reaparecimento | PASS |
| chained / retry / recovery | sem loop; gates intactos | PASS (estrutural) |

## Implementação

- `orchestrator/tests/unit/post-prune-catalog.test.ts` (12)
- `orchestrator/tests/evals/post-prune-mass-scenarios.test.ts` (147 casos internos)

## Resultado

```text
nenhuma referência ativa quebrada
nenhum loop estrutural
nenhuma resolução fantasma
nenhum fallback inesperado para skills removidas
```

**Adversarial: PASS**
