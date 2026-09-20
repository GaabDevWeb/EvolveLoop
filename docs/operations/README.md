# Operations

- Set `AGENTS_ROOT` / `ORCHESTRATOR_ROOT` / `WIKI_ROOT` via environment.  
- Orchestrator: `cd orchestrator && npm install && npm run build && npm run run-engine -- …`  
- Hooks: public default registers orchestrator pickup only; wiki-mem is opt-in.  
- Never commit `mcp/mcp.env` or `.env` files.

Installer: `scripts/install-agents-global.sh`, `agent-setup/`.
