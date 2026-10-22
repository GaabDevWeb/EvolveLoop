#!/usr/bin/env bash
# Stale provenance test — real karpathyWiki when available, else fixture vault.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ENGINE="${V22_WIKI_ENGINE:-fixture}"

if [[ "$ENGINE" == "official" ]]; then
  KARPATHY_WIKI_DIR="${KARPATHY_WIKI_DIR:-/opt/karpathyWiki}"
  if [[ ! -f "$KARPATHY_WIKI_DIR/gaabwiki/cli.py" ]]; then
    echo "SKIP: official motor missing at $KARPATHY_WIKI_DIR" >&2
    exit 0
  fi
  WIKI_ROOT="$KARPATHY_WIKI_DIR"
  PYTHON="${WIKI_PYTHON:-$KARPATHY_WIKI_DIR/.venv/bin/python}"
else
  WIKI_ROOT="${WIKI_ROOT:-$REPO/fixtures/evolveloop-wiki-vault}"
  PYTHON="${WIKI_PYTHON:-$WIKI_ROOT/.venv/bin/python}"
fi

export WIKI_ROOT EVOLVELOOP_MONOREPO_ROOT="$REPO" AGENTS_ROOT="$REPO"

if [[ "$ENGINE" == "official" ]]; then
  cd "$KARPATHY_WIKI_DIR"
  # Real motor: prova modo degradado BM25 (Ollama off) — ADR-0005 classificação de status.
  exec "$PYTHON" -m pytest tests/test_integration.py::test_degraded_hybrid_search_bm25_only -q
fi

cd "$REPO/fixtures/evolveloop-wiki-vault"
exec "$PYTHON" -m pytest tests/test_index.py::test_stale_after_source_change -q
