# V22-GOAL-005b — motor real karpathyWiki

## Clone ok?

**Não.** Erros exatos:

| Comando | Exit | Saída |
|---------|-----:|-------|
| `git clone https://github.com/GaabDevWeb/karpathyWiki.git /opt/karpathyWiki` | **128** | `remote: Repository not found.` / `fatal: repository 'https://github.com/GaabDevWeb/karpathyWiki.git/' not found` |
| `gh repo clone GaabDevWeb/karpathyWiki` | **1** | `GraphQL: Could not resolve to a Repository with the name 'GaabDevWeb/karpathyWiki'.` |
| `gh api repos/GaabDevWeb/karpathyWiki` | **1** | `HTTP 404 Not Found` |

O token `gh` desta VM só lista repositórios públicos da org (EvolveLoop, KernelBot, …); **karpathyWiki não aparece**.

## Pipeline preparado (pós-desbloqueio)

1. `docs/architecture/v2.2/scripts/bootstrap-karpathywiki-official-bench.sh` — clone `cd3cf08`, venv, `pip install -e`, ingest automático, `gaabwiki rebuild|index`.
2. `ingest-evolveloop-corpus-automatic.py` — `docs/`, `orchestrator/src`, `profiles`, `.cursor/skills` (exclui `V22-BENCH` e evals históricos).
3. `ground_b1_harness.py` **1.2.0** — `V22_WIKI_ENGINE=official` → `OFFICIAL_WIKI_GROUND` se clone+SHA ok; B1 só `task.query`.
4. `test-official-wiki-stale.sh` — stale no fixture; no motor real usa `pytest -k stale` se existir.

## Tabela B0/B1 — H07–H18 (fixture + autogen 800 ficheiros, **não** motor real)

Medição: `raw/battery-held-out-real-engine/held-out-summary.json` após `gaabwiki rebuild` (corpus_size **806**).

| Task | B0 recall | B0 paths | B0 tok | B0 ms | B1 recall | B1 paths | B1 tok | B1 ms |
|------|-----------|---------|--------|-------|-----------|---------|--------|-------|
| H07 | 0.0 | 45 | 14011 | 35 | 0.0 | 4 | 6671 | ~100 |
| H08 | 1.0 | 28 | 23502 | 23 | 0.0 | 4 | 6758 | ~100 |
| H09 | 1.0 | 45 | 14038 | 24 | 0.0 | 4 | 8692 | ~100 |
| H10 | 1.0 | 45 | 39731 | 18 | **1.0** | 4 | 4280 | ~100 |
| H11 | 0.0 | 45 | 10725 | 32 | 0.0 | 4 | 4860 | ~100 |
| H12 | 1.0 | 17 | 12556 | 22 | 0.0 | 4 | 4428 | ~100 |
| H13 | 1.0 | 45 | 37893 | 27 | **1.0** | 4 | 4396 | ~100 |
| H14 | 1.0 | 22 | 14523 | 15 | 0.0 | 4 | 2114 | ~100 |
| H15 | 0.0 | 45 | 10725 | 30 | 0.0 | 4 | 7415 | ~100 |
| H16 | 1.0 | 26 | 12559 | 17 | 0.0 | 4 | 12674 | ~100 |
| H17 | 1.0 | 45 | 27626 | 26 | **1.0** | 4 | 2357 | ~100 |
| H18 | 0.0 | 45 | 14085 | 25 | 0.0 | 4 | 8816 | ~100 |

Mediana rollup B0: paths **45**, tokens **~14062**, latency **~26 ms**.  
Mediana rollup B1 (fixture): paths **4**, tokens **~5766**, latency **~103 ms**.

## Rótulo

- **Gate OFFICIAL_WIKI_GROUND:** `BLOCKED` (clone).
- **Evidência publicada:** `FIXTURE_WIKI_GROUND` + ingest automático (sanity de pipeline).

## Stale

| Comando | Exit |
|---------|-----:|
| `test-official-wiki-stale.sh` (fixture) | **0** |
| Motor real | **SKIP** (sem clone) |

## Testes

| Suite | Exit |
|-------|-----:|
| `orchestrator` vitest (full) | **0** (271 tests) |
| `validate-v22-artifacts.sh` | **0** |
| `pytest fixtures/evolveloop-wiki-vault/tests` | **0** |
| `validate-v22-artifacts.sh` | ver commit |

## Riscos

1. Repositório **karpathyWiki** privado/ausente para o principal do cloud agent — gate oficial não fechável até ACL.
2. Ingest automático limitada a **800** ficheiros — corpus truncado; BM25 fixture ≠ híbrido real (ADR-0005).
3. `sync-carpaccio-to-vault.sh` sobrescreve páginas manuais `.ai/`; pipeline oficial deve usar só ingest + `rebuild` no clone karpathyWiki.
