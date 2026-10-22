# V2.2 — Plano de benchmarks

Derivado de `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md` com política **D2**: resultados externos são **contexto bibliográfico** — **nunca** como gate numérico.

## Classificação de evidência (CEO F3b)

| Classe | Onde | Uso |
|--------|------|-----|
| **`PROVISIONAL_SYNTHETIC`** | `V22-BENCH/raw/battery/` (`synth-repo`, 15 ficheiros) | Sanity check do harness; **não** alvo de produto |
| **`OFFICIAL_BASELINE`** | `V22-BENCH/raw/battery-real/` (monorepo EvolveLoop) | Alvos numéricos oficiais D2 |
| **`NOT_MEASURED`** | LLM ao vivo, `ground.sh` com vault real | Registar motivo no raw |

**Limite do sintético:** B0 com cap fixo e B1 com `wiki_pages` declaradas na tarefa tornam a redução de paths **parcialmente tautológica** — reclassificado em F3b.

## Estado

| Item | Valor | Rotulo |
|------|-------|--------|
| B0/B1 sintético | `PROVISIONAL_SYNTHETIC` — `raw/battery/battery-summary.json` | projeto |
| B0/B1 corpus real | `OFFICIAL_BASELINE` — `raw/battery-real/battery-summary.json` | projeto |
| LLM ao vivo | `NOT_MEASURED` | projeto |
| Tokenizer | `tiktoken:cl100k_base` | projeto |
| `ground.sh` / `WIKI_ROOT` | `NOT_MEASURED` no VM de bench (B1 usa pack `.ai/` de referência) | projeto |
| Alvos oficiais | `EVOLVELOOP_V2.2_GOALS.md` (003, 004, 005, 006) | produto D2 |

## Baselines obrigatórios

| Braço | Conteúdo | Meta V2.2 | Ordem |
|-------|---------|-----------|-------|
| **B0** | Sem `.ai/`; `rg` + leitura (real: monorepo) | V22-GOAL-003 | 1º |
| **B1** | `.ai/` projeto (pack bench ou wiki operacional) | V22-GOAL-003, 005 | 2º |
| B1s–B5 | … | … | conforme plano 08 |

**Raw:** `raw/battery/` (sintético) · `raw/battery-real/` (oficial).

## Calibração oficial (corpus real, `tasks-real-frozen.json`)

Mediana por tarefa R01–R06 (1 run/arm, sem fallback de âncora no B0):

| Tarefa | B0 recall | B0 paths | B0 tokens in | B1 recall | B1 paths | B1 tokens in |
|--------|-----------|---------:|-------------:|-----------|---------:|-------------:|
| R01 | 0.0 | 46 | 82621 | 1.0 | 5 | 3491 |
| R02 | 0.0 | 46 | 82621 | 1.0 | 5 | 3491 |
| R03 | 1.0 | 23 | 37607 | 1.0 | 3 | 1820 |
| R04 | 1.0 | 45 | 44403 | 1.0 | 3 | 1160 |
| R05 | 0.0 | 46 | 45404 | 1.0 | 3 | 384 |
| R06 | 0.0 | 23 | 81908 | 1.0 | 3 | 1742 |

Rollup mediano real: B0 paths 45 · tokens in 66690 · B1 paths 3 · tokens in 1781.

**Continuidade (fixture `continuity-s37`, cenários 3/7):**

| ID | B0 recall / paths / tokens | B1 recall / paths / tokens |
|----|----------------------------|----------------------------|
| S03 | 0.0 / 9 / 269 | 1.0 / 2 / 114 |
| S07 | — | 1.0 / 2 / 114 |

Fonte: `raw/battery-real/battery-summary.json` · detalhe tarefas: `V22-BENCH/EXPERIMENT-REAL.md`.

## Alvos oficiais (derivados, margem justificada)

Aplicam-se ao corpus **real** (`OFFICIAL_BASELINE`), não ao sintético.

| Métrica | Alvo | Justificativa |
|---------|------|----------------|
| B1 recall (R01–R06) | 1.0 | Gabarito file:line obrigatório |
| B1 paths por tarefa | ≤ 5 | Mediana 3 + 2 (crescimento índice `.ai/`) |
| B1 tokens entrada | ≤ 4000 | Mediana 1781 + ~2220 margem packs |
| B0 recall | **não é gate** | Broad `rg` falha gabarito linha em 4/6 tarefas com cap 45 |
| S03/S07 B1 | recall 1.0; paths ≤ 3 | Observado 2 paths; mini fixture continuidade |

Sintético: manter apenas regressão `integrity_test` (`PROVISIONAL_SYNTHETIC`).

## Referências

- `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/EXPERIMENT-REAL.md`
- E-001 · contrato `orchestrator/contracts/knowledge.search.yaml`
- Pesquisa: `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md`
