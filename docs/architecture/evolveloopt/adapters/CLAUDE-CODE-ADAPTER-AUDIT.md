# CLAUDE CODE — Adapter Audit

**Consulta:** 2026-09-20T19:29Z UTC  
**Fontes:** https://code.claude.com/docs/en/agent-sdk/overview ; https://code.claude.com/docs/en/agent-sdk/typescript

---

## Identity

| Campo | Valor |
|-------|-------|
| Vendor | Anthropic |
| Product | Claude Code / Agent SDK |
| Package | `@anthropic-ai/claude-agent-sdk` (+ optional platform binary) |
| Também | CLI `claude` com `-p` / `--output-format` |
| Maturity | Agent SDK: **Stable** docs surface; control protocol types `@alpha` em alguns paths |

---

## Invocation

| Canal | Status |
|-------|--------|
| TypeScript Agent SDK `query()` | SUPPORTED |
| Python Agent SDK | SUPPORTED |
| CLI `-p` + `json` / `stream-json` | SUPPORTED |
| Subprocess JSON control protocol | SUPPORTED (host ↔ claude stdin/stdout) |

**Estratégia:** **A — Native SDK Adapter** (preferida); **B — CLI Adapter** como fallback se optional native binary falhar (`pathToClaudeCodeExecutable`).

---

## Runtime Model

- Agent loop embutido (plan → tools → done) no processo Claude Code.
- SDK pode bundle binary nativo por plataforma.
- Session UUID persistente; `listSessions`, `getSessionMessages`, `resume`, `forkSession`.
- Multi-turn via `query({ prompt })` ou streaming input generator.

---

## Authentication

| Método | Status |
|--------|--------|
| `ANTHROPIC_API_KEY` | SUPPORTED |
| Claude subscription login / credential store | SUPPORTED (Keychain / `~/.claude/.credentials.json`) |
| Headless CI | API key preferível |

---

## Workspace

- `cwd` / project directory ligado a sessions.
- Worktrees: `includeWorktrees` em listSessions.
- Filesystem tools nativos (Read, Edit, Bash, etc.).

---

## Agent Lifecycle

| Op | API |
|----|-----|
| run | `query({ prompt, options })` async iterator |
| resume | `options.resume` + sessionId |
| fork | `forkSession` |
| list/inspect | `listSessions`, `getSessionMessages`, `getSessionInfo` |
| cancel/stop | `stopTask`, `close()` |
| persist | `persistSession` (default true) |

---

## Tool Model

| Feature | Docs |
|---------|------|
| `allowedTools` | Auto-approve list — **não** restringe sozinho |
| `disallowedTools` | Bloqueia (incl. scoped `Bash(rm *)`) |
| `permissionMode` | `default`, `bypassPermissions`, etc. |
| `canUseTool` | Callback |
| MCP | `setMcpServers`, status, reconnect |
| Hooks | lifecycle (docs overview / harness) |
| maxTurns | Limite de tool round-trips |

**Crítico para A03:** allowedTools ≠ denylist; EvolveLoop deve usar `disallowedTools` + permissionMode + observation.

---

## Streaming

- Message stream: assistant, tool, result, `stream_event` se `includePartialMessages`.
- CLI: `--output-format stream-json`.

---

## Structured Output

- Result messages tipados; JSON final via prompt/schema — PARTIAL formal schema API vs Claude structured outputs gerais.
- Adequado com parser EvolveLoop + validate-decision.

---

## Context

- System/user prompts; repo via tools.
- Session transcript persistente.
- Subagent messages: `parent_tool_use_id`.

---

## Subagents

- Native Agent tool / subagents — SUPPORTED (parent_tool_use_id).
- Isolation: vendor; não substitui Supervisor EvolveLoop.

---

## Model Selection

- Options models / account info via initialize.
- Per-query model selection — SUPPORTED nos docs.

---

## Usage

- Result payloads incluem usage fields típicos Anthropic — SUPPORTED em result messages (consultar tipos SDK na implementação futura).

---

## Cancellation / Recovery

- `close()`, `stopTask` — cancel.
- Session resume — SUPPORTED.
- Rewind files API (`rewindFiles`) — vendor-specific, **não abstrair** como universal.

---

## Sandbox

- Permission modes + tool deny = vendor safety.
- Separar de EvolveLoop sandbox NOT_IMPLEMENTED.

---

## Security

- `bypassPermissions` + `allowDangerouslySkipPermissions` = high risk.
- Bash tool = arbitrary execution.
- Credential files no home.

---

## EvolveLoop Compatibility

| Mode | Fit |
|------|-----|
| Reasoning-only | Possível restringindo tools fortemente (`disallowedTools` amplo + maxTurns baixo) — frágil |
| Agent runtime | Fit natural AgentBackend |
| A03/B01 | Observar tool events; não autorizar via Claude alone |

---

## Gaps

| Gap | Evidence | Confidence |
|-----|----------|------------|
| `allowedTools` não é allowlist restritiva | docs TypeScript options | HIGH |
| Alpha control protocol | `@alpha` types | MEDIUM |
| CLI não no PATH deste host | `claude not found` | HIGH |
| Dual Python/TS | docs | LOW (escolher TS no orchestrator) |

---

## Adapter Strategy

**A — Native SDK** (`@anthropic-ai/claude-agent-sdk`)  
Fallback **B — CLI** stream-json.

**Classification:** **SECONDARY** — API programática completa, sessions/tools/MCP maduros.
