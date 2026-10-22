# ADR-0014: Graphify B3 benchmark — integrar atrás de flag (experimento)

| Campo | Valor |
|-------|-------|
| **Status** | Aceite |
| **task_id** | `V22-GOAL-008-graphify-B3` |
| **Data** | 2026-10-22 |
| **Relacionado** | V22-GOAL-008, `BENCHMARK-PLAN.md` braço B3, TD-02 (sem `KnowledgeBackendId`) |

## Contexto

Medição **coerente** com `v22-ground-b1-harness-1.5.0`: recall **por arquivo** via scorer canônico **`v22-anchor-scorer-1.0.0`** (`V22_ANCHOR_SCORER_MODE=file_evidence`), tokenizer **`tiktoken:cl100k_base`**, orçamento **45 paths / 22 000 tokens**. Suite default **`V22_B3_SUITE=official-held-out`**: H07–H24 apenas; raw em `experiments/V22-BENCH/raw/battery-b3-graphify/`.

**B0 / B1 (held-out):** paths, tokens e latência do run **OFFICIAL** híbrido (`raw/battery-held-out-official-hybrid/run-01/`, manifest `OFFICIAL-MANIFEST.json`); **recall** re-calculado na **mesma árvore** que o manifest (`b127bae` na verificação `V22-FINAL-verify-2`). **B3:** re-medido ao vivo (`graphify query`, grafo `graphify-out/graph.json`).

**Graphify (pacote):** PyPI **`graphifyy`** 0.9.93 → binário CLI `graphify`; upstream **[Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)** (Apache-2.0); site **[graphify.com](https://graphify.com)**. Modo bench: `graphify update . --no-cluster` (AST local, sem `--wiki`/LLM/cloud).

## Tabela única — held-out dev (H07–H18)

| Braço | Evidência | Tarefas | recall=1 | Mediana paths | Mediana tokens | Mediana latência (ms) |
|-------|-----------|--------:|---------:|--------------:|---------------:|----------------------:|
| **B0** | OFFICIAL_BASELINE | 12 | **7** | 18,5 | 21 284 | 76 |
| **B1** | OFFICIAL_WIKI_GROUND (híbrido run-01) | 12 | **9** | 8,5 | 20 463 | 1 639 |
| **B3** | GRAPHIFY_CODE_GRAPH (live) | 12 | **9** | 9 | 20 522 | 750 |

## Tabela única — held-out teste (H19–H24)

| Braço | Evidência | Tarefas | recall=1 | Mediana paths | Mediana tokens | Mediana latência (ms) |
|-------|-----------|--------:|---------:|--------------:|---------------:|----------------------:|
| **B0** | OFFICIAL_BASELINE | 6 | **4** | 19,5 | 20 099 | 87 |
| **B1** | OFFICIAL_WIKI_GROUND (híbrido run-01) | 6 | **5** | 7,5 | 21 531 | 1 654 |
| **B3** | GRAPHIFY_CODE_GRAPH (live) | 6 | **6** | 10,5 | 20 699 | 724 |

Fonte agregada: `raw/battery-b3-graphify/b3-summary.json` → `unified_official_table` (harness `v22-graphify-b3-harness-1.5.0`).

## Decisão

**INTEGRAR atrás de `EVOLVELOOP_GRAPHIFY` (default OFF)** — adapter CLI real; **não** `KnowledgeBackendId`. B3 empata B1 em recall no dev (9/12) e iguala teste (6/6), com latência inferior ao motor wiki oficial congelado nesta VM; tokens ~B0/B1 no orçamento atual. Não substitui pipeline B1 nem promove backend default.

## Riscos

- Grafo grande + ~0,7–0,8 s/tarefa B3; rebuild opt-in.
- Replicar B1 **live** exige Ollama/motor wiki fora do contrato CI mínimo (held-out usa paths congelados do manifest).
- Contaminação possível no grafo (paths de eval); filtro na leitura.

## Validação

`graphify_b3_harness.py`, `run-graphify-b3-bench.sh`, `npm test`, `test:bench`, `validate-v22-artifacts.sh`, `integrity_test.py --official`.
