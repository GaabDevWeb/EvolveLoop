# Auditoria de estado da ponta

| Campo | Valor |
|-------|-------|
| **task_id** | V22-GAP-P0-3 |
| **Base** | `release/v2.1-freeze-preparation` @ `f611780` (merge do PR #19) |
| **O que este ficheiro não é** | Não substitui o corpo de `docs/research/evolveloop-v2.2/01-current-state-audit.md`, que descreve `28ab56ce` em 2026-10-21 e diz que a implementação V2.2 não tinha começado. Esse texto permanece. Uma linha no topo aponta para aqui |
| **Medição** | `tree_sha` em `docs/v22/baseline/raw/p0-baseline-report.json` e `docs/v22/baseline/raw/p0-handoff-report.json` |

O dossiê de outubro não serve de estado desta release. A implementação V2.2 já está no tree.

## O que existe

| Peça | Onde | Estado na ponta |
|------|------|-----------------|
| Working context descartável e retomada por checkpoint, memory e `.ai/` | `docs/adr/0013-context-ownership-working-context.md` | Aceite. Compaction engine `NOT_IMPLEMENTED` |
| Cerca código sobre wiki | `orchestrator/src/knowledge/truth-source/fence.ts` | Testes de unidade verdes |
| Continuidade entre processos | `orchestrator/src/session/session-continuity.ts` | Teste de integração retoma job e rejeita checkpoint adulterado |
| Orçamento no pickup | `orchestrator/src/context/budget.ts` | Classes protegidas não são cortadas a meio |
| Baseline das seis tarefas | `docs/v22/baseline/` | Entrada medida com tiktoken. Saída, cache e custo `NOT_MEASURED` |
| Handoff com N≥3 | `docs/v22/baseline/raw/p0-handoff-report.json` e `orchestrator/tests/unit/v22-p0-handoff.test.ts` | Volume contra o payload de referência. Retomada do receptor pelo snapshot de continuidade |
| Memória episódica pública | `profiles/default.yaml` | `memory.enabled: false` |
| Graphify | `EVOLVELOOP_GRAPHIFY` default OFF. ADR-0014 | Não é backend de conhecimento |
| Caveman e cache de prefixo | `EVOLVELOOP_BREVITY_CAVEMAN`, `EVOLVELOOP_PROMPT_CACHE` default OFF | Hit HTTP de vendor `NOT_MEASURED` |
| CI | `.github/workflows/ci.yml` | `npm test`, `npm run test:bench`, pytest do agent-setup, validador. Tokenizer da medição instalado no venv |

## O que não está medido ou não existe

| Item | Estado |
|------|--------|
| Tokens de saída de um modelo generativo | `NOT_MEASURED` |
| Cache de vendor e custo | `NOT_MEASURED` |
| Híbrido Ollama / `OFFICIAL_WIKI_GROUND` nesta baseline | `NOT_MEASURED` |
| Latência de modelo | `NOT_MEASURED`. A latência publicada é de montagem, estado `LIMITED` |
| Compactação e reinject | `UNAVAILABLE`. `orchestrator/src/context/compaction-contract.ts` recusa reinject |
| Host Cursor como superfície de pickup | Fora do contrato testado |
| Branch `evolve-v3` | Hipótese. Não está neste tree |

`ENTREGUE_CI` no relatório de consolidação não altera esta tabela.
