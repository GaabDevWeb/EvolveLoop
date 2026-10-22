# V2.2 — Plano de benchmarks

Derivado de `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md` com política **D2**.

## Classificação de evidência

| Classe | O que é | Gates de produto? |
|--------|---------|-------------------|
| **`PROVISIONAL_SYNTHETIC`** | `raw/battery/` (`synth-repo`) | Não — sanity harness |
| **`OFFICIAL_BASELINE` (B0)** | `raw/battery-real/` braço **B0** no monorepo EvolveLoop | Sim — referência `rg`+leitura ampla |
| **`PROVISIONAL_CURATED_PACK` (B1)** | `raw/battery-real/` braço **B1** via pack `fixtures/evolveloop-project-knowledge/.ai/` | **Não** — `source_paths` alinhados aos gabaritos congelados (recall circular) |
| **`FIXTURE_WIKI_GROUND` (B1)** | `raw/battery-held-out/` via `ground_b1_harness.py` + `fixtures/evolveloop-wiki-vault` (CLI `gaabwiki` **mínimo no repo**) | Não — prova de mecanismo/contrato; não substitui vault externo |
| **`OFFICIAL_WIKI_GROUND` (B1)** | `ground_b1_harness.py` 1.5.0 + karpathyWiki `cd3cf08` + Ollama embed + `raw/battery-held-out-official-hybrid/` | Sim — gates D2 em `GOAL-003-005-official-report.md` |
| **`NOT_MEASURED`** | LLM ao vivo | — |
| **`GRAPHIFY_CODE_GRAPH` (B3)** | `raw/battery-b3-graphify/` — `graphify query` + leitura de paths `src=` (AST local, `--no-cluster`) | Não — experimento GOAL-008; ver ADR-0014 |

## Estado

| Item | Valor |
|------|-------|
| B0 real | `OFFICIAL_BASELINE` — `raw/battery-real/battery-summary.json` → `classification_by_arm.B0` |
| B1 bench pack | `PROVISIONAL_CURATED_PACK` — mesmo raw, `classification_by_arm.B1` |
| Sintético | `PROVISIONAL_SYNTHETIC` — `raw/battery/` |
| B1 held-out (fixture vault) | `FIXTURE_WIKI_GROUND` — `raw/battery-held-out/held-out-summary.json` |
| Alvos B1 held-out teste (D2) | recall B1≥B0; B1 tokens ≤22000; latência ≤3000 ms (manifest oficial 2×) |
| Alvos continuidade B1 | `PENDING_BASELINE` (S03/S07 fixture) |
| Tokenizer | `tiktoken:cl100k_base` |
| B3 Graphify (2026-10-22) | `GRAPHIFY_CODE_GRAPH` — `raw/battery-b3-graphify/b3-summary.json` (harness 1.5.0, recall por arquivo) |

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

## Procedimento B1 → oficial (**V22-GOAL-003-005-official**)

Script: `docs/architecture/v2.2/scripts/run-official-wiki-hybrid-bench.sh`  
Manifest: `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery-held-out-official-hybrid/OFFICIAL-MANIFEST.json`  
Scorer canônico: `harness/v22_anchor_scorer.py` (`v22-anchor-scorer-1.0.0`, modo `file_evidence`; budget `V22_BENCH_TOKENIZER=tiktoken`). Re-score offline: `harness/reconcile_canonical_scores.py`.

## Procedimento histórico B1 → oficial (pré-manifest)

1. **Mecanismo real:** braço B1 gerado por `ground.sh` / wiki operacional com `WIKI_ROOT` (ou `.ai/` de projeto criado pelos workflows 005 — init/query/update/lint), **não** pelo pack `evolveloop-project-knowledge` do bench.
2. **Conhecimento cego aos gabaritos:** páginas/packs escritos **sem** acesso a `tasks-real-frozen.json` nem às linhas-alvo; proveniência e hash no lint.
3. **Held-out:** conjunto de tarefas novas congeladas por autor **independente** de quem criou o conhecimento; publicar raw com `baseline_id` distinto.
4. **Re-medir:** B0 (inalterado) vs B1 mecanismo real; só então derivar alvos D2 (paths, tokens, recall) com margem sobre **essas** medianas.
5. **Dependência de roadmap:** fecho **B1 oficial** de V22-GOAL-003 **depende de** V22-GOAL-005 (ver `IMPLEMENTATION-ROADMAP.md`).

## Referências

- `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/EXPERIMENT-REAL.md`
- `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/tasks-real-frozen.json`
- E-001 · `orchestrator/contracts/knowledge.search.yaml`
