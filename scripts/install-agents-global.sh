#!/usr/bin/env bash
# Instala EvolveLoop no Cursor global (~/.cursor + ~/.agents).
# Uso (de qualquer PC, após clonar):
#   bash scripts/install-agents-global.sh
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CURSOR_SKILLS_SRC="$REPO_ROOT/.cursor/skills"
CURSOR_CMD_SRC="$REPO_ROOT/.cursor/commands"
CURSOR_HOOKS_SRC="$REPO_ROOT/.cursor/hooks"
GLOBAL_SKILLS_SRC="$REPO_ROOT/global-skills"
MCP_SRC="$REPO_ROOT/mcp"
RULES_SRC="$REPO_ROOT/Rules"

GLOBAL_CURSOR="$HOME/.cursor"
GLOBAL_SKILLS="$GLOBAL_CURSOR/skills"
GLOBAL_COMMANDS="$GLOBAL_CURSOR/commands"
GLOBAL_HOOKS="$GLOBAL_CURSOR/hooks"
GLOBAL_RULES="$GLOBAL_CURSOR/rules"
GLOBAL_AGENTS="$HOME/.agents/skills"
ENV_FILE="$GLOBAL_CURSOR/agents.env"
MCP_ENV="$GLOBAL_CURSOR/mcp.env"

echo "REPO_ROOT=$REPO_ROOT"

mkdir -p "$GLOBAL_SKILLS" "$GLOBAL_COMMANDS" "$GLOBAL_HOOKS" "$GLOBAL_AGENTS" "$GLOBAL_RULES"

# --- Pipeline EvolveLoop ---
SKILLS=(
  orquestrar planner testing po-review security frontend-pro backend
  documentation prd database adr architect devops skill-authoring agent-authoring
  agent-architecture-mining
  wiki wiki-mem debugger researcher failure-analyst
  code-reviewer validator
)

rm -rf "$GLOBAL_SKILLS/gaabwiki" "$GLOBAL_SKILLS/gaabwiki-mem" "$GLOBAL_AGENTS/gaabwiki" "$GLOBAL_AGENTS/gaabwiki-mem" 2>/dev/null || true
for skill in "${SKILLS[@]}"; do
  if [[ -d "$CURSOR_SKILLS_SRC/$skill" ]]; then
    rm -rf "$GLOBAL_SKILLS/$skill" 2>/dev/null || true
    ln -sfn "$CURSOR_SKILLS_SRC/$skill" "$GLOBAL_SKILLS/$skill"
    rm -rf "$GLOBAL_AGENTS/$skill" 2>/dev/null || true
    ln -sfn "$CURSOR_SKILLS_SRC/$skill" "$GLOBAL_AGENTS/$skill"
    echo "  skill: $skill"
  fi
done

if [[ -d "$CURSOR_SKILLS_SRC/orquestrar" ]]; then
  ln -sfn "$CURSOR_SKILLS_SRC/orquestrar" "$GLOBAL_SKILLS/EvolveLoop"
  ln -sfn "$CURSOR_SKILLS_SRC/orquestrar" "$GLOBAL_AGENTS/EvolveLoop"
  echo "  skill alias: EvolveLoop -> orquestrar"
fi

# --- Tier 3 (globais) ---
if [[ -d "$GLOBAL_SKILLS_SRC" ]]; then
  for skill_dir in "$GLOBAL_SKILLS_SRC"/*; do
    [[ -d "$skill_dir" ]] || continue
    name="$(basename "$skill_dir")"
    rm -rf "$GLOBAL_AGENTS/$name" 2>/dev/null || true
    # Cópia real (não symlink) para sobreviver se o clone for apagado? Symlink é melhor para updates.
    ln -sfn "$skill_dir" "$GLOBAL_AGENTS/$name"
    echo "  global-skill: $name"
  done
fi

# --- Commands / ---
# Preferir ficheiros versionados no repo (evolve, wiki, mem, …).
if [[ -d "$CURSOR_CMD_SRC" ]]; then
  shopt -s nullglob
  for cmd_file in "$CURSOR_CMD_SRC"/*.md; do
    cp "$cmd_file" "$GLOBAL_COMMANDS/$(basename "$cmd_file")"
    echo "  command: $(basename "$cmd_file") (repo)"
  done
  shopt -u nullglob
fi

write_global_cmd() {
  local name="$1" skill="$2" extra="${3:-}"
  local dest="$GLOBAL_COMMANDS/${name}.md"
  if [[ -f "$dest" ]]; then
    echo "  command: ${name}.md (já no repo, skip generate)"
    return 0
  fi
  cat > "$dest" << EOF
# ${name} — EvolveLoop (global)

Invocação **\`/${name}\`**.

1. **Ler** \`~/.cursor/skills/${skill}/SKILL.md\` (contrato normativo)
2. AGENTS_ROOT: \`~/.cursor/agents.env\`
${extra}
EOF
  echo "  command: ${name}.md (generated)"
}

rm -f "$GLOBAL_COMMANDS/orquestrar.md" "$GLOBAL_COMMANDS/MegaBrain.md"
write_global_cmd "evolve" "orquestrar" "$(cat <<'EVOLVE_EXTRA'
3. Runtime: `$ORCHESTRATOR_ROOT` — `agents-orch engine`

**HARD-GATE:** imagem anexada → `~/.agents/skills/image-to-code/SKILL.md`
**Canonical command:** `/evolve` (public). Legacy `/MegaBrain` is not installed on public main.
EVOLVE_EXTRA
)"
write_global_cmd "planejar" "planner"
write_global_cmd "prd" "prd" "$(cat <<'PRD_EXTRA'
3. Pacote documental em docs/ **antes** de código (Relevant Context only)
4. **DO NOT:** implementar; ADR-only → handoff /adr
5. **HARD-GATE:** aguardar aprovação humana antes de /planejar
PRD_EXTRA
)"
write_global_cmd "database" "database" '3. Inputs: docs/DATA-MODEL.md, docs/API_SPEC.md (se existirem)'
write_global_cmd "adr" "adr" '3. Output: docs/adr/NNNN-titulo.md — feature nova preferir /prd; análise estrutural → /architect'
write_global_cmd "architect" "architect" '3. Capability architecture-analysis — não ADR; ADR → /adr; pacote feature → /prd'
write_global_cmd "backend" "backend" '3. Worker Fase 2 — capability backend-implementation'
write_global_cmd "frontend-pro" "frontend-pro" "$(cat <<'FE_EXTRA'
3. HARD-GATE: imagem anexada → Modo Vision + ~/.agents/skills/image-to-code/SKILL.md
FE_EXTRA
)"
write_global_cmd "testes" "testing" '3. Gate Fase 3 — capability testing'
write_global_cmd "seguranca" "security" '3. Gate Fase 4 — capability security-review'
write_global_cmd "devops" "devops" '3. Fase 4b (opcional) — CI/CD quando DoD inclui deploy'
write_global_cmd "validar" "po-review" '3. Gate Fase 5 — capability po-acceptance (subagente isolado)'
write_global_cmd "code-reviewer" "code-reviewer" '3. Gate/critic — capability code-review (≠ PO / testing / validator)'
write_global_cmd "validator" "validator" '3. Gate fino — capability validation DoD/evidence (≠ /validar PO)'
write_global_cmd "documentar" "documentation" '3. Gate Fase 6 — após PO OK e segurança sem bloqueio'
write_global_cmd "skill-authoring" "skill-authoring" '3. Evaluator skills — evals: spawn runners isolados'
write_global_cmd "wiki" "wiki" '3. Ritual pack → scout/search; template Fontes/Contratos/GAPs'
write_global_cmd "mem" "wiki-mem" '3. Memória episódica `.ai/sessions/` — não substitui /wiki'

# --- Hooks ---
if [[ -f "$REPO_ROOT/.cursor/hooks.json" ]]; then
  cp "$REPO_ROOT/.cursor/hooks.json" "$GLOBAL_CURSOR/hooks.json"
fi
if [[ -d "$CURSOR_HOOKS_SRC" ]]; then
  cp "$CURSOR_HOOKS_SRC"/*.sh "$GLOBAL_HOOKS/" 2>/dev/null || true
  chmod +x "$GLOBAL_HOOKS"/*.sh 2>/dev/null || true
  if [[ -d "$CURSOR_HOOKS_SRC/wiki-mem" ]]; then
    rm -rf "$GLOBAL_HOOKS/gaabwiki-mem" 2>/dev/null || true
    mkdir -p "$GLOBAL_HOOKS/wiki-mem"
    cp -a "$CURSOR_HOOKS_SRC/wiki-mem/." "$GLOBAL_HOOKS/wiki-mem/"
    chmod +x "$GLOBAL_HOOKS/wiki-mem/"*.sh 2>/dev/null || true
    echo "  hooks: wiki-mem/"
  fi
fi

# --- Rules ---
if [[ -f "$RULES_SRC/Rules.md" ]]; then
  rm -f "$GLOBAL_RULES/megabrain.mdc" 2>/dev/null || true
  cat > "$GLOBAL_RULES/evolveloop.mdc" << EOF
---
description: EvolveLoop rules — max priority in every workspace
alwaysApply: true
---

$(cat "$RULES_SRC/Rules.md")
EOF
  echo "  rules: evolveloop.mdc"
fi
if [[ -f "$RULES_SRC/wiki-agent.mdc" ]]; then
  rm -f "$GLOBAL_RULES/gaabwiki-agent.mdc" 2>/dev/null || true
  cp "$RULES_SRC/wiki-agent.mdc" "$GLOBAL_RULES/wiki-agent.mdc"
  echo "  rules: wiki-agent.mdc"
fi

# --- agents.env ---
cat > "$ENV_FILE" << EOF
# EvolveLoop — sourced by hooks and scripts
export AGENTS_ROOT="$REPO_ROOT"
export ORCHESTRATOR_ROOT="\$AGENTS_ROOT/orchestrator"
export ORCHESTRATOR_JOBS_DIR="\${ORCHESTRATOR_JOBS_DIR:-\$ORCHESTRATOR_ROOT/jobs}"
export ORCHESTRATOR_PROMPT_DIR="\${ORCHESTRATOR_PROMPT_DIR:-\$AGENTS_ROOT/.cursor/pickup}"
# Wiki corpus (required for grounding) — set WIKI_ROOT to your vault; RAG_REPO_ROOT is an alias
# export WIKI_ROOT="/path/to/wiki-vault"
# export RAG_REPO_ROOT="\$WIKI_ROOT"
EOF
echo "  env: $ENV_FILE"

# --- MCP ---
if [[ -f "$MCP_SRC/mcp.json" ]]; then
  if [[ -f "$GLOBAL_CURSOR/mcp.json" ]]; then
    cp "$GLOBAL_CURSOR/mcp.json" "$GLOBAL_CURSOR/mcp.json.bak.$(date +%Y%m%d%H%M%S)"
    echo "  mcp: backup de mcp.json existente"
  fi
  cp "$MCP_SRC/mcp.json" "$GLOBAL_CURSOR/mcp.json"

  # Substituir placeholders se mcp.env existir
  if [[ -f "$MCP_ENV" ]]; then
    # shellcheck disable=SC1090
    set -a; source "$MCP_ENV"; set +a
  elif [[ ! -f "$MCP_ENV" && -f "$MCP_SRC/mcp.env.example" ]]; then
    echo "  mcp: copie mcp/mcp.env.example → ~/.cursor/mcp.env e preencha secrets"
  fi

  GITHUB_PAT="${GITHUB_PAT:-YOUR_GITHUB_PAT}"
  FIRECRAWL_API_KEY="${FIRECRAWL_API_KEY:-YOUR_FIRECRAWL_API_KEY}"
  FILESYSTEM_ROOT="${FILESYSTEM_ROOT:-$HOME}"

  # Cursor não expande ${VAR} — materializar valores
  python3 - <<'PY' "$GLOBAL_CURSOR/mcp.json" "$GITHUB_PAT" "$FIRECRAWL_API_KEY" "$FILESYSTEM_ROOT"
import json, sys
path, gh, fc, fs = sys.argv[1:5]
with open(path) as f:
    data = f.read()
data = data.replace("${GITHUB_PAT}", gh).replace("${FIRECRAWL_API_KEY}", fc).replace("${FILESYSTEM_ROOT}", fs)
# Validar JSON
json.loads(data)
with open(path, "w") as f:
    f.write(data)
print("  mcp: ~/.cursor/mcp.json instalado")
PY
fi

# --- CLI wrapper ---
mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/agents-orch" << 'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
[[ -f "$HOME/.cursor/agents.env" ]] && source "$HOME/.cursor/agents.env"
ORCH="${ORCHESTRATOR_ROOT:?Defina AGENTS_ROOT via ~/.cursor/agents.env}"
cd "$ORCH"
case "${1:-help}" in
  test) npm test ;;
  build) npm run build ;;
  engine) shift; npm run run-engine -- "$@" ;;
  jobs) shift; npm run run-jobs -- "$@" ;;
  registry) shift; npm run registry-builder -- "$@" ;;
  *) echo "Usage: agents-orch {test|build|engine|jobs|registry} [args...]" ;;
esac
WRAPPER
chmod +x "$HOME/.local/bin/agents-orch"

mkdir -p "$REPO_ROOT/.cursor/pickup"

echo ""
echo "Instalação concluída."
echo "  AGENTS_ROOT=$REPO_ROOT"
echo "  Skills:     ~/.cursor/skills/ + ~/.agents/skills/"
echo "  Commands:   ~/.cursor/commands/"
echo "  Hooks:      ~/.cursor/hooks.json"
echo "  Rules:      ~/.cursor/rules/evolveloop.mdc + wiki-agent.mdc"
echo "  MCP:        ~/.cursor/mcp.json"
echo "  CLI:        agents-orch"
echo ""
echo "Próximos passos:"
echo "  1. cp mcp/mcp.env.example ~/.cursor/mcp.env  # se ainda não"
echo "  2. Editar secrets e re-correr este script"
echo "  3. Reiniciar o Cursor"
echo "  4. Em qualquer projeto: /evolve"
echo "  5. Definir WIKI_ROOT no agents.env se usar grounding Wiki"
