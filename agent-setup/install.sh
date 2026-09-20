#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export AGENT_SETUP_ROOT="$ROOT"
export VAULT_ROOT="${WIKI_ROOT:-${VAULT_ROOT:-${RAG_REPO_ROOT:-}}}"
export AGENTS_ROOT="${AGENTS_ROOT:-}"
if [[ -z "${AGENTS_ROOT}" && -f "$HOME/.cursor/agents.env" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.cursor/agents.env" || true
fi
if [[ -z "${AGENTS_ROOT}" ]]; then
  echo "ERROR: AGENTS_ROOT unset — export AGENTS_ROOT=/path/to/CursorSKILLS" >&2
  exit 1
fi
if [[ -z "${VAULT_ROOT}" ]]; then
  echo "WARN: WIKI_ROOT/VAULT_ROOT unset — Wiki grounding will fail until set" >&2
fi

PROFILE="${1:-standard}"
AGENT="${ROOT}/.venv/bin/agent"
if [[ ! -x "$AGENT" ]]; then
  echo "Run ./bootstrap.sh first" >&2
  exit 1
fi
exec "$AGENT" install --profile "$PROFILE"
