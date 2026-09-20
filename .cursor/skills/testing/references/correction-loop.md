# Loop de correcção (Fase 3)

Quando testes falham **dentro do scope** do brief:

1. **Ler** saída completa — stack trace, diff, mensagem de assertion
2. **Analisar** — tabela: teste | mensagem | hipótese | contrato violado
3. **Fix mínimo** — uma causa por ciclo; sem refactor fora do scope
4. **Re-executar** o **mesmo** comando scoped
5. **Registar** cada tentativa no relatório (secção Correcções + Re-execução)

## Limites

| Contexto | Max tentativas locais | Depois |
|----------|----------------------|--------|
| Sub-agente testing (PDA) | 3 | `[ENCERRAMENTO] bloqueado` + handoff ao orquestrador |
| Orquestrador raiz | 3 | Delegar diagnóstico (`/debugger` — absorve Tier3 `systematic-debugging`; **não** invocar package paralelo) |

## Fora de scope

Se falhas **não** pertencem ao brief (ex.: 50 testes billing quando brief era CSS):

- **Não** corrigir
- Veredito **VERMELHO**
- DECISÃO sugerida: `replanejar`
- Documentar bloqueio de scope
