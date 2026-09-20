# Analyze project — quick scan prompt

Read-only scan for `agent init` follow-up.

Detect and report:

- `language`, `framework`, `package_manager`
- test directories and runner
- CI configuration
- existing `.cursor/` contents
- wiki paths (`.ai/`, `wiki/`, vault links)
- secrets risk (`.env` present — do not read values)

Output JSON-shaped summary only from evidence on disk.
