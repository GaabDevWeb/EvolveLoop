# Components

Managed components are listed explicitly in `manifest/components.yaml`.

## Core (minimal)

- Rules: `wiki-agent`, `evolveloop`
- Skills: `wiki` (bundled)
- Commands: `wiki`, `EvolveLoop`

## Standard

- Skills: `wiki-mem`, `orquestrar` (symlink)
- Hooks: merge into `hooks.json` (wiki-mem only)
- Worker skills: PDA roles from CursorSKILLS

## Full

- RAG: `install-path.sh` from vault
- systemd: `install-systemd-user.sh` from vault

Not managed: MCP tokens, session JSON, RAG index, episodic memory content.
