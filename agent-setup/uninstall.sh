#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export AGENT_SETUP_ROOT="$ROOT"
AGENT="${ROOT}/.venv/bin/agent"
if [[ ! -x "$AGENT" ]]; then
  echo "Run ./bootstrap.sh first" >&2
  exit 1
fi
exec "$AGENT" uninstall
