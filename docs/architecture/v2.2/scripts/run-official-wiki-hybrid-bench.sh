#!/usr/bin/env bash
# V22-GOAL-003-005-official — reproducible OFFICIAL_WIKI_GROUND hybrid benchmark (2 runs).
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
EXP="$REPO/docs/internal/historical/evals/docs-evals/experiments/V22-BENCH"
OUT="$EXP/raw/battery-held-out-official-hybrid"
HARNESS="$EXP/harness/ground_b1_harness.py"
BOOT="$REPO/docs/architecture/v2.2/scripts/bootstrap-karpathywiki-official-bench.sh"
MANIFEST_PY="$EXP/harness/official_manifest.py"
RUNS="${OFFICIAL_BENCH_RUNS:-2}"
KARPATHY_WIKI_DIR="${KARPATHY_WIKI_DIR:-/opt/karpathyWiki}"
KARPATHYWIKI_SRC="${KARPATHYWIKI_SRC:-$KARPATHY_WIKI_DIR}"
KARPATHYWIKI_TARBALL_SHA256="${KARPATHYWIKI_TARBALL_SHA256:-11160e77ad7c88885635ef2beeac1d8046b95c103952dbe1a90aba1bbb852377}"
OLLAMA_MODEL="${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}"

export V22_WIKI_ENGINE=official
export V22_B1_RETRIEVAL=hybrid
export V22_BENCH_MAX_PATHS="${V22_BENCH_MAX_PATHS:-45}"
export V22_BENCH_MAX_INPUT_TOKENS="${V22_BENCH_MAX_INPUT_TOKENS:-22000}"
export V22_ANCHOR_RECALL="${V22_ANCHOR_RECALL:-file}"

mkdir -p "$OUT"
LOG="$OUT/pipeline.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== run-official-wiki-hybrid-bench ==="
echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "repo=$REPO"
echo "tree_sha=$(git -C "$REPO" rev-parse HEAD)"
echo "runs=$RUNS"

ollama_ok=0
if curl -sf "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
  if ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
    ollama_ok=1
  fi
fi
echo "ollama_ready=$ollama_ok model=$OLLAMA_MODEL"
if [[ "$ollama_ok" != "1" ]]; then
  echo "FAIL: Ollama unavailable or embedding model missing (exit 10)"
  python3 "$MANIFEST_PY" write-failure \
    --out "$OUT/OFFICIAL-MANIFEST.json" \
    --reason "ollama_unavailable" \
    --log "$LOG"
  exit 10
fi

for run in $(seq 1 "$RUNS"); do
  run_dir="$OUT/run-$(printf '%02d' "$run")"
  mkdir -p "$run_dir"
  echo "--- run $run ---"
  export KARPATHYWIKI_SRC KARPATHYWIKI_TARBALL_SHA256 KARPATHY_WIKI_DIR
  export EVIDENCE_LOG="$run_dir/bootstrap.log"
  if ! bash "$BOOT"; then
    echo "FAIL: bootstrap exit non-zero (exit 11)"
    python3 "$MANIFEST_PY" write-failure --out "$OUT/OFFICIAL-MANIFEST.json" --reason "bootstrap_failed" --log "$LOG"
    exit 11
  fi
  python3 "$HARNESS" "$run_dir/dev" --tasks H07-H18
  python3 "$HARNESS" "$run_dir/test" --tasks H19-H24
done

python3 "$MANIFEST_PY" write-success \
  --out "$OUT/OFFICIAL-MANIFEST.json" \
  --bench-root "$OUT" \
  --runs "$RUNS" \
  --tarball-sha256 "$KARPATHYWIKI_TARBALL_SHA256" \
  --ollama-model "$OLLAMA_MODEL"

python3 "$EXP/harness/integrity_test.py" --official "$OUT/OFFICIAL-MANIFEST.json"
echo "OK official hybrid bench complete"
