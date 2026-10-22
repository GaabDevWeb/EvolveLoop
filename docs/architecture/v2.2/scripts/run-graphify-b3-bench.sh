#!/usr/bin/env bash
# Run V22-BENCH B3 (Graphify) and write raw under experiments/V22-BENCH/raw/battery-b3-graphify/
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && git rev-parse --show-toplevel)"
export PATH="${HOME}/.local/bin:${PATH}"
HARNESS="$REPO/docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness"
cd "$HARNESS"
export V22_ANCHOR_RECALL=file
export V22_BENCH_MAX_PATHS=45
export V22_BENCH_MAX_INPUT_TOKENS=22000
python3 graphify_b3_harness.py "$REPO/docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery-b3-graphify"
