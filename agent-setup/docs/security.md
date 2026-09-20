# Security

- No secrets in git (`.env`, `mcp.env`, tokens)
- `config/defaults/env.example` — variable names only
- Backups may contain user config — stored under `~/.agent-setup/backups/` (local)
- Hooks preserve third-party entries in `hooks.json` (merge, not replace)
- Install never reads or writes API key values
