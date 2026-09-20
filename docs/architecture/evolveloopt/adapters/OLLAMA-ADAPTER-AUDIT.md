# OLLAMA — Adapter Audit

**Consulta:** 2026-09-20T19:29Z UTC  
**Fontes:** https://docs.ollama.com/api/chat ; https://docs.ollama.com/capabilities/tool-calling ; https://docs.ollama.com/capabilities/structured-outputs  
**Local:** `ollama version 0.30.9` em `/usr/local/bin/ollama`

---

## Identity

| Campo | Valor |
|-------|-------|
| Vendor | Ollama |
| Product | Local model runtime + HTTP API |
| Interface | HTTP `localhost:11434` (+ Python/JS clients) |
| Maturity | API chat/tools/format: **Stable** docs |
| Nota cloud | Structured outputs **não** suportados em Ollama Cloud (docs) |

---

## Invocation

| Canal | Status |
|-------|--------|
| HTTP `/api/chat`, `/api/generate` | SUPPORTED |
| CLI `ollama run` | SUPPORTED (interativo; menos ideal automation) |
| SDK | Client libraries oficiais |

**Estratégia:** **E — Reasoning-only Adapter** (já existe `OllamaReasoningProvider`).

---

## Runtime Model

- **Local inference daemon** — não é coding agent runtime.
- Sem workspace agent loop nativo.
- Tool calling: modelo **propõe** tools; **host** executa (caller loop).

---

## Authentication

- Tipicamente nenhuma em localhost.
- Remote Ollama: UNKNOWN / network ACL.

---

## Workspace

- **UNAVAILABLE** como agent workspace.
- EvolveLoop Worker/Runtime permanece dono de FS/shell.

---

## Agent Lifecycle

| Op | Ollama |
|----|--------|
| createSession | N/A (stateless messages array) |
| run | POST chat |
| resume | Reenviar history |
| cancel | Abort HTTP request |
| persist | Caller-owned |

---

## Tool Model

- Schema tools no request — SUPPORTED.
- Execução = **EvolveLoop** (Model B/C), não Ollama.
- MCP: N/A nativo.

---

## Streaming / Structured Output

- `stream: true` — SUPPORTED.
- `format: json` ou JSON Schema — SUPPORTED (local; cloud structured = unsupported).

---

## Context / Subagents / Model / Usage

- Messages + system prompt.
- Model discovery: `/api/tags`.
- Subagents: UNAVAILABLE.
- Usage: eval_count / prompt_eval_count — SUPPORTED partial.

---

## Cancellation / Recovery / Sandbox

- Abort client request.
- Sem session vendor durável.
- Sem sandbox agent — N/A.

---

## Security

- Baixo se só reasoning; alto se host executar tool_calls sem A03.
- Model weights locais; sem vendor cloud code execution.

---

## EvolveLoop Compatibility

| Componente | Fit |
|------------|-----|
| ReasoningProvider | **PROVEN** (`OllamaReasoningProvider`) |
| AgentBackend full | **NÃO** — falta workspace/tools loop |
| A03/B01 | Preservados se side-effects só via Runtime |

---

## Gaps

| Gap | Evidence | Confidence |
|-----|----------|------------|
| Não é agent runtime | docs API = chat/tools only | HIGH |
| Forçar AgentBackend distorce arquitetura | ADR-AGENT-RUNTIME-BOUNDARY | HIGH |
| Cloud structured outputs gap | docs structured-outputs | HIGH |

---

## Adapter Strategy

**E — Reasoning-only Adapter**  
Permanece sob `ReasoningProvider`.  
Opcionalmente tag capability `tool_calling_hints` sem execução.

**Classification:** **PRIMARY** para reasoning local; **NOT_RECOMMENDED_FOR_ADAPTER** como Full Agent Backend.
