#!/usr/bin/env bash
# Stale provenance test — real karpathyWiki when available, else fixture vault.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ENGINE="${V22_WIKI_ENGINE:-fixture}"

if [[ "$ENGINE" == "official" ]]; then
  KARPATHY_WIKI_DIR="${KARPATHY_WIKI_DIR:-/opt/karpathyWiki}"
  if [[ ! -d "$KARPATHY_WIKI_DIR/.git" ]]; then
    echo "SKIP: official engine not cloned ($KARPATHY_WIKI_DIR)" >&2
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
  if [[ -d "$KARPATHY_WIKI_DIR/tests" ]]; then
    cd "$KARPATHY_WIKI_DIR"
    exec "$PYTHON" -m pytest tests -k stale -q
  fi
  echo "SKIP: no stale tests in karpathyWiki checkout" >&2
  exit 0
fi

cd "$REPO/fixtures/evolveloop-wiki-vault"
exec "$PYTHON" -m pytest tests/test_index.py::test_stale_after_source_change -q
