# V22-GOAL-005 — Wiki operacional (runbook)

## Ambiente de referência

| Variável | Valor fixture |
|----------|----------------|
| `WIKI_ROOT` | `$AGENTS_ROOT/fixtures/evolveloop-wiki-vault` |
| `AGENTS_ROOT` | Raiz do monorepo EvolveLoop |
| `WIKI_CLI_MODULE` | `gaabwiki` (default, ADR-0004) |

```bash
export AGENTS_ROOT=/path/to/EvolveLoop
export WIKI_ROOT="$AGENTS_ROOT/fixtures/evolveloop-wiki-vault"
cd "$WIKI_ROOT" && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
```

## Workflows Carpaccio (init → query → update → lint)

```bash
bash "$AGENTS_ROOT/docs/architecture/v2.2/scripts/generate-evolveloop-wiki-knowledge.sh"
bash "$AGENTS_ROOT/docs/architecture/v2.2/scripts/sync-carpaccio-to-vault.sh"
bash "$AGENTS_ROOT/.cursor/skills/wiki/scripts/ground.sh" list-packs
bash "$AGENTS_ROOT/.cursor/skills/wiki/scripts/ground.sh" search "KNOWLEDGE_BACKEND env"
```

Geração de conhecimento: script com **allowlist**; não lê `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/`. Log: `memory/V22-GOAL-005-wiki/evidence/knowledge-generate.log`.

## B1 motor real (karpathyWiki) — `OFFICIAL_WIKI_GROUND`

Pré-requisito: clone `GaabDevWeb/karpathyWiki` @ `cd3cf08` em `KARPATHY_WIKI_DIR` (default `/opt/karpathyWiki`).

```bash
bash docs/architecture/v2.2/scripts/bootstrap-karpathywiki-official-bench.sh
V22_WIKI_ENGINE=official V22_HELD_OUT_TASKS=H07-H18 \
  python3 docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness/ground_b1_harness.py \
  docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery-held-out-real-engine
```

Ingestão: `ingest-evolveloop-corpus-automatic.py` (sem V22-BENCH). Stale: `test-official-wiki-stale.sh`.

## B1 held-out (`FIXTURE_WIKI_GROUND`)

1. Congelar `tasks-held-out-frozen.json` (commit separado antes do harness).
2. Gerar `.ai/` + sync vault (`fixtures/evolveloop-wiki-vault` — CLI mínimo no repo).
3. `python3 docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness/ground_b1_harness.py` (B1: **só** `task.query`).
4. Raw: `V22-BENCH/raw/battery-held-out/` — classe `FIXTURE_WIKI_GROUND` até wiki externo + held-out independente completo (`BENCHMARK-PLAN.md`).

## Obsolescência

Após alterar um `source_paths` no repo:

```bash
python3 -m gaabwiki search "query" --json   # hits com source.stale=true
python3 .cursor/skills/wiki-carpaccio/scripts/carpaccio.py lint
```

Reindex: `python -m gaabwiki rebuild --incremental` após `carpaccio update`.
