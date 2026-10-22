# V22-GOAL-005e — revisão PR #10 (B0 baseline, budget, híbrido Ollama)

## 1) Causa da queda B0 (8/12 → 5/12 no 005d)

| Hipótese | Veredito |
|----------|----------|
| Corpus monorepo inchado com `autogen-*.md` / `EvolveLoop/wiki` | **Falso** — ingest auto vive só em `/opt/karpathyWiki`; não há `autogen-*` no monorepo. |
| `rg` a ler fixture wiki / evals | **Parcial** — B0 incluía `fixtures/evolveloop-wiki-vault/**` e `tasks-held-out-frozen.json` (ruído, não explica sozinho os 3 misses). |
| Mudança silenciosa de código vs tarefas congeladas | **Principal** — H08, H12, H14: ficheiro **lido** pelo B0, mas verificador **linha estrita** falhou após refactors no `orchestrator` (ex.: `error_code` passou da linha 183→186; `knowledgeSearch` 16→43). |

**Correções (harness 1.5.0):**

- `RG_GLOBS` B0: exclui fixture vault, `autogen-*`, `EvolveLoop/wiki`, `docs/internal/historical/evals/**`.
- `V22_ANCHOR_RECALL=file` (default): substring no ficheiro se o path foi lido; nota `anchor line drift` quando a linha mudou.
- Remedição **não** altera tarefas H07–H18.

## 2) Budget justo B0/B1

| Env | Valor |
|-----|------:|
| `V22_BENCH_MAX_PATHS` | 45 |
| `V22_BENCH_MAX_INPUT_TOKENS` | 22000 |

Ambos os braços param de acrescentar ficheiros/excertos ao atingir o teto. Com isto, B1 deixa de inflar para ~35k tokens (005d).

## 3) Ollama + índice híbrido real

| Passo | Resultado |
|-------|-----------|
| `apt install zstd` + `ollama.com/install.sh` | OK |
| `ollama serve` (tmux) + `ollama pull nomic-embed-text` | OK (modelo default `OLLAMA_EMBEDDING_MODEL` do karpathyWiki) |
| `gaabwiki index --rebuild` em `/opt/karpathyWiki` | OK — **8572** chunks embedados, BM25 reconstruído |
| BM25-only no harness | `V22_B1_RETRIEVAL=bm25` (desliga Ollama no subprocess via `OLLAMA_URL` inválido) |
| Híbrido real | `V22_B1_RETRIEVAL=hybrid` (default com Ollama up) |

## Tabelas de medição (harness 1.5.0)

### Dev H07–H18

| Modo B1 | B0 recall≥1 | B1 recall≥1 | Mediana tokens B0 | Mediana tokens B1 | Mediana latência B1 (ms) |
|---------|-------------|-------------|-------------------|-------------------|--------------------------|
| BM25 degradado | **8/12** | 2/12 | 13210 | 21071 | 2787 |
| Híbrido (Ollama) | **8/12** | **9/12** | 13210 | 21506 | 1654 |

Raw: `raw/battery-held-out-real-engine-005e-bm25-dev/`, `raw/battery-held-out-real-engine-005e-hybrid-dev/`.

### Teste H19–H24 (held-out, sem retuning)

| Modo B1 | B0 recall≥1 | B1 recall≥1 | Mediana tokens B0 | Mediana tokens B1 | Mediana latência B1 (ms) |
|---------|-------------|-------------|-------------------|-------------------|--------------------------|
| BM25 degradado | 5/6 | 1/6 | 14612 | 21732 | 5668 |
| Híbrido (Ollama) | 5/6 | **6/6** | 14612 | (ver summary) | 2447 |

Raw: `raw/battery-held-out-real-engine-005e-bm25-test/`, `raw/battery-held-out-real-engine-005e-hybrid-test/`.

**Aceite teste:** com **híbrido real**, B1 **≥** B0 (6/6 vs 5/6). BM25 degradado continua abaixo (1/6).

## Validação

- `orchestrator` vitest: ver CI local desta branch
- `fixtures/evolveloop-wiki-vault` pytest: 2 passed
- `test-official-wiki-stale.sh`: PASS
- `validate-v22-artifacts.sh`: PASS

## SHA

Ver `freeze_tree_sha` nos `held-out-summary.json` sob `005e-*` após push.

## Riscos

1. **Anchor `file` vs `line`:** comparáveis a 005c só com `V22_ANCHOR_RECALL=line` no mesmo `tree_sha`.
2. **Ollama** — index rebuild ~19 min para 861 docs; não reproduzível sem GPU/CPU e modelo embed.
3. **Dual-search B1** ainda corre em BM25 degradado; híbrido melhora ranking mas latência depende de Ollama.
4. B0 **5/6** no teste (H24) — limitação do `rg` gabarito, não do wiki.
