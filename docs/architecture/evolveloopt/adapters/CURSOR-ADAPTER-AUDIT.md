# CURSOR — Adapter Audit

**Consulta:** 2026-09-20T19:29Z UTC  
**Branch:** `evolve-v2`  
**Escopo:** READ-ONLY — zero código

---

## Identity

| Campo | Valor |
|-------|-------|
| Vendor | Anysphere / Cursor |
| Product | Cursor Agent (SDK) |
| Current interface | TypeScript `@cursor/sdk`; Python `cursor-sdk` |
| Version observada (repo) | `@cursor/sdk@1.0.31` em `orchestrator/node_modules` |
| Official docs | https://cursor.com/docs/sdk/typescript ; https://cursor.com/docs/sdk/python |
| Skill canónica | `~/.cursor/skills-cursor/sdk/SKILL.md` |
| Maturity | **Public Beta** (docs/skill: both SDKs in public beta) |

---

## Invocation

| Canal | Status | Evidência |
|-------|--------|-----------|
| SDK TypeScript | SUPPORTED | `Agent.prompt`, `Agent.create` + `agent.send` |
| SDK Python | SUPPORTED | mesma semântica Agent→Run |
| CLI | PARTIAL / não preferido | SE-08 ADR rejeitou CLI-only; skill foca SDK |
| HTTP REST | PARTIAL | migração `/v1/agents` mencionada na skill; não auditada ao vivo |
| IDE-only | N/A para adapter | IDE ≠ seam programático |

**Estratégia proposta:** **A — Native SDK Adapter** (primária). Hybrid só se cloud REST for necessário.

---

## Runtime Model

- **Local agent:** `local: { cwd }` — processa no host do caller contra workspace local.
- **Cloud agent:** VM Cursor-hosted, repo clonado.
- **Modelo:** `Agent` → `Run` (stream de eventos).
- **Session/thread:** agent durable + runs; `Agent.resume` para continuidade.
- **Embedded:** SDK no processo Node/Python do host; agent loop no runtime Cursor.

---

## Authentication

| Método | Status |
|--------|--------|
| `CURSOR_API_KEY` env | PROVEN no código SE-08 (`cursor-auth.ts`) |
| OAuth / local login IDE | UNKNOWN para headless SDK (não usado em SE-08) |
| Hardcoded secrets | PROIBIDO |

Headless sem key → `REASONING_PROVIDER_UNAVAILABLE` / auth blocked (SE-08 live BLOCKED sem key).

---

## Workspace

| Aspecto | Observação |
|---------|------------|
| cwd | `local.cwd` obrigatório no path local |
| Multi-directory | UNKNOWN (docs enfatizam cwd único / cloud clone) |
| Remote workspace | Cloud runtime = clone remoto |
| Artifact model | Result text + stream events; filesystem mutável se tools habilitadas |

---

## Agent Lifecycle

| Op | SDK |
|----|-----|
| create | `Agent.create` |
| run / prompt | `Agent.prompt` (one-shot) / `agent.send` |
| continue | `agent.send` no mesmo Agent |
| resume | `Agent.resume` |
| cancel | cancel no Run (skill: cancellation) |
| stream | `run.stream()` |
| close | `await using` / dispose |

---

## Tool Model

| Capacidade | Status |
|------------|--------|
| Built-in tools | SUPPORTED (agent loop completo) |
| Custom tools | SUPPORTED (docs SDK) |
| Allowlist / disallowlist | SUPPORTED (skill menciona tool allow/disallow) |
| MCP | SUPPORTED (config MCP no agent) |
| Hooks | SUPPORTED (skill) |
| SE-08 mode | `tools: []` = **reasoning_only** — PROVEN no ADR-CURSOR |

**Conflito A03:** tools Cursor com side-effects = bypass Runtime/CapabilityAuthority se `agentic_workspace`.

---

## Streaming

- SUPPORTED: `run.stream()` — eventos tipados (`assistant`, tool, status, etc.).
- Final: `result.status`, `result.result`.
- Token/tool events: presentes no stream (Public Beta).

---

## Structured Output

- SE-08: JSON via prompt schema + parser EvolveLoop.
- SDK types: Run result tipado; schema-enforced JSON = PARTIAL (depende de prompt/parser, não de contract universal documentado nesta consulta).

---

## Context

- System/user prompt via SDK options.
- Repository: cwd / cloud clone.
- Persistent conversation: Agent multi-turn.
- Memory: vendor-side; não portável como SSOT EvolveLoop.

---

## Subagents

- Native subagents: SUPPORTED per SDK docs/skill — detalhes de isolation = PARTIAL nesta consulta.
- EvolveLoop Supervisor delegation ≠ Cursor subagents (autoridade EvolveLoop).

---

## Model Selection

- `model: { id: "..." }` per Agent/prompt — SUPPORTED.
- Aliases: vendor-specific.

---

## Usage

- Token/usage em eventos/result — PARTIAL (campos existem; billing API completa = UNKNOWN).
- SE-08 telemetry: `CursorStreamTelemetry` no adapter atual.

---

## Cancellation

- Local cancel no Run — SUPPORTED (skill).
- Partial result: stream até cancel — semantics vendor.

---

## Recovery

- `Agent.resume` — session resume vendor.
- Crash: vendor session ≠ B04 EvolveLoop checkpoint.
- **Não** tratar session ID Cursor como estado canónico.

---

## Sandbox

| Tipo | Status |
|------|--------|
| Vendor sandbox | OPTIONAL / cloud isolation — SEPARAR de EvolveLoop |
| EvolveLoop sandbox | **NOT_IMPLEMENTED** (contrato atual) |

---

## Security

- Privilege: tools Cursor podem executar comandos/arquivos.
- Credential: API key no env; risco de exposição ao subprocess/SDK.
- Permission modes: vendor + EvolveLoop Policy devem permanecer distintos.
- `reasoning_only` reduz risco A03; `agentic_workspace` aumenta.

---

## EvolveLoop Compatibility

| Componente | Compatibilidade conceitual |
|------------|----------------------------|
| AgentExecutor | Compatível via ReasoningProvider **apenas** em reasoning_only |
| AgentContract | Decision JSON → validate-decision |
| Supervisor / EngineeringWorker | Intactos se side-effects só via Worker→A03 |
| Runtime / Policy / A03 / B01 / B04 | Violáveis se tools Cursor ativas |
| Evidence / Telemetry | Adapter normaliza stream → telemetry; Evidence via engine |
| Review / Validation | EvolveLoop permanece autoridade |

---

## Gaps

| Gap | Evidence | Affected | Adapter strategy | Confidence |
|-----|----------|----------|------------------|------------|
| ReasoningProvider esconde Agent lifecycle | ADR-CURSOR + types.ts | Architecture | Introduzir AgentBackend; Cursor implementa ambos modes | HIGH |
| Agentic tools bypass A03 | ADR-CURSOR §4 | Policy/A03 | Mode flag + capability declaration; default deny | HIGH |
| Live auth não medido neste host | CURSOR_API_KEY ausente em SE-08 | Integration | Não inventar PASS | HIGH |
| Session portability | SDK resume vendor-only | Portability | Canonical state = EvolveLoop execution/checkpoint | HIGH |
| Cloud vs local semantics | Skill | Runtime | Capability tags `local`/`cloud` | MEDIUM |

---

## Adapter Strategy

**A — Native SDK Adapter** (PRIMARY)

```text
EvolveLoop AgentExecutor
  → CursorAgentBackend (proposto)
      → @cursor/sdk Agent/Run
```

Modos:

1. `reasoning_only` — tools vazio → encaixa ReasoningProvider (SE-08 atual).
2. `agent_runtime` — tools sob policy declarada → AgentBackend completo (NÃO implementado).

---

## Installation Model (não instalar)

- `npm i @cursor/sdk` (já presente 1.0.31 no orchestrator)
- Conta Cursor + `CURSOR_API_KEY`
- Node: alinhado ao orchestrator (20+ recomendado AGENT.md)
- OS: local runtime no host

---

## Version Compatibility

| Camada | Nota |
|--------|------|
| adapterVersion | futuro |
| backendVersion | `@cursor/sdk` semver; Public Beta → breaking risk HIGH |
| contractVersion | AgentBackend contractVersion proposto |

---

## Classification

**PRIMARY** — reference integration; SDK oficial; já parcialmente encaixado como ReasoningProvider (SE-08).
