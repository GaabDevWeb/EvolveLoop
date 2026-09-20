# Agent Setup

Infraestrutura **declarativa e reproduzível** para o ambiente de desenvolvimento assistido por IA (Cursor + Wiki + MegaBrain).

Não substitui MegaBrain, Wiki ou RAG — **instala, configura, verifica e inicializa projetos**.

## Quick start

```bash
git clone <repo> agent-setup
cd agent-setup
./bootstrap.sh
agent doctor
agent install --profile standard
agent diff
```

## Profiles

| Profile | Inclui |
|---------|--------|
| `minimal` | Rules, wiki skill, wiki/MegaBrain commands |
| `standard` | + memory hooks, MegaBrain skills (symlink CursorSKILLS) |
| `full` | + RAG PATH, systemd wiki stack |

## CLI

```bash
agent install [--profile standard]
agent update
agent uninstall
agent doctor
agent status
agent detect
agent diff [--profile standard]
agent init [--rag] [path]
agent version
```

## Project init

```bash
cd ~/Projetos/meu-projeto
agent init
```

Cria `.agent.yaml`, `.cursor/`, `.ai/sessions/` (estrutura mínima).

## Architecture

- `manifest/` — desired state (SSOT)
- `~/.agent-setup/state.json` — installed managed components
- `~/.agent-setup/backups/` — backups before overwrite
- `~/.agent-setup/config.yaml` — machine paths (vault, CursorSKILLS)

Ver `docs/architecture.md`.

## Secrets

Nunca versionar `.env` com valores reais. Usar `config/defaults/env.example`.

## Supported environments

Testado: **Debian 13**, Python 3.11+. Cursor instalado. systemd user opcional (profile full).

## Uninstall

```bash
agent uninstall
```

Remove apenas componentes gerenciados pelo Agent Setup.
