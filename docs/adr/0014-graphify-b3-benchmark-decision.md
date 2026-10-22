# ADR-0014: Graphify B3 benchmark — integrar atrás de flag (experimento)

| Campo | Valor |
|-------|-------|
| **Status** | Aceite |
| **task_id** | `V22-GOAL-008-graphify-B3` |
| **Data** | 2026-10-22 |
| **Relacionado** | V22-GOAL-008, `BENCHMARK-PLAN.md` braço B3, TD-02 (sem `KnowledgeBackendId`) |

## Contexto

Medição **coerente** com `v22-ground-b1-harness-1.5.0`: recall **por arquivo**, orçamento **45 paths / 22 000 tokens**, `V22_ANCHOR_RECALL=file`. **B0** e **B3** medidos na mesma VM/passagem; raw em `experiments/V22-BENCH/raw/battery-b3-graphify/`.

**Graphify (pacote):** PyPI **`graphifyy`** 0.9.93 → binário CLI `graphify`; upstream **[Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)** (Apache-2.0); site **[graphify.com](https://graphify.com)**. Modo bench: `graphify update . --no-cluster` (AST local, sem `--wiki`/LLM/cloud).

**B1 held-out:** motor karpathyWiki **ausente** nesta VM → braços **B1** em H07–H24 vêm de runs **congelados** (mesmo harness 1.5.0, linhagem PR #10): `005e-hybrid-dev` (H07–H18), `005e-hybrid-test` (H19–H24). **R01–R06:** B1 **PROVISIONAL_CURATED_PACK** = **CIRCULAR** — **fora** da comparação (só B0 vs B3).

## Tabelas por split (contagens exatas)

### R01–R06 — B0 vs B3 (B1 excluído)

| Braço | Tarefas | recall=1 | Mediana paths | Mediana tokens | Mediana latência (ms) |
|-------|--------:|---------:|--------------:|---------------:|----------------------:|
| **B0** | 6 | **0** | 19 | 21 338 | 114 |
| **B3** | 6 | **2** | 8 | 20 545 | 806 |
| B1 (CIRCULAR) | 6 | — | — | — | — |

### H07–H18 (dev) — B0 vs B1 (frozen hybrid) vs B3

| Braço | Tarefas | recall=1 | Mediana paths | Mediana tokens | Mediana latência (ms) |
|-------|--------:|---------:|--------------:|---------------:|----------------------:|
| **B0** | 12 | **5** | 18,5 | 21 370 | 94 |
| **B1** | 12 | **4** | 20,5 | 15 036 | 155 |
| **B3** | 12 | **9** | 9 | 20 661 | 750 |

Fonte B1: `raw/battery-held-out-real-engine-005e-hybrid-dev/` (frozen).

### H19–H24 (teste) — B0 vs B1 (frozen hybrid) vs B3

| Braço | Tarefas | recall=1 | Mediana paths | Mediana tokens | Mediana latência (ms) |
|-------|--------:|---------:|--------------:|---------------:|----------------------:|
| **B0** | 6 | **3** | 19,5 | 19 798 | 103 |
| **B1** | 6 | **3** | 6 | 13 652 | 135 |
| **B3** | 6 | **6** | 10,5 | 20 560 | 718 |

Fonte B1: `raw/battery-held-out-real-engine-005e-hybrid-test/` (frozen).

## Decisão

**INTEGRAR atrás de `EVOLVELOOP_GRAPHIFY` (default OFF)** — adapter CLI real; **não** `KnowledgeBackendId`. B3 melhora recall vs B0 em held-out/teste nesta medição, mas **não** substitui B1 wiki nem vence em tokens/latência; R01–R06 ainda fracos vs anchors.

## Riscos

- Grafo grande + ~0,7–0,8 s/tarefa B3; rebuild opt-in.
- B1 held-out depende de motor oficial fora da VM para replicar frozen.
- Contaminação possível no grafo (paths de eval); filtro na leitura.

## Validação

`graphify_b3_harness.py`, `npm test`, `test:bench`, `validate-v22-artifacts.sh`.
