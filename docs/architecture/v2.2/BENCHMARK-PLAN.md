# V2.2 — Plano de benchmarks

Derivado de `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md` com política **D2**.

## Classificação de evidência

| Classe | O que é | Gates de produto? |
|--------|---------|-------------------|
| **`PROVISIONAL_SYNTHETIC`** | `raw/battery/` (`synth-repo`) | Não — sanity harness |
| **`OFFICIAL_BASELINE` (B0)** | `raw/battery-real/` braço **B0** no monorepo EvolveLoop | Sim — referência `rg`+leitura ampla |
| **`PROVISIONAL_CURATED_PACK` (B1)** | `raw/battery-real/` braço **B1** via pack `fixtures/evolveloop-project-knowledge/.ai/` | **Não** — `source_paths` alinhados aos gabaritos congelados (recall circular) |
| **`NOT_MEASURED`** | LLM ao vivo, `ground.sh`+`WIKI_ROOT` no bench VM | — |

## Estado

| Item | Valor |
|------|-------|
| B0 real | `OFFICIAL_BASELINE` — `raw/battery-real/battery-summary.json` → `classification_by_arm.B0` |
| B1 bench pack | `PROVISIONAL_CURATED_PACK` — mesmo raw, `classification_by_arm.B1` |
| Sintético | `PROVISIONAL_SYNTHETIC` — `raw/battery/` |
| Alvos numéricos B1 / continuidade B1 | `PROVISIONAL_CURATED_PACK` ou `PENDING_BASELINE` até procedimento § B1→oficial |
| Tokenizer | `tiktoken:cl100k_base` |

## Calibração observada (informativa; ver classe acima)

### B0 — `OFFICIAL_BASELINE` (R01–R06, sem fallback de âncora)

| Tarefa | recall | paths | tokens in (med.) | latência ms |
|--------|--------|------:|-----------------:|------------:|
| R01–R06 | ver raw | mediana rollup **45** | mediana **~66747** | ~41 |

Recall por tarefa: 0.0 em R01,R02,R05,R06; 1.0 em R03,R04 (ficheiros no cap `rg`).

### B1 — `PROVISIONAL_CURATED_PACK` (não promover a gate)

| Tarefa | recall | paths | tokens in |
|--------|--------|------:|----------:|
| R01–R06 | 1.0* | mediana **3** | mediana **1781** |

\*Circular face aos gabaritos — **não** conta como prova do mecanismo wiki.

### Continuidade S03/S07 — `PROVISIONAL_CURATED_PACK` (B1 no mini-fixture)

Observado: B1 paths 2, tokens 114 — **não** alvo oficial.

## Procedimento B1 → oficial (bloqueado até **V22-GOAL-005**)

1. **Mecanismo real:** braço B1 gerado por `ground.sh` / wiki operacional com `WIKI_ROOT` (ou `.ai/` de projeto criado pelos workflows 005 — init/query/update/lint), **não** pelo pack `evolveloop-project-knowledge` do bench.
2. **Conhecimento cego aos gabaritos:** páginas/packs escritos **sem** acesso a `tasks-real-frozen.json` nem às linhas-alvo; proveniência e hash no lint.
3. **Held-out:** conjunto de tarefas novas congeladas por autor **independente** de quem criou o conhecimento; publicar raw com `baseline_id` distinto.
4. **Re-medir:** B0 (inalterado) vs B1 mecanismo real; só então derivar alvos D2 (paths, tokens, recall) com margem sobre **essas** medianas.
5. **Dependência de roadmap:** fecho **B1 oficial** de V22-GOAL-003 **depende de** V22-GOAL-005 (ver `IMPLEMENTATION-ROADMAP.md`).

## Referências

- `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/EXPERIMENT-REAL.md`
- `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/tasks-real-frozen.json`
- E-001 · `orchestrator/contracts/knowledge.search.yaml`
