# Especialista: report-consolidator

**Sempre activo** — após judge.

## Entrada

Achados adjudicados pelo judge, threat model, capability matrix, audit log, regressões.

## Executar

1. Deduplicar SEC (fingerprint — [audit-memory.md](../audit-memory.md))
2. Attack chains — [attack-chains.md](../attack-chains.md)
3. Taxonomias — [taxonomy-mapping.md](../taxonomy-mapping.md)
4. Scoring + debt — [risk-scoring.md](../risk-scoring.md), [prioritization.md](../prioritization.md)
5. Threat coverage — [threat-coverage.md](../threat-coverage.md)
6. Verdict trace — [verdict-trace.md](../verdict-trace.md)
7. Artifacts — [ci-artifacts.md](../ci-artifacts.md)
8. **Gravar snapshot** histórico — [audit-memory.md](../audit-memory.md)
9. Framework audit log — [framework-safety.md](../framework-safety.md)

## Saída

[output-contract.md](../output-contract.md) completo.

## Não fazer

- Alterar confiança final do judge
- Bloquear sem trace documentado
