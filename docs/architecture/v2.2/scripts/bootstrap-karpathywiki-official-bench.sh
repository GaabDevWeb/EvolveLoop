#!/usr/bin/env bash
# Clone/install real karpathyWiki (gaabwiki) and build EvolveLoop corpus vault for OFFICIAL B1.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
KARPATHY_WIKI_REPO="${KARPATHY_WIKI_REPO:-https://github.com/GaabDevWeb/karpathyWiki.git}"
KARPATHY_WIKI_SHA="${KARPATHY_WIKI_SHA:-cd3cf08}"
KARPATHY_WIKI_DIR="${KARPATHY_WIKI_DIR:-/opt/karpathyWiki}"
LOG="${EVIDENCE_LOG:-$REPO/docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery-held-out-real-engine/bootstrap.log}"

mkdir -p "$(dirname "$LOG")"
{
  echo "=== bootstrap-karpathywiki-official-bench ==="
  echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "repo=$REPO"
  echo "karpathy_wiki_repo=$KARPATHY_WIKI_REPO"
  echo "karpathy_wiki_sha=$KARPATHY_WIKI_SHA"
  echo "karpathy_wiki_dir=$KARPATHY_WIKI_DIR"
} | tee "$LOG"

clone_ok=false
if [[ -d "$KARPATHY_WIKI_DIR/.git" ]]; then
  clone_ok=true
  echo "reuse_existing_clone=true" | tee -a "$LOG"
else
  if git clone "$KARPATHY_WIKI_REPO" "$KARPATHY_WIKI_DIR" >>"$LOG" 2>&1; then
    clone_ok=true
    echo "clone_exit=0" | tee -a "$LOG"
  else
    echo "clone_exit=$?" | tee -a "$LOG"
    echo "BLOCKED: cannot clone $KARPATHY_WIKI_REPO (see log tail)" | tee -a "$LOG"
    tail -5 "$LOG" | tee -a "$LOG"
    exit 2
  fi
fi

cd "$KARPATHY_WIKI_DIR"
git fetch --depth 1 origin "$KARPATHY_WIKI_SHA" 2>>"$LOG" || true
git checkout "$KARPATHY_WIKI_SHA" >>"$LOG" 2>&1
echo "checked_out=$(git rev-parse HEAD)" | tee -a "$LOG"

if [[ ! -f "$KARPATHY_WIKI_DIR/pyproject.toml" && ! -f "$KARPATHY_WIKI_DIR/setup.py" ]]; then
  echo "FAIL: no Python package metadata in karpathyWiki root" | tee -a "$LOG"
  exit 3
fi

PYTHON="${KARPATHY_WIKI_DIR}/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  python3 -m venv "$KARPATHY_WIKI_DIR/.venv"
  PYTHON="$KARPATHY_WIKI_DIR/.venv/bin/python"
fi
"$PYTHON" -m pip install -q -U pip
"$PYTHON" -m pip install -q -e "$KARPATHY_WIKI_DIR"[dev] 2>>"$LOG" || "$PYTHON" -m pip install -q -e "$KARPATHY_WIKI_DIR" 2>>"$LOG"

export WIKI_ROOT="$KARPATHY_WIKI_DIR"
export EVOLVELOOP_MONOREPO_ROOT="$REPO"
export AGENTS_ROOT="$REPO"
export WIKI_PYTHON="$PYTHON"

"$PYTHON" -m gaabwiki --help >>"$LOG" 2>&1 || {
  echo "FAIL: python -m gaabwiki not importable" | tee -a "$LOG"
  exit 4
}

python3 "$REPO/docs/architecture/v2.2/scripts/ingest-evolveloop-corpus-automatic.py" \
  --repo "$REPO" \
  --wiki-root "$WIKI_ROOT" | tee -a "$LOG"

# Prefer rebuild (fixture-compatible); real engine may expose rebuild or index
export WIKI_ROOT="$KARPATHY_WIKI_DIR"
if "$PYTHON" -m gaabwiki rebuild --help >/dev/null 2>&1; then
  "$PYTHON" -m gaabwiki rebuild >>"$LOG" 2>&1
elif "$PYTHON" -m gaabwiki index --help >/dev/null 2>&1; then
  "$PYTHON" -m gaabwiki index >>"$LOG" 2>&1 || echo "WARN: index failed (Ollama?)" | tee -a "$LOG"
else
  echo "WARN: no rebuild/index subcommand detected" | tee -a "$LOG"
fi

echo "OK wiki_root=$WIKI_ROOT python=$PYTHON" | tee -a "$LOG"
exit 0
