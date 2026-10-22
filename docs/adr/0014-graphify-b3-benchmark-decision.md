# ADR-0014: Graphify B3 benchmark — integrar atrás de flag (experimento)

| Campo | Valor |
|-------|-------|
| **Status** | Aceite |
| **task_id** | `V22-GOAL-008-graphify-B3` |
| **Data** | 2026-10-22 |
| **Relacionado** | V22-GOAL-008, `BENCHMARK-PLAN.md` braço B3, TD-02 (sem `KnowledgeBackendId`) |

## Contexto

Medição do braço **B3** (retrieval via grafo de código Graphify OSS, AST local, sem `--wiki`/LLM/cloud) no harness V22-BENCH 1.5.0: mesmas tarefas **R01–R06**, **H07–H18**, **H19–H24**; orçamento **45 paths / 22k tokens**; recall **por arquivo** (`V22_ANCHOR_RECALL=file`). Raw: `experiments/V22-BENCH/raw/battery-b3-graphify/`. Grafo: `graphifyy` **0.9.93**, `graphify update . --no-cluster` → `graphify-out/graph.json` (gitignored).

Comparação **B0/B1** usa manifests congelados (B1 held-out **PR #10** / motor oficial: `raw/battery-held-out-real-engine/`; H19–H24: `raw/battery-held-out-real-engine-005e-hybrid-test/`; R01–R06 B1 pack: `raw/battery-real/battery-summary.json`).

## Números (rollup, tree `9b647f8`)

| Braço | Mediana paths | Mediana tokens in | Recall=1 (tarefas / 24) | Notas |
|-------|---------------|-------------------|-------------------------|-------|
| **B0** (manifest) | ~45 (cap) | alto (40k–80k em R) | misto | `OFFICIAL_BASELINE` |
| **B1** (manifest) | 3–16 | 0.4k–20k | maior no pack R (circular) | wiki / pack |
| **B3** (medido) | **9** | **~20 641** | **17 / 24** | `GRAPHIFY_CODE_GRAPH` |

B3 **supera B0 em recall** em várias held-out (ex.: H08–H12, H19–H24) onde B0=0; **não** supera B1 no pack **R01–R06** (B1 recall 1.0 com paths mínimos). Latência B3 ~**0,7 s**/tarefa (query + leitura). Critério comunitário “B3 vence B0 no cenário 5 **e** não perde para B1 em tokens” **não** satisfeito globalmente (tokens B3 ≫ B1 pack; recall R01–R03 = 0).

## Decisão

**INTEGRAR atrás de `EVOLVELOOP_GRAPHIFY` (default OFF)** com adapter real (`orchestrator/src/v22/graphify-adapter.ts`) chamando o CLI quando `graphify-out/graph.json` existe; **não** adicionar `"graphify"` a `KnowledgeBackendId`. Graphify é **complemento opcional** de contexto de código no `run-engine`, não substituto de wiki/B1.

**Não descartar** o experimento: evidência útil em held-out vs B0; manter bench reprodutível (`run-graphify-b3-bench.sh`).

## Riscos

- **Build/size:** grafo monorepo ~6,9 MB JSON; rebuild em CI custoso — opt-in.
- **Contaminação:** nós podem apontar para paths sob `docs/internal/.../fixtures/` se presentes no grafo; harness filtra leitura, mas o grafo pode incluir ruído.
- **Latência:** query Graphify por spawn não é gratuita.
- **Host Cursor:** paths do grafo não substituem report de `context_retrieval` do IDE.

## Validação

- `graphify_b3_harness.py` + raw commitado
- `orchestrator` testes unitários/integração GOAL-008
- `npm test`, `test:bench`, `validate-v22-artifacts.sh`
