# V2.2 — Plano de benchmarks

Derivado de `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md` com política **D2**: resultados externos (JetBrains, Reddit, Anthropic contextual retrieval, LLMLingua) são **contexto bibliográfico** em `docs/research/evolveloop-v2.2/sources.md` — **nunca** como resultado EvolveLoop nem como gate numérico.

## Estado

| Item | Valor | Rotulo |
|------|-------|--------|
| Execução no EvolveLoop | `NOT_MEASURED` (pesquisa 2026-10-21) | pesquisa |
| Alvos de melhoria P1/P2 | `PENDING_BASELINE` até B0/B1 | produto D2 |
| Tree pin | `28ab56ce091fc25edbf67e5106268580becff2b2` | projeto |

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

**Destino de raw JSON:** `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery/` (placeholder; execução `NOT_MEASURED`).

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

## Calibração pós-baseline (procedimento, não números fixos)

1. Executar B0 e B1 nos cenários 2 e 5.
2. Publicar medianas de paths lidos e tokens (tokenizer nomeado).
3. Escrever alvos derivados no `EVOLVELOOP_V2.2_GOALS.md` (substituir `PENDING_BASELINE` **somente** com referência ao raw SHA).
4. Se B1 não reduzir paths, wiki ainda pode ser aceita por continuidade (cenários 3, 7) com margem de tokens definida **a partir** do baseline (+10% proposta inicial na pesquisa — permanece `PENDING_BASELINE` até medição).

## Referências internas

- E-001 integridade: `docs/internal/historical/evals/docs-evals/experiments/E-001/`
- Contrato knowledge: `orchestrator/contracts/knowledge.search.yaml`
- Pesquisa completa: `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md`
