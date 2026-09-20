# Adapter Contract Proposal

**Status:** PROPOSED — not implemented  
**Date:** 2026-09-20  
**Branch:** `evolve-v2`

---

## 1. Critical answers

### Q33 — Is `ReasoningProvider` enough for Cursor/Codex/Claude/Antigravity?

**NO.**

`ReasoningProvider` (atual) = cognitive turn → `ReasoningResponse` / AgentDecision. Sem lifecycle de agent workspace, tool stream, vendor session, sandbox, approvals.

| Backend | ReasoningProvider suficiente? |
|---------|-------------------------------|
| Ollama | YES |
| Cursor reasoning_only (`tools:[]`) | YES (SE-08 transitional) |
| Cursor/Codex/Claude/Antigravity agentic | NO |

**Conclusão técnica proposta:**

```text
ReasoningProvider  = cognitive only
AgentBackend       = full agent runtime (optional capabilities)
```

Não: `AgentBackend extends ReasoningProvider` (distorce Liskov — nem todo AgentBackend é “só reasoning”; nem todo reasoning tem sessions/tools).

Opcional: um backend Cursor pode **implementar os dois adapters** (facades), não herança forçada.

### Q34 — Who controls tools?

**Model C — Hybrid (recomendado para aprovação).**

- Default seguro: `reasoning_only` (Model B cognitivo; tools EvolveLoop via Runtime).
- `agent_runtime`: vendor tools permitidos só sob capability declaration + deny-by-default + nunca completion authority.
- Model A puro: rejeitado para claims A03/B01.

### Q35 — Universal agent execution vs split?

**Separar:**

```text
reasoning runtime  ≠  coding agent runtime  ≠  execution backend (CapabilityProviders)
```

Um “AgentExecutor” permanece o orquestrador de **decisões**; um futuro `AgentBackendRegistry` seleciona runtime; ExecutionEngine permanece autoridade de side-effects.

---

## 2. Official seam

| Seam | Responsabilidade |
|------|------------------|
| `ReasoningProvider` | LLM/local inference → texto/JSON decision |
| `AgentBackend` (**novo, proposto**) | discover/health/auth/session/run/stream/cancel/resume/usage/capabilities |
| `AgentExecutor` | aplica contratos AgentDecision; timeouts; indisponibilidade explícita |
| `ExecutionEngine` / providers | side-effects autorizados |
| `Capability Registry` | availability ≠ authorization |

**Único seam oficial para backends externos de coding agent:** `AgentBackend`.  
`ReasoningProvider` permanece para cognitivos (Ollama, e facades reasoning_only).

---

## 3. `AgentBackend` operations

| Operation | Required? | Notes |
|-----------|-----------|-------|
| `discover` / `capabilities` | **required** | flags: streaming, sessions, tools, mcp, sandbox, cloud, structured_output |
| `health` | **required** | |
| `authenticate` | optional | alguns backends auth-on-run |
| `createSession` | optional | |
| `run` | **required** | ao menos one-shot |
| `stream` | optional | se capabilities.streaming |
| `cancel` | **required** | mesmo que = kill process |
| `resume` | optional | mesmo backend only |
| `close` | optional | |
| `usage` | optional | |
| vendor extensions | backend-specific | rewindFiles, cloud environment_id, etc. — **não** no core |

---

## 4. Required Core Contract (minimum common denominator)

O que Cursor, Codex, Claude Code, Antigravity **e** (para reasoning) Ollama respeitam sem degradar a arquitetura:

1. Aceitar **objective + policy summary + workspace roots** (Ollama ignora workspace mutável).
2. Produzir **resultado estruturado validável** (JSON Decision) **ou** declarar `INVALID_OUTPUT`.
3. Expor **capabilities** honestas (sem fingir workspace se não houver).
4. Suportar **cancel** best-effort.
5. Emitir falhas na **taxonomia normalizada**.
6. **Não** afirmar task completion — só run/result bruto.
7. Isolar credenciais no adapter.

### Optional Backend Capabilities

sessions, resume, streaming, vendor tools, MCP, subagents, sandbox presets, cloud environments, usage/cost, custom tools, approvals UX, structured schema native, multi-directory.

---

## 5. Must NOT abstract

- Approval UX vendor
- Cloud VM / managed sandbox semantics
- Native subagent trees
- Vendor artifact stores
- Session transcript formats
- Rewind/file restore APIs
- IDE-only surfaces

---

## 6. Multi-backend architecture (proposta)

```text
EvolveLoop Core
  → AgentExecutor
      → Backend Registry (discover/register/health)
          → resolve(selection)  // NÃO auto-fallback nesta fase
              → Cursor | Codex | Claude | Antigravity | Ollama(reasoning)
```

- Discovery: manifest/adapter self-description  
- Selection: config explícita (como `reasoning-config` hoje)  
- Routing automático / fallback: **fora de escopo de implementação até ADR**  
- Capability matching: soft check pré-run; fail-closed se required capability missing  

---

## 7. Proposed repo structure (NÃO criar agora)

```text
orchestrator/src/backends/
  types/           # AgentBackend, CapabilitySet, BackendError
  registry/
  resolve/
  capabilities/
  cursor/
  codex/
  claude-code/
  antigravity/
  ollama/          # thin: re-export ReasoningProvider adapter OR reasoning facade
```

Alternativa aceitável: `orchestrator/src/agent/backends/` para colocalizar com AgentExecutor.

Manter `orchestrator/src/agent/providers/` para ReasoningProviders existentes até migração.

---

## 8. AGENT.md proposal (NÃO editar agora)

Texto proposto a incorporar:

```text
EvolveLoop is backend-agnostic.

Cursor is the primary/reference integration.

Vendor-specific agents are adapters, not part of the core architecture.

The core must not contain vendor-specific execution logic.

All coding-agent backends integrate through the canonical AgentBackend contract.

Reasoning-only backends integrate through ReasoningProvider.

Backend-specific capabilities and limitations remain inside the adapter boundary.

Support policy: PRIMARY / SECONDARY / EXPERIMENTAL / RESEARCH / NOT_RECOMMENDED_FOR_ADAPTER.

Capability policy: adapters MUST declare capabilities; MUST NOT claim A03 for vendor side-effects.

Adapter development rules: no secrets in repo; fail-closed; contract tests mandatory before merge.

Testing: unit (mock) + contract suite + optional live integration behind explicit env gates.
```

Terminologia:

- **Backend** = vendor integration  
- **ReasoningProvider** = cognitive  
- **AgentBackend** = coding agent runtime  
- **Execution backend** = CapabilityProvider / Runtime (já existente; não renomear nesta proposta sem ADR)

---

## 9. Versioning

```text
adapterVersion + backendVersion + contractVersion
```

Breaking: contractVersion bump; adapters antigos fail discover.

---

## 10. Test strategy (futuro)

| Suite | Scope |
|-------|-------|
| Adapter unit | Mock vendor |
| Contract | Same cases all AgentBackends |
| Integration | Real backend + env gate |
| E2E | Brief→Completion com backend declarado |
| Adversarial | authority/bypass |
| Recovery | crash/resume EvolveLoop vs vendor |
| Live quality | NOT_MEASURED até gate explícito |

### Standard contract tests

**Mandatory:** init, health, auth-fail-closed, simple reasoning/decision, invalid output, cancel, timeout, failure taxonomy, evidence non-claim, telemetry separation, scope roots respected (no write outside se reasoning_only).

**Optional (if capability):** workspace modify, test execution via vendor tool, resume, MCP, subagents, sandbox presets.

---

## 11. Implementation sequence (pós-aprovação)

1. ADR: AgentBackend + authority Model C  
2. Types + registry + contract tests (mocks)  
3. Refactor documental Cursor SE-08 → facade dual (sem mudar default behavior)  
4. Codex **ou** Claude Secondary  
5. Antigravity Experimental (CLI)  
6. Ollama permanece ReasoningProvider  
7. Tier-3 research gate  

Sem ranking “melhor/pior”; classes: PRIMARY / SECONDARY / EXPERIMENTAL / RESEARCH / NOT_RECOMMENDED_FOR_ADAPTER.
