# EvolveLoop reference wiki vault (fixture)

Portable `WIKI_ROOT` for CI and V22-GOAL-005. Python package name remains `gaabwiki` (ADR-0004).

```bash
cd fixtures/evolveloop-wiki-vault
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
export WIKI_ROOT="$(pwd)"
python -m gaabwiki rebuild
python -m gaabwiki search "checkpoint HMAC" --json
```

Project pages are synced from the monorepo `.ai/` via `docs/architecture/v2.2/scripts/sync-carpaccio-to-vault.sh`.
