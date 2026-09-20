#!/usr/bin/env bash
# Grounding Wiki — scout/search/pack para injectar no Cursor Agent
# CLI actual: python -m gaabwiki (pacote em $RAG_REPO_ROOT/gaabwiki/)
set -euo pipefail

MODE="${1:-scout}"
QUERY="${2:-}"
PROJETO="${3:-}"

# Portable vault root: WIKI_ROOT (preferred) or RAG_REPO_ROOT alias — no username default
ROOT="${WIKI_ROOT:-${RAG_REPO_ROOT:-}}"
if [[ -z "$ROOT" ]]; then
  echo "WIKI_ROOT (or RAG_REPO_ROOT) is required. Example: export WIKI_ROOT=/path/to/wiki-vault" >&2
  exit 1
fi
# External vault Python package remains `gaabwiki` (EXTERNAL); override with WIKI_CLI_MODULE
WIKI_CLI_MODULE="${WIKI_CLI_MODULE:-gaabwiki}"
PYTHON="${WIKI_PYTHON:-$ROOT/.venv/bin/python}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Resolve interpreter: venv do vault → WIKI_BIN dir → python3
if [[ ! -x "$PYTHON" ]]; then
  if [[ -n "${WIKI_BIN:-}" && -x "${WIKI_BIN}" ]]; then
    # WIKI_BIN pode ser o wrapper `wiki` — usar o mesmo env
    PYTHON="$(dirname "$WIKI_BIN")/python"
  fi
fi
if [[ ! -x "$PYTHON" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON="$(command -v python3)"
  else
    echo "Python não encontrado. Defina RAG_REPO_ROOT ou WIKI_PYTHON. ROOT=$ROOT" >&2
    exit 1
  fi
fi

_resolve_pack() {
  local name="$1"
  local candidates=(
    "$ROOT/packs/${name}.md"
    "$ROOT/.ai/packs/${name}.md"
    "$ROOT/KernelBot/wiki/${name}.md"
    "$ROOT/OrbitBot/wiki/${name}.md"
    "$ROOT/.ai/wiki/${name}.md"
  )
  # Aliases comuns skill → notas wiki
  case "$name" in
    kernelbot-rag) candidates+=("$ROOT/KernelBot/wiki/kernelbot-rag.md") ;;
    orbitbot-kernel) candidates+=("$ROOT/OrbitBot/wiki/orbitbot-kernel.md") ;;
  esac
  local p
  for p in "${candidates[@]}"; do
    if [[ -f "$p" ]]; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

_list_packs() {
  local found=0
  local d
  for d in "$ROOT/packs" "$ROOT/.ai/packs"; do
    if [[ -d "$d" ]]; then
      local f
      for f in "$d"/*.md; do
        [[ -f "$f" ]] || continue
        basename "$f" .md
        found=1
      done
    fi
  done
  # Fallbacks conhecidos (wiki)
  for f in \
    "$ROOT/KernelBot/wiki/kernelbot-rag.md" \
    "$ROOT/OrbitBot/wiki/orbitbot-kernel.md"; do
    if [[ -f "$f" ]]; then
      basename "$f" .md
      found=1
    fi
  done
  if [[ "$found" -eq 0 ]]; then
    echo "(nenhum)"
  fi
}

case "$MODE" in
  pack)
    NAME="${QUERY:-kernelbot-rag}"
    if ! PACK="$(_resolve_pack "$NAME")"; then
      echo "PACK_NOT_FOUND: $NAME (WIKI_ROOT=$ROOT)" >&2
      echo "Disponíveis:" >&2
      _list_packs >&2
      exit 1
    fi
    echo "=== PACK: $NAME ==="
    echo "path: $PACK"
    cat "$PACK"
    ;;
  list-packs)
    _list_packs | sort -u
    ;;
  search|scout)
    if [[ -z "$QUERY" ]]; then
      echo "Uso: ground.sh $MODE \"query\" [projeto]" >&2
      exit 1
    fi
    EXTRA=()
    if [[ -n "$PROJETO" ]]; then
      EXTRA+=(--projeto "$PROJETO")
    fi
    # Garantir imports do pacote instalado no venv ou via PYTHONPATH
    export PYTHONPATH="${ROOT}${PYTHONPATH:+:$PYTHONPATH}"
    export LOG_LEVEL="${LOG_LEVEL:-WARNING}"
    echo "=== GROUNDING ($MODE) query=$QUERY projeto=${PROJETO:-any} root=$ROOT ==="
    # Preferir módulo instalado no vault (default package name: gaabwiki / EXTERNAL)
    if "$PYTHON" -c "import ${WIKI_CLI_MODULE}" 2>/dev/null; then
      "$PYTHON" -m "$WIKI_CLI_MODULE" search "$QUERY" --json --top-k 8 "${EXTRA[@]}" \
        | python3 "$SKILL_DIR/scripts/format_hits.py"
    else
      echo "Pacote ${WIKI_CLI_MODULE} não importável com $PYTHON. pip install -e \"$ROOT\" (ou defina WIKI_CLI_MODULE)" >&2
      exit 1
    fi
    ;;
  *)
    echo "Modos: scout | search | pack | list-packs" >&2
    exit 1
    ;;
esac
