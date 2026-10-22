# V2.2 — Plano de benchmarks

Derivado de `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md` com política **D2**: resultados externos (JetBrains, Reddit, Anthropic contextual retrieval, LLMLingua) são **contexto bibliográfico** em `docs/research/evolveloop-v2.2/sources.md` — **nunca** como resultado EvolveLoop nem como gate numérico.

## Estado

| Item | Valor | Rotulo |
|------|-------|--------|
| Execução B0/B1 (harness offline) | `MEASURED` — `V22-BENCH/raw/battery/battery-summary.json` (`baseline_id` `v22-b0b1-2026-10-22`) | projeto |
| LLM ao vivo (modelo/tokens saída reais) | `NOT_MEASURED` — `model.id` no raw | projeto |
| Tokenizer | `tiktoken:cl100k_base` (registrado em `raw/battery/environment.json`) | projeto |
| Alvos P1/P2 derivados | Ver `EVOLVELOOP_V2.2_GOALS.md` (003, 005, 006) | produto D2 |
| Tree pin (corrida) | SHA em `raw/battery/environment.json` → `source_revision` | projeto |

## Baselines obrigatórios (antes de qualquer meta numérica)

| Braço | Conteúdo | Meta V2.2 | Ordem |
|-------|---------|-----------|-------|
| **B0** | Sem `.ai/`, sem grafo; `rg` + leitura | V22-GOAL-003 | 1º |
| **B1** | `.ai/` com fatos verdadeiros do fixture | V22-GOAL-003, 005 | 2º (após B0) |
| B1s | Página errada deliberada | V22-GOAL-005 cenário 6 | após B1 |
| B2 | Manifest hash stale | V22-GOAL-005 | após B1 |
| B3 | B1 + Graphify código only | V22-GOAL-008 | **só após B0/B1** |
| B4 | Estilo saída curto | V22-GOAL-009 | após B0 |
| B5 | Catálogo skills cheio vs reduzido | monitorar; **não** `max_skills` engine | opcional host |

## Campos obrigatórios no raw (reprodutibilidade)

Conforme plano 08: modelo, data, tokenizer (não whitespace como aceite final), harness, SHA do tree, tarefa, verificador, orçamento declarado, contagem de `read`/`rg` por path, tokens entrada/saída/total, cache host `UNKNOWN` se não observável.

**Destino de raw JSON:** `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery/` (populado pela bateria F3).

## Tarefas representativas (cenários mínimos por meta)

| Cenário | Descrição | Metas | Braços |
|---------|-----------|-------|--------|
| 1 | Projeto sem wiki | 003, 005 | B0 |
| 2 | Wiki inicializada | 003, 005 | B0 vs B1 |
| 3 | Nova sessão, retomar decisão | 004, 005 | B0 vs B1 |
| 6 | Wiki desatualizada | 002, 005 | B1s |
| 7 | Decisão antiga | 004, 005 | B1 |
| 10 | Retrieval seletivo vs leitura ampla | 006 | B0 vs B1 |
| 12 | Dois projetos / canário | 002 | B1 ×2 |
| 5, 11 | Dependentes / stale grafo | 008 | B0, B1, B3 |
| 9 | Compressão saída | 009 | B0 vs B4 |
| — | Canário segredo | 007 | fixture dedicado |

## Regras de qualidade (bloqueiam “economia”)

Do plano 08: verificador não pode cair; negações do gabarito não podem sumir em braços de compressão; zero excerpt de outro projeto; zero segredo no log commitado.

## Calibração pós-baseline (F3 — mediana observada, 1 run/arm)

| Cenário | Braço | paths lidos (mediana) | tokens entrada (mediana, `cl100k_base`) | verificador |
|---------|-------|----------------------:|----------------------------------------:|-------------|
| 2 (S02) | B0 | 15 | 650 | pass |
| 2 (S02) | B1 | 4 | 247 | pass |
| 5 (S05) | B0 | 15 | 650 | pass |
| 5 (S05) | B1 | 3 | 164 | pass |

Fonte: `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery/battery-summary.json`.

1. B0/B1 nos cenários 2 e 5 — **feito** (harness offline).
2. Medianas publicadas acima (tokenizer nomeado no raw).
3. Alvos derivados em `EVOLVELOOP_V2.2_GOALS.md` com referência ao raw e `source_revision`.
4. B1 reduziu paths vs B0 nos cenários 2 e 5; margem de continuidade para cenários 3/7 permanece `PENDING_BASELINE` até fixture dedicado.

## Referências internas

- E-001 integridade: `docs/internal/historical/evals/docs-evals/experiments/E-001/`
- Contrato knowledge: `orchestrator/contracts/knowledge.search.yaml`
- Pesquisa completa: `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md`
