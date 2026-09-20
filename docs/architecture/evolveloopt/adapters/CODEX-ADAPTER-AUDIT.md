# CODEX — Adapter Audit

**Consulta:** 2026-09-20T19:29Z UTC  
**Fontes oficiais:** https://developers.openai.com/codex/sdk ; https://github.com/openai/codex/tree/main/sdk/typescript ; npm `@openai/codex-sdk@0.153.0` (registry, consultado via search 2026-09-20)

---

## Identity

| Campo | Valor |
|-------|-------|
| Vendor | OpenAI |
| Product | Codex (CLI + SDK + App Server) |
| Current interface | TS `@openai/codex-sdk`; Python `openai-codex` (app-server JSON-RPC) |
| Maturity | TS SDK: **Stable** (publicado npm); Python: **Stable** (docs); App Server: **Stable** path documentado |
| Nota | `codex mcp-server` **removido** — usar App Server (docs oficiais) |

---

## Invocation

| Canal | Status |
|-------|--------|
| TypeScript SDK | SUPPORTED — spawna CLI, JSONL stdin/stdout |
| Python SDK | SUPPORTED — controla app-server |
| CLI | SUPPORTED — runtime do TS SDK |
| App Server | SUPPORTED — clients custom (auth, history, approvals, stream) |
| IDE extension / Cloud | SUPPORTED como produto; API programática = via SDK/App Server |

**Estratégia proposta:** **D — Hybrid** — TypeScript SDK para orchestrator Node; App Server/Python se approvals/auth client-grade forem necessários.

---

## Runtime Model

- **Local agent subprocess:** TS SDK wraps `@openai/codex` CLI.
- **Thread model:** `codex.startThread()` → `thread.run()` / `runStreamed()`; `resumeThread(threadId)`.
- **App Server:** daemon/client para UI custom.
- **Cloud Codex:** produto separado; não assumir mesma API thread local.

---

## Authentication

| Método | Docs |
|--------|------|
| `CODEX_API_KEY` / env inject pelo SDK | Documentado (SDK injeta vars necessárias) |
| ChatGPT login (`codex login`) | Credential store local (`~/.codex/auth.json` referido em ecossistema ACP) |
| Service account | UNKNOWN nesta consulta |

Headless: possível com API key; login interativo = risco CI.

---

## Workspace

- Working directory controls no SDK (README TS).
- Writable roots / sandbox presets (Python): `read_only`, `workspace_write`, `full_access`.
- Multi-repo: UNKNOWN além de cwd/config.

---

## Agent Lifecycle

| Op | Interface |
|----|-----------|
| create thread | `startThread` / `thread_start` |
| run | `thread.run(prompt)` |
| stream | `runStreamed()` async generator |
| continue | `run` no mesmo thread |
| resume | `resumeThread(id)` |
| cancel | PARTIAL — process kill / turn cancel; detalhes App Server |
| close | context managers Python; process lifecycle TS |

---

## Tool Model

- Built-in coding tools (file/shell) — SUPPORTED (agent loop).
- Approvals — App Server + sandbox presets.
- Custom tools / MCP — PARTIAL (MCP server removido; MCP via outras configs = UNKNOWN).
- Tool events — stream estruturado no `runStreamed`.

---

## Streaming

- PROVEN docs: `runStreamed()` — tool calls, responses, file change notifications.
- Structured events JSONL.

---

## Structured Output

- PROVEN: JSON schema por turn; Zod → json-schema `target: "openAi"`.
- Adequado a AgentDecision JSON do EvolveLoop.

---

## Context

- Prompt + cwd + config/configOverrides.
- Thread history persistida vendor-side.
- Env control explícito no TS SDK (sandbox Electron).

---

## Subagents

- Native recursive agents: UNKNOWN / não evidenciado como API de primeira classe nesta consulta.
- Não confundir com EvolveLoop Supervisor.

---

## Model Selection

- Python: `model=` em `thread_start`.
- TS: via config overrides / CLI config.
- Per-turn sandbox override: Python docs.

---

## Usage

- Items/events podem carregar metadata; billing API completa = UNKNOWN.
- Tokens: PARTIAL.

---

## Cancellation / Recovery

- Resume thread por ID — SUPPORTED.
- Crash: thread ID vendor ≠ B04.
- Retry: caller responsibility.

---

## Sandbox

| Vendor | `Sandbox.read_only` / `workspace_write` / `full_access` — PROVEN Python docs |
| EvolveLoop | NOT_IMPLEMENTED — não unificar |

---

## Security

- `full_access` = arbitrary command/FS — alto risco.
- Approvals UX ≠ PolicyEngine.
- Env inheritance padrão = risco credential leak; SDK permite `env` whitelist.

---

## EvolveLoop Compatibility

| Area | Nota |
|------|------|
| Reasoning-only | POSSÍVEL via schema + prompt restritivo; tools ainda no agente Codex |
| Full agent runtime | Natural fit AgentBackend |
| A03 | Side-effects Codex bypass Runtime se agent escrever FS |
| B01 | Budgets EvolveLoop não controlam turns Codex nativamente — mapear `max` via config |

---

## Gaps

| Gap | Evidence | Strategy | Confidence |
|-----|----------|----------|------------|
| Duas stacks TS CLI vs Python App Server | docs openai.com/codex/sdk | Escolher uma primary; documentar secondary | HIGH |
| Approvals interativos em headless | App Server purpose | Policy pre-approve + sandbox read_only default | MEDIUM |
| MCP path removido | docs oficiais | Não depender de mcp-server legado | HIGH |
| Pacote não instalado no repo | probe local `codex not found` | Install só pós-aprovação | HIGH |

---

## Adapter Strategy

**D — Hybrid Adapter**  
Primary: `@openai/codex-sdk` (Node orchestrator).  
Optional: App Server para clients que precisam de approval stream.

**Classification:** **SECONDARY** — SDK oficial maduro, thread/resume/schema alinhados; ainda não no repo.
