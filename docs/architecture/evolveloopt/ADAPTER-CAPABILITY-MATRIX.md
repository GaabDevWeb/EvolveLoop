# Adapter Capability Matrix

**Consulta:** 2026-09-20T19:29Z UTC  
**Legenda:** `PROVEN` (evidência no repo ou live local) · `SUPPORTED` (docs oficiais) · `PARTIAL` · `UNAVAILABLE` · `UNKNOWN`

Células **não** preenchidas por inferência estética.

| Capability | Cursor | Codex | Claude Code | Antigravity | Ollama |
|---|---|---|---|---|---|
| Reasoning | PROVEN (SE-08 provider) | SUPPORTED | SUPPORTED | SUPPORTED | PROVEN |
| Workspace agent | SUPPORTED (local/cloud) | SUPPORTED | SUPPORTED | SUPPORTED (local+remote) | UNAVAILABLE |
| Tool execution (vendor) | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | UNAVAILABLE (hints only) |
| Structured output | PARTIAL (prompt JSON SE-08) | SUPPORTED (schema/turn) | PARTIAL | SUPPORTED (`--json-schema`) | SUPPORTED (`format`) |
| Streaming | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED |
| Sessions | SUPPORTED | SUPPORTED (thread) | SUPPORTED | SUPPORTED (conversation) | UNAVAILABLE |
| Resume | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | UNAVAILABLE |
| Cancellation | SUPPORTED | PARTIAL | SUPPORTED | PARTIAL | SUPPORTED (HTTP abort) |
| Custom tools | SUPPORTED | PARTIAL | SUPPORTED | SUPPORTED (SDK/API) | PARTIAL (caller tools) |
| MCP | SUPPORTED | UNKNOWN (mcp-server removed) | SUPPORTED | SUPPORTED (managed/SDK) | UNAVAILABLE |
| Subagents | SUPPORTED | UNKNOWN | SUPPORTED | SUPPORTED | UNAVAILABLE |
| Sandbox (vendor) | PARTIAL | SUPPORTED (presets) | PARTIAL (permissions) | SUPPORTED (flag/cloud) | UNAVAILABLE |
| Usage/cost | PARTIAL | PARTIAL | SUPPORTED | SUPPORTED (token fields) | PARTIAL |
| Local execution | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED (CLI/SDK) | SUPPORTED |
| Cloud execution | SUPPORTED | PARTIAL (product exists; API parity UNKNOWN) | PARTIAL | SUPPORTED (managed preview) | PARTIAL (cloud; structured gap) |
| Official TS SDK | PROVEN 1.0.31 | SUPPORTED | SUPPORTED | UNAVAILABLE | PARTIAL (HTTP) |
| Official CLI headless | PARTIAL | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED |
| Fit ReasoningProvider | PROVEN (reasoning_only) | PARTIAL | PARTIAL | PARTIAL | PROVEN |
| Fit AgentBackend | SUPPORTED (proposed) | SUPPORTED (proposed) | SUPPORTED (proposed) | SUPPORTED (proposed) | UNAVAILABLE |

---

## Notes

1. **PROVEN** requer evidência no repo EvolveLoop ou binário local verificado nesta máquina.
2. MCP Codex marcado UNKNOWN porque docs oficiais declaram remoção de `codex mcp-server`; caminho sucessor não mapeado nesta auditoria.
3. Ollama tool calling = modelo solicita; execução não é do runtime Ollama.
