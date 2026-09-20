# Target Report — `mcp`

| Campo | Valor |
|-------|-------|
| Target | Model Context Protocol (MCP) |
| Category | skills-protocol |
| Mode | TARGET_RESEARCH |
| Versions examined | Spec index 2025-03-26 (modelcontextprotocol.io) |
| Access limitations | Spec overview fetched; schema.ts profundo não lido nesta passagem |
| Date | 2026-09-18 |
| Skill | agent-architecture-mining 1.0.0 |

## 1. What exists?

**DOCUMENTED** (spec oficial): protocolo aberto JSON-RPC 2.0 entre:

- **Hosts** — aplicações LLM que iniciam conexões  
- **Clients** — conectores dentro do host  
- **Servers** — serviços que expõem contexto e capabilities  

Servidores podem oferecer: **Resources**, **Prompts**, **Tools**.  
Clients podem oferecer: **Sampling** (comportamentos agentic iniciados pelo server).

Inspiração explícita: Language Server Protocol (LSP) — standardizar integração de contexto/tools no ecossistema AI ([spec](https://modelcontextprotocol.io/specification/2025-03-26)).

## 2. Architecture map

```text
Host (Cursor / IDE)
  └── MCP Client
        ↔ JSON-RPC (stateful, capability negotiation)
              └── MCP Server(s)
                    ├── Resources (data/context)
                    ├── Prompts (templates)
                    └── Tools (callable functions)
```

## 3. Execution flow (parcial)

```text
Input (user/agent need)
  → Host interprets need
  → Context Selection (resources / prompts exposed)
  → Reasoning (model in host)
  → Decision to call tool
  → Tool Selection (MCP tools list)
  → Authorization (USER CONSENT — DOCUMENTED as MUST principle)
  → Execution (server tool)
  → Result back to host
  → Evidence: UNKNOWN at protocol layer (app-specific)
  → Validation: UNKNOWN / host-dependent
  → State Update: connection stateful (DOCUMENTED)
  → Final Output: host UX
```

Etapas Evidence/Validation no protocolo: **UNKNOWN** (não definidas como bus de evidência; responsabilidade do host).

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| MCP-01 | Fragmentação de integrações tool/context | Protocolo standard JSON-RPC + negotiation | DOCUMENTED | USEFUL |
| MCP-02 | Tools = código arbitrário | Consent/UI + treat annotations untrusted | DOCUMENTED | USEFUL |
| MCP-03 | Server precisa de LLM | Client Sampling feature | DOCUMENTED | CONDITIONALLY_USEFUL |

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Standardização tipo LSP; composição de servers | DOCUMENTED / INFERRED |
| Product | Cursor e outros hosts adoptam UX de MCP settings | OBSERVED (este repo `mcp/`) |
| Distribution | Spec pública + SDKs | DOCUMENTED |
| Ecosystem | Muitos servers community (`npx`, OAuth) | OBSERVED (mcp/README.md) |
| Timing | Janela 2024–2025 de tool-calling ubiquidade | INFERRED |
| Community / DX | Docs + llms.txt | DOCUMENTED |

**Não** concluir: popular = superioridade técnica.

## 6. Comparison with MegaBrain

### MCP-01 Standard tool/context protocol

```text
EXTERNAL_MECHANISM: MCP JSON-RPC tools/resources/prompts
PROBLEM_SOLVED: interoperabilidade host↔tool servers
OUR_CURRENT_MECHANISM: Cursor MCP host + mcp/mcp.json; Capability Registry separado para workers/gates LLM
EQUIVALENCE: PARTIAL
GAP: MCP ≠ Capability IR; tools MCP não são automaticamente capabilities tipadas do orchestrator
TRADE_OFF: MCP dá DX de tools; Capability Registry dá scheduling/policy/evidence no engine
EVIDENCE: spec MCP; mcp/README.md; orchestrator providers
APPLICABILITY: já em uso no host Cursor
DECISION: ALREADY_PRESENT (integração host) + DEFER (bridge MCP-tool → Capability tipada sem pedido)
```

### MCP-02 Consent / tool safety

```text
EXTERNAL_MECHANISM: explicit user consent before tool invoke; untrusted tool annotations
PROBLEM_SOLVED: authority e trust em tools arbitrários
OUR_CURRENT_MECHANISM: Policy Engine (missão + ExecutionPolicy); CapabilityAuthority planeada; Cursor approval UI
EQUIVALENCE: PARTIAL
GAP: consent MCP é UX host; Policy MegaBrain é spawn/gates/budget
TRADE_OFF: camadas diferentes — não fundir num único «policy»
EVIDENCE: spec Security section; orquestrar policy-engine.md
APPLICABILITY: complementar
DECISION: ALREADY_PRESENT (camada host) — não criar Policy Engine paralelo
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| MCP as host tool protocol | ALREADY_PRESENT | HIGH |
| Second registry for MCP tools inside orchestrator | REJECT | HIGH |
| Typed bridge MCP→Capability | DEFER | MEDIUM |
| Sampling-as-agent-loop | DEFER / NOT_APPLICABLE until need | LOW |

## 8. UNKNOWN / CONFLICTS

- Detalhe exacto do schema TypeScript desta revisão: **UNKNOWN** (não lido nesta passagem)
- Como cada server do `mcp.json` mapeia a Resources vs Tools: **UNKNOWN** sem inspecção por server
- Sampling usage no CursorSKILLS: **UNKNOWN**

## 9. Sources

1. https://modelcontextprotocol.io/specification/2025-03-26 — DOCUMENTED  
2. `mcp/README.md` (repo) — OBSERVED  
3. `docs/architecture-audit-2026-09-17.md` / Capability Registry — OBSERVED  

## 10. Handoff

- Para `agent-authoring`: nenhum Agent Package novo necessário para «MCP Agent»  
- Para `architect` / plano plataforma: bridge tipado MCP→Capability se CapAuthority existir  
- **Não implementado nesta skill.**
