#!/usr/bin/env bash
# Install real karpathyWiki (gaabwiki) and build EvolveLoop corpus for OFFICIAL B1.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
KARPATHY_WIKI_REPO="${KARPATHY_WIKI_REPO:-https://github.com/GaabDevWeb/karpathyWiki.git}"
KARPATHY_WIKI_SHA="${KARPATHY_WIKI_SHA:-cd3cf08}"
KARPATHY_WIKI_DIR="${KARPATHY_WIKI_DIR:-/opt/karpathyWiki}"
KARPATHYWIKI_SRC="${KARPATHYWIKI_SRC:-}"
KARPATHYWIKI_TARBALL_SHA256="${KARPATHYWIKI_TARBALL_SHA256:-}"
EVIDENCE_DIR="$REPO/docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery-held-out-real-engine"
LOG="${EVIDENCE_LOG:-$EVIDENCE_DIR/bootstrap.log}"
STATUS_JSON="$EVIDENCE_DIR/OFFICIAL-STATUS.json"
CORPUS_YAML="$REPO/docs/architecture/v2.2/scripts/corpus-evolveloop-official.yaml"

mkdir -p "$EVIDENCE_DIR"
MOTOR_ORIGIN="unknown"

{
  echo "=== bootstrap-karpathywiki-official-bench ==="
  echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "repo=$REPO"
  echo "karpathy_wiki_dir=$KARPATHY_WIKI_DIR"
  echo "karpathy_wiki_sha_label=$KARPATHY_WIKI_SHA"
  echo "karpathywiki_src=${KARPATHYWIKI_SRC:-}"
  echo "tarball_sha256=${KARPATHYWIKI_TARBALL_SHA256:-}"
} | tee "$LOG"

if [[ -n "$KARPATHYWIKI_SRC" ]]; then
  SRC="$(cd "$KARPATHYWIKI_SRC" && pwd)"
  if [[ ! -d "$SRC/gaabwiki" ]]; then
    echo "FAIL: KARPATHYWIKI_SRC missing gaabwiki/: $SRC" | tee -a "$LOG"
    exit 3
  fi
  DEST="$(readlink -f "$KARPATHY_WIKI_DIR" 2>/dev/null || true)"
  if [[ -z "$DEST" ]]; then
    DEST="$(readlink -f "$SRC")"
    KARPATHY_WIKI_DIR="$DEST"
  fi
  if [[ "$SRC" != "$DEST" ]]; then
    rm -rf "$DEST"
    mkdir -p "$(dirname "$DEST")"
    cp -a "$SRC" "$DEST"
    KARPATHY_WIKI_DIR="$DEST"
    echo "copied_snapshot=true from=$SRC to=$DEST" | tee -a "$LOG"
  else
    echo "copied_snapshot=false inplace=$SRC" | tee -a "$LOG"
  fi
  MOTOR_ORIGIN="snapshot_cd3cf08_local"
  echo "motor_origin=$MOTOR_ORIGIN" | tee -a "$LOG"
elif [[ -d "$KARPATHY_WIKI_DIR/.git" ]]; then
  MOTOR_ORIGIN="git_clone"
  cd "$KARPATHY_WIKI_DIR"
  git fetch --depth 1 origin "$KARPATHY_WIKI_SHA" 2>>"$LOG" || true
  git checkout "$KARPATHY_WIKI_SHA" >>"$LOG" 2>&1
  echo "checked_out=$(git rev-parse HEAD)" | tee -a "$LOG"
else
  if git clone "$KARPATHY_WIKI_REPO" "$KARPATHY_WIKI_DIR" >>"$LOG" 2>&1; then
    MOTOR_ORIGIN="git_clone"
    cd "$KARPATHY_WIKI_DIR"
    git checkout "$KARPATHY_WIKI_SHA" >>"$LOG" 2>&1 || true
  else
    echo "clone_exit=$?" | tee -a "$LOG"
    echo "BLOCKED: no KARPATHYWIKI_SRC and clone failed" | tee -a "$LOG"
    exit 2
  fi
fi

if [[ ! -f "$KARPATHY_WIKI_DIR/pyproject.toml" ]]; then
  echo "FAIL: no pyproject.toml in $KARPATHY_WIKI_DIR" | tee -a "$LOG"
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
export KNOWLEDGE_PATH="$KARPATHY_WIKI_DIR"
export EVOLVELOOP_MONOREPO_ROOT="$REPO"
export AGENTS_ROOT="$REPO"
export WIKI_PYTHON="$PYTHON"

"$PYTHON" -m gaabwiki --help >>"$LOG" 2>&1 || {
  echo "FAIL: python -m gaabwiki not importable" | tee -a "$LOG"
  exit 4
}

python3 "$REPO/docs/architecture/v2.2/scripts/ingest-evolveloop-corpus-automatic.py" \
  --repo "$REPO" \
  --wiki-root "$WIKI_ROOT" \
  --layout karpathy | tee -a "$LOG"

INDEX_MODE="bm25_degraded"
HEALTH_JSON="$("$PYTHON" -m gaabwiki health 2>>"$LOG" || true)"
echo "health=$HEALTH_JSON" >>"$LOG"

if "$PYTHON" -m gaabwiki index --help >/dev/null 2>&1; then
  if "$PYTHON" -m gaabwiki index --rebuild >>"$LOG" 2>&1; then
    INDEX_MODE="full_index_ollama"
  else
    echo "WARN: gaabwiki index failed — falling back to BM25 degraded merge" | tee -a "$LOG"
    PYTHONPATH="" "$PYTHON" "$REPO/docs/architecture/v2.2/scripts/index-evolveloop-bm25-degraded.py" \
      --wiki-root "$WIKI_ROOT" \
      --corpus-yaml "$CORPUS_YAML" | tee -a "$LOG"
  fi
else
  PYTHONPATH="" "$PYTHON" "$REPO/docs/architecture/v2.2/scripts/index-evolveloop-bm25-degraded.py" \
    --wiki-root "$WIKI_ROOT" \
    --corpus-yaml "$CORPUS_YAML" | tee -a "$LOG"
fi

cat >"$STATUS_JSON" <<EOF
{
  "gate": "OFFICIAL_WIKI_GROUND",
  "status": "READY",
  "motor_origin": "$MOTOR_ORIGIN",
  "karpathy_wiki_sha_label": "$KARPATHY_WIKI_SHA",
  "karpathywiki_tarball_sha256": "${KARPATHYWIKI_TARBALL_SHA256:-null}",
  "karpathy_wiki_dir": "$KARPATHY_WIKI_DIR",
  "retrieval_mode_declared": "bm25_degraded (Ollama unavailable — ADR-0005)",
  "index_mode": "$INDEX_MODE",
  "corpus_yaml": "$CORPUS_YAML",
  "ingest_layout": "EvolveLoop/wiki/autogen-*.md"
}
EOF

echo "OK wiki_root=$WIKI_ROOT python=$PYTHON index_mode=$INDEX_MODE" | tee -a "$LOG"
exit 0
