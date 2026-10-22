# V22-GOAL-003-005-official — OFFICIAL_WIKI_GROUND (híbrido)

**Base:** `release/v2.1-freeze-preparation` @ `9b647f8`  
**Manifest:** `raw/battery-held-out-official-hybrid/OFFICIAL-MANIFEST.json`  
**Harness:** `v22-ground-b1-harness-1.5.0`  
**Motor:** karpathyWiki `cd3cf08` (tarball SHA256 `11160e77…852377`)  
**Embedding:** Ollama `nomic-embed-text`  
**Índice:** `gaabwiki index --rebuild` com `CORPUS_SET=evolveloop` (8760 chunks, 891 docs)

## Comandos

```bash
docs/architecture/v2.2/scripts/run-official-wiki-hybrid-bench.sh
# integrity (após manifest SUCCESS):
python3 docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness/integrity_test.py \
  --official docs/.../OFFICIAL-MANIFEST.json
```

**Exit codes observados:** pipeline `0`; Ollama ausente `10`; bootstrap falha `11`.

## Estabilidade (2 rebuilds completos)

| Run | Split | B0 recall≥1 | B1 recall≥1 | B1 tokens (med.) | B1 latência ms (med.) |
|-----|-------|-------------|-------------|------------------|------------------------|
| run-01 | dev H07–H18 | 8/12 | **9/12** | 21426 | 1591 |
| run-01 | test H19–H24 | 5/6 | **6/6** | 21069 | 2416 |
| run-02 | dev H07–H18 | 8/12 | **9/12** | 21426 | 1585 |
| run-02 | test H19–H24 | 5/6 | **6/6** | 21069 | 2427 |

B0 estável; B1 idêntico entre runs (recall e rollups de tokens).

## Integridade

| Check | Resultado |
|-------|-----------|
| `tasks-held-out-frozen.json` SHA256 | `e3a536b8…ada995e` (manifest) |
| B1 sem `task["rg_patterns"]` | PASS |
| `held-out-summary.json` vs `held-out-all-runs.json` | PASS |
| `integrity_test.py --official` | `ALL_OFFICIAL_INTEGRITY_OK` |
| `pytest test_official_manifest.py` | PASS (com manifest) |

## Alvos D2 (calibrados nesta medição)

| Alvo | Valor | Passa (teste H19–H24) |
|------|------:|:---------------------:|
| Recall B1 ≥ B0 (held-out teste) | 6/6 ≥ 5/6 | sim |
| B1 mediana tokens entrada | ≤ 22000 | sim (~21069) |
| B1 mediana latência | ≤ 3000 ms | sim (~2420) |
| Estabilidade 2× rebuild | recall igual | sim |

## Correção de reprodutibilidade

`bootstrap-karpathywiki-official-bench.sh` exporta `CORPUS_YAML` + `CORPUS_SET=evolveloop` **antes** de `gaabwiki index --rebuild` (evita indexar corpus default do motor e apagar `EvolveLoop/wiki`).

## Riscos

1. Ollama + rebuild ~20 min/run — não é gate de CI rápido.  
2. Corpus evolveloop cresce com o monorepo (891 docs nesta SHA).  
3. `V22_ANCHOR_RECALL=file` — comparar com medições 005c linha-estrita requer env explícito.
