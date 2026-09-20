# Adapter Ecosystem Audit — EvolveLoop Backend-Agnostic Architecture

**Status:** COMPLETE (documentation only)  
**Date:** 2026-09-20T19:29Z UTC  
**Branch:** `evolve-v2`  
**Code changes:** 0  

---

## 1. Executive Summary

EvolveLoop hoje é **cognitive-agnostic via `ReasoningProvider`**, com Cursor parcialmente encaixado (SE-08 `CursorReasoningProvider`, `reasoning_only`). Isso **não** torna o sistema **backend-agnostic** para coding agents.

**Achado central:** backends Tier-1/2 dividem-se em:

| Classe | Exemplos | Seam correto |
|--------|----------|--------------|
| Reasoning providers | Ollama | `ReasoningProvider` |
| Full agent runtimes | Cursor, Codex, Claude Code, Antigravity | **`AgentBackend` (proposto)** |

`ReasoningProvider` **não** é suficiente para representar Cursor/Codex/Claude/Antigravity em modo agentic.

Nenhuma implementação foi feita. Este pacote é um **PROJETO PROPOSTO** aguardando aprovação humana.

---

## 2. Current EvolveLoop Architecture

### 2.1 Seams observados (código + ADRs)

| Área | Local | Papel |
|------|-------|-------|
| Agent contracts | `orchestrator/src/agent/` | AgentDecision proposals only |
| AgentExecutor | `DefaultAgentExecutor` | Invoca ReasoningProvider; timeout; unavailable explícito |
| ReasoningProviders | Test, Ollama, Cursor (SE-08) | Cognitivo |
| Supervisor / Engineering | `supervisor/`, `engineering/` | Orquestração engenharia |
| Gates / Policy / Budgets | A03, B01, PolicyEngine | Autoridade |
| Checkpoint | B04 | Recovery canónico |
| Providers (capabilities) | `orchestrator/src/providers/` | Side-effects |
| Runtime dirs `src/runtime`, `src/execution` | **Ausentes** | Engine vive noutros módulos (gates/engine) |

### 2.2 ADR-AGENT-RUNTIME-BOUNDARY (preservar)

- Agent ≠ Runtime  
- LLM ≠ Authority  
- ReasoningProvider ≠ CapabilityProvider  
- Unavailable = explícito, nunca fake PASS  
- Sem mandatory vendor SDK no core  

### 2.3 ADR-CURSOR (SE-08)

- Cursor como ReasoningProvider + `tools: []`  
- `agentic_workspace` LIMITED vs A03  
- Sandbox EvolveLoop = NOT_IMPLEMENTED  

### 2.4 Único seam oficial proposto para coding agents externos

**`AgentBackend`** (novo contrato conceitual) — não `ReasoningProvider` sozinho.

AgentExecutor continua a ser o ponto de invocação de decisões; Registry resolve qual backend.

---

## 3. Adapter Boundary Proposal

```text
                     EvolveLoop Core
                           │
                     AgentExecutor
                           │
              ┌────────────┴────────────┐
              │                         │
      ReasoningProvider           AgentBackend
              │                         │
           Ollama              Backend Registry
           (Cursor facade)              │
                     ┌─────────┼─────────┐
                  Cursor    Codex    Claude Code
                     │         │
                Antigravity  (Future)
```

Adapters escondem: auth, lifecycle, sessions, streaming, tool model, workspace, approvals, sandbox vendor, cancel, retries, usage, semantics vendor.

---

## 4. Backend Inventory

| Backend | Tier | Class | Strategy | Classification |
|---------|------|-------|----------|----------------|
| Cursor | 1 | Agent runtime (+ reasoning facade) | A SDK | **PRIMARY** |
| Codex | 2 | Agent runtime | D Hybrid SDK/App Server | **SECONDARY** |
| Claude Code | 2 | Agent runtime | A SDK / B CLI fallback | **SECONDARY** |
| Antigravity | 2 | Agent runtime (local+cloud+Python) | B CLI / C API | **EXPERIMENTAL** |
| Ollama | 2 | Reasoning only | E Reasoning | **PRIMARY** (reasoning) / **NOT_RECOMMENDED** as full agent |
| Gemini CLI, OpenHands, Aider, Cline, … | 3 | Varied | — | **RESEARCH** / alguns **NOT_RECOMMENDED** |

Detalhes: `adapters/*-ADAPTER-AUDIT.md`, `adapters/CANDIDATE-ADAPTER-ECOSYSTEM-AUDIT.md`.

---

## 5. Capability Matrix

Ver `ADAPTER-CAPABILITY-MATRIX.md`.

Síntese: só Ollama e Cursor(reasoning_only) estão **PROVEN** no repo; demais **SUPPORTED** por docs oficiais nesta consulta.

---

## 6. Authority Matrix

Ver `ADAPTER-AUTHORITY-MATRIX.md`.

Riscos críticos de bypass: vendor tools → FS/shell; vendor SUCCESS → task completion; vendor session → B04; vendor approvals → Policy.

---

## 7. Portability Analysis

Ver `AGENT-BACKEND-PORTABILITY.md`.

- Continuar **conversa** Cursor↔Codex: **UNSAFE**  
- Continuar **task** com TaskGraph/checkpoint canónicos e novo run: **CONDITIONALLY_SAFE**  
- Fallback automático de backends: **UNSAFE** por default  

---

## 8. Security Analysis

1. API keys / credential stores por vendor — nunca no core.  
2. `dangerously-skip-permissions` / `bypassPermissions` / `Sandbox.full_access` / `--yolo` = high risk.  
3. Cloud managed sandboxes ≠ isolation EvolveLoop policy.  
4. Env inheritance (Codex default) pode vazar secrets — adapters devem whitelistar.  
5. EvolveLoop sandbox permanece NOT_IMPLEMENTED — não rotular vendor sandbox como EvolveLoop.

---

## 9. Recovery Analysis

| Mecanismo | Canónico? |
|-----------|-----------|
| B04 checkpoint | Sim |
| Vendor resume/thread/conversation | Não — metadata opcional |
| Re-prompt Decision com plan | Sim (reasoning) |
| Assumir session ID = recoverable state | **Proibido** |

---

## 10. Evidence / Telemetry Mapping

```text
raw vendor event → adapter normalize → telemetry ExecutionEvent
                 ↘ (promote only if engine validates) → Evidence
```

SE-08 já separa stream telemetry Cursor; generalizar o padrão.

---

## 11. Error Normalization

Taxonomia em `AGENT-BACKEND-PORTABILITY.md` e `ADAPTER-CONTRACT-PROPOSAL.md`.  
Core consome códigos normalizados; adapters mapeiam.

---

## 12. Contract Proposal

Ver `ADAPTER-CONTRACT-PROPOSAL.md`.

**Required Core Contract** vs **Optional Capabilities** definidos.  
Ops: discover/health/run/cancel required; session/stream/resume/usage optional.

---

## 13. Agent Backend vs Reasoning Provider Analysis

**Resposta Q33: NO** — ReasoningProvider insuficiente para agent runtimes completos.

Proposta:

```text
ReasoningProvider = cognitive only
AgentBackend      = full agent runtime
```

Facades podem expor ambos (Cursor SE-08 permanece reasoning até ADR agentic).

---

## 14. Vendor-specific Boundaries

Não abstrair: approval UX, cloud VM, subagent trees, rewind APIs, artifact stores, transcript formats, IDE-only.

ACP (OpenHands) = candidato de pesquisa a meta-protocol — **não** core agora.

---

## 15. AGENT.md Proposal

Texto canónico proposto em `ADAPTER-CONTRACT-PROPOSAL.md` §8.  
**Não editado** nesta etapa.

---

## 16. Future Implementation Plan (após aprovação)

1. ADR AgentBackend + Model C tools + authority non-bypass rules  
2. `orchestrator/src/backends/types|registry` + contract tests com mocks  
3. Cursor: documentar dual-facade; preservar default reasoning_only  
4. Secondary: Codex **ou** Claude (TS SDK)  
5. Experimental: Antigravity CLI  
6. Ollama: permanece ReasoningProvider  
7. Tier-3: reavaliar OpenHands/ACP  

**Não** implementar routing/fallback automático na primeira entrega.

---

## 17. Risks

| Risco | Severidade |
|-------|------------|
| Tratar AgentBackend como ReasoningProvider | Alto — A03/B01 claims inválidos |
| Fallback cross-vendor silencioso | Alto |
| Confundir vendor sandbox com EvolveLoop | Alto |
| Dependência Public Beta Cursor SDK | Médio |
| Antigravity preview IDs / sem TS SDK | Médio |
| Codex dual stack TS vs Python App Server | Médio |
| Expansão infinita Tier-3 | Baixo se gate RESEARCH |

---

## 18. Open Questions (exigem aprovação humana)

1. Adotar `AgentBackend` separado (recomendado) vs estender ReasoningProvider?  
2. Model C hybrid tools — confirmar?  
3. Secondary primeiro: Codex ou Claude Code?  
4. Permitir `agent_runtime` Cursor em algum profile, ou só reasoning_only até A03 tooling?  
5. Auto-fallback: proibir até ADR (recomendado)?  
6. Colocar código em `src/backends/` vs `src/agent/backends/`?  
7. Editar `AGENT.md` na próxima etapa?

---

## 19. Approval Gate

```text
ADAPTER_ECOSYSTEM_AUDIT_COMPLETE

IMPLEMENTATION_STATUS:
READ_ONLY

CODE_CHANGES:
0

TEST_CHANGES:
0

DEPENDENCY_CHANGES:
0

MAIN_CHANGED:
NO

IMPLEMENTATION_APPROVAL:
REQUIRED
```

### Documentos deste audit

| Path |
|------|
| `docs/architecture/evolveloopt/ADAPTER-ECOSYSTEM-AUDIT.md` |
| `docs/architecture/evolveloopt/ADAPTER-CONTRACT-PROPOSAL.md` |
| `docs/architecture/evolveloopt/ADAPTER-CAPABILITY-MATRIX.md` |
| `docs/architecture/evolveloopt/ADAPTER-AUTHORITY-MATRIX.md` |
| `docs/architecture/evolveloopt/AGENT-BACKEND-PORTABILITY.md` |
| `docs/architecture/evolveloopt/adapters/CURSOR-ADAPTER-AUDIT.md` |
| `docs/architecture/evolveloopt/adapters/CODEX-ADAPTER-AUDIT.md` |
| `docs/architecture/evolveloopt/adapters/CLAUDE-CODE-ADAPTER-AUDIT.md` |
| `docs/architecture/evolveloopt/adapters/ANTIGRAVITY-ADAPTER-AUDIT.md` |
| `docs/architecture/evolveloopt/adapters/OLLAMA-ADAPTER-AUDIT.md` |
| `docs/architecture/evolveloopt/adapters/CANDIDATE-ADAPTER-ECOSYSTEM-AUDIT.md` |

### Evidência local de testes (observado, não alterado)

- Vitest orchestrator (sessão anterior / ambiente): **699 passed | 2 skipped** — não reexecutado como parte mutativa; audit não alterou testes.
- V1 / V2: **não alterados**.

---

## READY_FOR_APPROVAL

Aguardando aprovação humana explícita antes de qualquer implementação de adapters, mudanças de interfaces, dependências ou `AGENT.md`.
