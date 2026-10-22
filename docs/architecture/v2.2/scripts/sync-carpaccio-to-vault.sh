#!/usr/bin/env bash
# Sync monorepo .ai/pages → fixture vault projects/evolveloop/pages and rebuild index.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
VAULT="${WIKI_ROOT:-$REPO/fixtures/evolveloop-wiki-vault}"
SRC="$REPO/.ai/pages"
DEST="$VAULT/projects/evolveloop/pages"
mkdir -p "$DEST"
if [[ ! -d "$SRC" ]]; then
  echo "ERROR: missing $SRC — run generate-evolveloop-wiki-knowledge.sh first" >&2
  exit 1
fi
rm -rf "$DEST"
mkdir -p "$DEST"
cp -a "$SRC/." "$DEST/"
export WIKI_ROOT="$VAULT"
export EVOLVELOOP_MONOREPO_ROOT="$REPO"
export AGENTS_ROOT="$REPO"
PYTHON="${WIKI_PYTHON:-$VAULT/.venv/bin/python}"
if [[ ! -x "$PYTHON" ]]; then
  python3 -m venv "$VAULT/.venv"
  "$VAULT/.venv/bin/pip" install -q -e "$VAULT[dev]"
  PYTHON="$VAULT/.venv/bin/python"
fi
"$PYTHON" -m gaabwiki rebuild --incremental
echo "OK sync vault=$VAULT corpus=$(jq -r .corpus_size "$VAULT/.data/manifest.json" 2>/dev/null || echo '?')"
