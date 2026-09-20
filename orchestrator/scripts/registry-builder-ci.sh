#!/usr/bin/env bash
# CI — regenera capability-registry.yaml a partir de manifests + telemetria.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MANIFESTS="${MANIFESTS_DIR:-providers}"
TELEMETRY="${TELEMETRY_DIR:-./data/telemetry/events}"
OUTPUT="${OUTPUT:-registry/capability-registry.yaml}"

npm run build --silent
npm run registry-builder -- build \
  --manifests "$MANIFESTS" \
  --telemetry "$TELEMETRY" \
  --output "$OUTPUT"

echo "Registry written: $OUTPUT"
