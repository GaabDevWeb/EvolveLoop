# Analysis framework — lentes, comparação, decisões

## Lentes (aplicar só se relevante)

Agent Model, Reasoning, Planning, Execution, Tools, Capabilities, Providers, Skills,  
Context, Context Loading, Context Compression, Memory, Knowledge, RAG, Retrieval,  
Handoffs, Multi-Agent Coordination, Routing, Model Routing, Permissions, Policy,  
Guardrails, Sandboxing, Human-in-the-Loop, Evidence, Validation, Recovery, Retry,  
Observability, Telemetry, Tracing, Persistence, State, Evaluation, Evals, Benchmarking,  
Extensibility, Plugins, Protocols, MCP, Developer Experience, UX, Documentation,  
Distribution, Ecosystem, Adoption, Economics, Latency, Token Efficiency, Reliability,  
Security, Failure Modes.

Não forçar lente inaplicável.

## Comparação com o nosso sistema (estrutura exacta)

```text
EXTERNAL_MECHANISM
PROBLEM_SOLVED
OUR_CURRENT_MECHANISM
EQUIVALENCE          # NONE | PARTIAL | SUBSTANTIAL | EQUIVALENT
GAP
TRADE_OFF
EVIDENCE
APPLICABILITY
DECISION             # ALREADY_PRESENT | ADOPT | ADAPT | PROTOTYPE | DEFER | REJECT
```

## Anti-duplicação (pesquisa obrigatória antes de propor novo)

Verificar se já existe: Capability Registry, Provider manifests, Policy Engine, Orchestrator,  
Runtime, Evidence Bus, Knowledge, Memory, Telemetry, Evals, Agent Package/Contracts,  
Capability IR / Task Graph, Skills, hooks, persistence.

Se equivalente → **`ALREADY_PRESENT`** (+ diferença residual se houver). **Não** propor segunda abstração.

## Decisões

| Código | Significado |
|--------|-------------|
| `ALREADY_PRESENT` | Mecanismo equivalente no MegaBrain |
| `ADOPT` | Adoptar tal-qual (raro; evidência forte + fit) |
| `ADAPT` | Adoptar ideia adaptada aos contratos existentes |
| `PROTOTYPE` | Experimento mínimo antes de adoptar |
| `DEFER` | Relevante mas prematuro / bloqueado |
| `REJECT` | Evidência insuficiente, harm, ou incompatível |

## Anti-padrões a procurar

over-agentization, excesso de handoffs, tool explosion, context explosion, memory pollution,  
planning overhead, unnecessary orchestration, duplicated registries, excessive abstraction,  
autonomous loops sem limite, lack of validation/evidence, uncontrolled authority, hidden state,  
poor observability, brittle prompts, excessive framework coupling.

## Cross-system

Mesmo mecanismo em A/B/C → **um** Level 3 Pattern (não três recomendações isoladas).  
Distinguir *isolated choice* vs *recurring pattern*.

## Evals derivados

Só quando medem propriedade concreta (ex.: `EVAL-CONTEXT-001`, `EVAL-HANDOFF-001`).  
Não inflacionar quantidade.
