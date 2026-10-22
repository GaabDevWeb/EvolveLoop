# V22-GOAL-005c — corrida OFFICIAL (motor real)

## Origem do motor

| Campo | Valor |
|-------|--------|
| Origem | Snapshot tarball `karpathyWiki-cd3cf08` (working tree cd3cf08, sem `.git`/`.venv`) |
| SHA256 tarball | `11160e77ad7c88885635ef2beeac1d8046b95c103952dbe1a90aba1bbb852377` |
| Path | `/opt/karpathyWiki` via `KARPATHYWIKI_SRC=/opt/karpathyWiki` |
| Pacote | `gaabwiki` real (`/opt/karpathyWiki/gaabwiki/cli.py`) |
| Modo retrieval | **BM25 degradado** — Ollama indisponível; `gaabwiki index --rebuild` falha; usado `index-evolveloop-bm25-degraded.py` (ADR-0005) |
| Ingestão | 848 ficheiros → `EvolveLoop/wiki/autogen-*.md`; BM25 **9019** linhas (merge com Lance legado 837) |

## Comandos / exit codes

| Comando | Exit |
|---------|-----:|
| `bootstrap-karpathywiki-official-bench.sh` (KARPATHYWIKI_SRC + tarball sha) | **0** |
| `V22_WIKI_ENGINE=official ground_b1_harness.py --tasks H07-H18` | **0** |
| `V22_WIKI_ENGINE=official test-official-wiki-stale.sh` (pytest degraded BM25) | **0** |
| `orchestrator` vitest (271) | **0** |
| `pytest` fixture vault | **0** |
| `validate-v22-artifacts.sh` | **0** |

## Correção única (harness, sem alterar tarefas)

- **Problema:** envelope real usa `source` string em `selected` e listas `bm25`/`hybrid`; proveniência via `source_paths` no markdown auto-ingerido.
- **Fix:** `ground_b1_harness.py` 1.3.0 — `_repo_paths_from_hit` + `_iter_search_hits` (union até 24 hits) + `--top-k 12`.

## Tabela H07–H18 — OFFICIAL_WIKI_GROUND

Fonte: `raw/battery-held-out-real-engine/held-out-summary.json` (harness 1.3.0).

| Task | B0 rec | paths | tokens | ms | B1 rec | paths | tokens | ms |
|------|--------|------:|-------:|---:|--------|------:|-------:|---:|
| H07 | 0.0 | 45 | 14011 | 32 | 0.0 | 10 | 16208 | 2790 |
| H08 | 1.0 | 16 | 13125 | 17 | 0.0 | 10 | 16208 | 2790 |
| H09 | 1.0 | 45 | 14038 | 22 | 0.0 | 10 | 16208 | 2790 |
| H10 | 1.0 | 25 | 21842 | 18 | 0.0 | 10 | 16208 | 2790 |
| H11 | 0.0 | 45 | 10725 | 36 | 0.0 | 10 | 16208 | 2790 |
| H12 | 1.0 | 9 | 6468 | 24 | 0.0 | 10 | 16208 | 2790 |
| H13 | 1.0 | 37 | 35603 | 27 | 0.0 | 10 | 16208 | 2790 |
| H14 | 1.0 | 12 | 8169 | 17 | 0.0 | 10 | 16208 | 2790 |
| H15 | 0.0 | 45 | 10725 | 27 | 0.0 | 10 | 16208 | 2790 |
| H16 | 1.0 | 15 | 7150 | 18 | 0.0 | 10 | 16208 | 2790 |
| H17 | 1.0 | 45 | 27626 | 22 | **1.0** | 10 | 16208 | 2790 |
| H18 | 0.0 | 45 | 14085 | 20 | **1.0** | 10 | 16208 | 2790 |

**Recall ≥1:** B0 **8/12**, B1 **2/12**. Mediana paths: B0 **41**, B1 **10**. Mediana tokens: B0 **~13568**, B1 **~16208**. Latência B1 ~**2.8s**/tarefa (subprocess `gaabwiki search`).

## Rótulo

**`OFFICIAL_WIKI_GROUND`** — motor real + ingest automática + held-out independente; medição honesta com BM25 degradado (sem Ollama).

Gate numérico D2: **B1 não supera B0 em recall** neste ambiente; não promover a alvo de produto sem Ollama/híbrido ou melhor ranking.

## Stale

Motor real: `tests/test_integration.py::test_degraded_hybrid_search_bm25_only` — **PASS** (classificação degradada ADR-0005, não hash stale do fixture).

## Riscos

1. BM25-only sem re-index Lance para novos docs — merge manual no script degradado.
2. Perguntas NL em português vs corpus misto EN/PT — ranking fraco (H08–H16).
3. Latência ~3s/query — aceitável para bench, não para gate de performance ainda.
