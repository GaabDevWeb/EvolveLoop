# Instalação global — CursorSKILLS / MegaBrain

Após clonar este repositório:

```bash
cp mcp/mcp.env.example ~/.cursor/mcp.env
# editar secrets
bash scripts/install-agents-global.sh
```

Reinicia o Cursor.

## O que instala

| Destino | Conteúdo |
|---------|----------|
| `~/.cursor/skills/` | symlinks → `.cursor/skills/` deste repo |
| `~/.agents/skills/` | pipeline + `global-skills/` (Tier 3) |
| `~/.cursor/commands/` | `/MegaBrain`, `/wiki`, `/mem`, `/prd`, `/planejar`, `/backend`, `/database`, `/adr`, `/devops`, `/testes`, `/seguranca`, `/validar`, `/documentar`, … |
| `~/.cursor/hooks.json` | pickup SkillJobs + `wiki-mem` |
| `~/.cursor/rules/` | `megabrain.mdc` + `wiki-agent.mdc` |
| `~/.cursor/agents.env` | `AGENTS_ROOT`, `ORCHESTRATOR_ROOT` |
| `~/.cursor/mcp.json` | MCPs pré-configurados |
| `~/.local/bin/agents-orch` | CLI do orchestrator |

## Variáveis

`~/.cursor/agents.env` (gerado pelo instalador):

```bash
export AGENTS_ROOT="/caminho/para/CursorSKILLS"
export ORCHESTRATOR_ROOT="$AGENTS_ROOT/orchestrator"
```

Secrets MCP: `~/.cursor/mcp.env` (nunca no git).

Guia completo: [README.md](README.md) · Fluxo: [docs/MegaBrain-Ecosystem.md](docs/MegaBrain-Ecosystem.md) · Stack 2026-08: [docs/cursor-megabrain-rag-stack.md](docs/cursor-megabrain-rag-stack.md)
