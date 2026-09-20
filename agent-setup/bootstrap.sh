#!/usr/bin/env bash
# Agent Setup bootstrap — first run on a new machine
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export AGENT_SETUP_ROOT="$ROOT"

echo "Agent Setup bootstrap"
echo "  root: $ROOT"

# Wiki vault — prefer WIKI_ROOT / RAG_REPO_ROOT (no hardcoded username path)
export VAULT_ROOT="${WIKI_ROOT:-${VAULT_ROOT:-${RAG_REPO_ROOT:-}}}"
# AGENTS_ROOT: DEFERRED personal default removed — set explicitly or via ~/.cursor/agents.env
export AGENTS_ROOT="${AGENTS_ROOT:-}"
if [[ -z "${AGENTS_ROOT}" && -f "$HOME/.cursor/agents.env" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.cursor/agents.env" || true
fi
if [[ -z "${AGENTS_ROOT}" ]]; then
  echo "WARN: AGENTS_ROOT unset — export AGENTS_ROOT=/path/to/CursorSKILLS" >&2
fi
if [[ -z "${VAULT_ROOT}" ]]; then
  echo "WARN: VAULT_ROOT/WIKI_ROOT unset — export WIKI_ROOT=/path/to/wiki-vault" >&2
fi

if ! command -v python3 >/dev/null; then
  echo "ERROR: python3 required" >&2
  exit 1
fi

python3 -m venv "$ROOT/.venv"
"$ROOT/.venv/bin/pip" install -e "$ROOT[dev]" -q

mkdir -p "$HOME/.local/bin"
ln -sf "$ROOT/.venv/bin/agent" "$HOME/.local/bin/agent"

echo ""
echo "Installed: agent -> $HOME/.local/bin/agent"
echo ""
echo "Next:"
echo "  agent detect"
echo "  agent install --profile standard"
echo "  agent doctor"
echo ""
echo "Override paths:"
echo "  VAULT_ROOT=... AGENTS_ROOT=... ./bootstrap.sh"
