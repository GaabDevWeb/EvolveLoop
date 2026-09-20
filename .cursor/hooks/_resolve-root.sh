#!/usr/bin/env bash
# Resolve project root (contains orchestrator/) — funciona global ou local.
resolve_project_root() {
  # 1. Env explícito (~/.cursor/agents.env)
  if [[ -n "${ORCHESTRATOR_ROOT:-}" && -f "${ORCHESTRATOR_ROOT}/dist/cli/run-jobs.js" ]]; then
    dirname "$ORCHESTRATOR_ROOT"
    return 0
  fi
  # Layout CursorSKILLS (orchestrator na raiz do clone)
  if [[ -n "${AGENTS_ROOT:-}" && -f "${AGENTS_ROOT}/orchestrator/dist/cli/run-jobs.js" ]]; then
    echo "$AGENTS_ROOT"
    return 0
  fi
  # Layout legado AGENTS/Cursor/
  if [[ -n "${AGENTS_ROOT:-}" && -f "${AGENTS_ROOT}/Cursor/orchestrator/dist/cli/run-jobs.js" ]]; then
    echo "$AGENTS_ROOT/Cursor"
    return 0
  fi

  # 2. Walk up from hook script
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  for _ in 1 2 3 4 5 6 7 8; do
    if [[ -f "$dir/orchestrator/dist/cli/run-jobs.js" ]]; then
      echo "$dir"
      return 0
    fi
    if [[ -f "$dir/Cursor/orchestrator/dist/cli/run-jobs.js" ]]; then
      echo "$(cd "$dir/Cursor" && pwd)"
      return 0
    fi
    dir="$(cd "$dir/.." && pwd)"
  done

  # 3. Default conhecido
  local default="$HOME/Documentos/gitHub/AGENTS/Cursor"
  if [[ -f "$default/orchestrator/dist/cli/run-jobs.js" ]]; then
    echo "$default"
    return 0
  fi
  return 1
}
