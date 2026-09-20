# Target Report — `microsoft-agent-framework`

| Campo | Valor |
|-------|-------|
| Target | Microsoft Agent Framework (MAF) + AutoGen (predecessor lineage) |
| Category | SDK |
| Provenance | OFFICIAL_EXTERNAL |
| Mode | TARGET_RESEARCH |
| Versions examined | Docs/Learn + GitHub READMEs as of investigation date (no pinned SDK install; no local source checkout) |
| Access limitations | Observational only (docs + public READMEs). No package install, no runtime execution, no deep source walk of `microsoft/agent-framework` or `microsoft/autogen` trees. |
| Date | 2026-09-18 |
| Epistemic note | Primary claims are `DOCUMENTED` unless marked otherwise. Internals not verified in source → `UNKNOWN` where noted. |

---

## Naming clarification (DOCUMENTED)

| Name | What it is | Status (official) | Relationship |
|------|------------|-------------------|--------------|
| **AutoGen** | Multi-agent framework from Microsoft Research lineage (`microsoft/autogen`). Layers: Core (event-driven / actor messaging), AgentChat (high-level teams), Extensions. | **Maintenance mode**; community-managed; no new features | Predecessor / experimental multi-agent patterns source |
| **Microsoft Agent Framework (MAF)** | Multi-language SDK (`microsoft/agent-framework`) for production agents + workflows (Python, .NET; Go SDK separate repo, public preview) | **Successor** recommended for new work; AutoGen README claims production-ready / 1.0 | Merges AutoGen agent/multi-agent ideas with Semantic Kernel enterprise features; adds typed graph workflows |
| **Semantic Kernel** | Prior Microsoft AI SDK | Migration path into MAF also documented | Co-parent of MAF with AutoGen teams |

**Official stance (DOCUMENTED):**

> Agent Framework is the direct successor [of Semantic Kernel and AutoGen], created by the same teams… the next generation of both Semantic Kernel and AutoGen.  
> — [MAF Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)

> AutoGen is now in maintenance mode… New users should start with Microsoft Agent Framework.  
> — [microsoft/autogen README](https://github.com/microsoft/autogen)

They are **not** the same product. Migration is explicit (`AssistantAgent` → `Agent`, `Team`/GroupChat patterns → `Workflow` / builders). Magentic orchestration in MAF is **designed based on Magentic-One invented by AutoGen** ([Magentic docs](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic)).

---

## 1. What exists?

Four primary areas in MAF ([Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)):

1. **Agents** — LLM agents with tools/MCP; multi-provider clients.
2. **Harness Agent** — opinionated long-running agent (planning/todos, context compaction, file memory, tool approval, observability).
3. **Workflows** — functional (`@workflow` / `@step`, Python experimental) and graph (`WorkflowBuilder`) orchestration.
4. **Integrations** — providers, middleware, context providers, evaluation, UI (DevUI).

Foundational blocks: model clients, **AgentSession**, context/history providers, middleware, MCP clients.

AutoGen (legacy, still documented) still offers Core + AgentChat + Extensions + Studio/Bench; Magentic-One as reference multi-agent team.

---

## 2. Architecture map

```text
                    ┌─────────────────────────────────────────┐
                    │         Application / Hosting            │
                    │  (self-host, Foundry hosted, A2A, …)     │
                    └───────────────────┬─────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
          ▼                             ▼                             ▼
   ┌──────────────┐            ┌────────────────┐            ┌────────────────┐
   │ Single Agent │            │   Workflows    │            │ Harness Agent  │
   │ Agent.run()  │◄───────────│ graph / @wf    │            │ batteries-incl │
   │ + tools/MCP  │  as_agent  │ orchestrations │            └────────────────┘
   └──────┬───────┘            └───────┬────────┘
          │                            │
          │  AgentSession              │  edges / request_info / checkpoints
          │  ChatHistoryProvider       │  Sequential|Concurrent|Handoff|
          │  AIContextProviders        │  GroupChat|Magentic builders
          │  Middleware (agent/fn/chat)│
          ▼                            ▼
   ┌──────────────────────────────────────────────────────────┐
   │ Chat / Responses clients · OpenTelemetry · Tool approval │
   └──────────────────────────────────────────────────────────┘
```

**AutoGen dual model (DOCUMENTED, migration guide):**

- Low-level: `autogen-core` — `RoutedAgent`, message handlers, embedded/experimental distributed runtimes.
- High-level: `Team` — e.g. `RoundRobinGroupChat`, `SelectorGroupChat`, `Swarm`, `MagenticOneGroupChat`, experimental `GraphFlow`.

**MAF unified model:** typed **Workflow** (data-flow edges) + orchestration builders; agents are executors among functions/sub-workflows.

---

## 3. Execution flow (DOCUMENTED)

### Single agent

```text
Input messages
  → Agent middleware
  → Context layer (ChatHistoryProvider + AIContextProviders)
  → Chat client (+ chat middleware / telemetry)
  → LLM
  → Function-invocation loop (+ function middleware; tool approval gates)
  → AgentResponse (+ session state update)
```

Source: [Agent pipeline](https://learn.microsoft.com/en-us/agent-framework/agents/agent-pipeline).

### Workflow (graph)

```text
Input → start executor
  → typed messages along edges (optional fan-out / join / target_id routing)
  → optional ctx.request_info() / RequestPort → external HITL response → resume
  → optional checkpoint at superstep / step boundary
  → yield_output → Final Output (+ event stream)
```

### Multi-agent orchestration (builders)

| Pattern | Mechanism (DOCUMENTED) |
|---------|------------------------|
| Sequential | Round-robin style shared conversation |
| Concurrent | Parallel participants + aggregator |
| Handoff | Mesh; agent transfers full ownership (vs agent-as-tool) |
| Group Chat | Manager selects next speaker; termination condition / max rounds |
| Magentic | Manager plans/delegates; stall/reset limits; optional plan review HITL |

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| MAF-AGENT | Single LLM actor with tools | `Agent` / `AIAgent`; multi-turn tool loop by default | DOCUMENTED | Core unit of work |
| MAF-SESSION | Cross-turn / resumable state | `AgentSession` (+ serialize); service_session_id caveats | DOCUMENTED | Conversation + harness state |
| MAF-CTX | Memory / RAG / enrichment | `ChatHistoryProvider`, `AIContextProvider`, FileMemory | DOCUMENTED | Pluggable context |
| MAF-TOOL | External actions | `@tool`, hosted tools, MCP, agent-as-tool, approval | DOCUMENTED | Capability surface |
| MAF-MW | Cross-cutting control | Agent / function / chat middleware | DOCUMENTED | Guardrails, logging, transform |
| MAF-WF | Explicit multi-step orchestration | WorkflowBuilder + Functional @workflow | DOCUMENTED | Deterministic paths |
| MAF-MSG | Inter-executor communication | Typed edge messages; not broadcast (vs GraphFlow) | DOCUMENTED | Data-flow coordination |
| MAF-TEAM | Multi-agent collaboration | Orchestration builders (seq/conc/handoff/group/magentic) | DOCUMENTED | Pattern library |
| MAF-DEL | Dynamic expertise routing | Handoff mesh vs agent-as-tools | DOCUMENTED | Delegation semantics |
| MAF-TERM | Bound autonomous loops | `termination_condition`, max_rounds / stall / reset | DOCUMENTED | Safety / cost bound |
| MAF-HITL | Human gates | `request_info` / RequestPort; tool approval; Magentic plan review | DOCUMENTED | Controllability |
| MAF-CKPT | Long-running durability | Workflow checkpoints (+ pending requests) | DOCUMENTED | Resume / time-travel |
| MAF-OBS | Operability | OpenTelemetry spans/events | DOCUMENTED | Tracing |
| MAF-EXT | Ecosystem hooks | Providers, MCP, A2A, declarative agents, skills ADR | DOCUMENTED | Extensibility |
| AG-CORE | Event-driven multi-agent | AutoGen Core actor messaging + runtimes | DOCUMENTED | Legacy / distributed path |
| AG-TEAM | Opinionated multi-agent chat | AgentChat Teams + termination conditions | DOCUMENTED | Prototyping (maintenance) |

Full inventory: `MECHANISMS.yaml`.

---

## 5. Adoption analysis (separated — not merit ranking)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Strong typed workflows, HITL, checkpoints, middleware, sessions; dual Python/.NET; Go preview | DOCUMENTED |
| Product | Positioned as production successor to AutoGen + SK; Foundry hosting samples | DOCUMENTED |
| Distribution | PyPI `agent-framework`, NuGet `Microsoft.Agents.AI`, MS Learn | DOCUMENTED |
| Ecosystem | Azure/Foundry gravity; MCP/A2A; Autogen migration samples | DOCUMENTED |
| Timing | AutoGen maintenance pushes migration pressure | DOCUMENTED |
| Community / DX | DevUI, samples, Discord; AutoGen community now secondary | DOCUMENTED / INFERRED (DX quality not measured) |

**Prohibited inference:** popularity ≠ architectural superiority for MegaBrain.

---

## 6. Comparison with MegaBrain (per mechanism)

Baseline: `research/OUR-SYSTEM-BASELINE.md`.

### EXTERNAL_MECHANISM: Typed Workflow graph (executors + edges)
- **PROBLEM_SOLVED:** Explicit multi-step / multi-agent data flow with type routing
- **OUR_CURRENT_MECHANISM:** Orchestrator + Capability IR `plan.ir.yaml` / Task Graph
- **EQUIVALENCE:** PARTIAL — both are explicit graphs of work; MAF is in-process SDK runtime; ours is capability-plan + Cursor/PDA orchestration
- **GAP:** No first-class typed message-edge executor model in MegaBrain equivalent to WorkflowBuilder
- **TRADE_OFF:** Adopting MAF graphs couples to Microsoft SDK; adapting ideas stays in Capability IR
- **EVIDENCE:** DOCUMENTED (MAF workflows) + OBSERVED baseline (Capability IR)
- **APPLICABILITY:** Pattern ideas yes; wholesale SDK no (wrong host)
- **DECISION:** ADAPT — graph edge/join/HITL pause concepts into IR/runtime docs; **not** embed MAF
- **Confidence:** MEDIUM

### EXTERNAL_MECHANISM: Orchestration builders (handoff / group chat / Magentic)
- **PROBLEM_SOLVED:** Reusable multi-agent collaboration patterns + termination bounds
- **OUR_CURRENT_MECHANISM:** Multi-agent PDA (plan/exec/gate/explore/critic/librarian) via Task tool
- **EQUIVALENCE:** PARTIAL — role-specialized multi-agent exists; no Magentic-style planner-manager loop as product feature
- **GAP:** Dynamic speaker selection / stall-replan / mesh handoff as named primitives
- **TRADE_OFF:** More autonomy vs Evidence/Policy gates; Magentic docs warn performance outside Magentic-One design is untested
- **EVIDENCE:** DOCUMENTED Magentic note + baseline PDA
- **APPLICABILITY:** Selective pattern mining for PDA; reject unbounded group chat
- **DECISION:** DEFER Magentic-as-product; ADAPT termination/stall bounds + handoff-vs-tool distinction into authoring guidance
- **Confidence:** MEDIUM

### EXTERNAL_MECHANISM: AgentSession + context providers
- **PROBLEM_SOLVED:** Per-conversation state, history, pluggable memory
- **OUR_CURRENT_MECHANISM:** gaabwiki-mem / `.ai/sessions` (episodic); Evidence Bus JSON; Knowledge/RAG
- **EQUIVALENCE:** PARTIAL — we have continuity + evidence, not unified agent working-memory session API
- **GAP:** Session-scoped mutable state + provider pipeline around each model call
- **TRADE_OFF:** Richer agent memory vs pollution / tenancy risks (MAF documents service_session_id pitfalls)
- **EVIDENCE:** DOCUMENTED Session + baseline Memory PARTIAL
- **APPLICABILITY:** ADAPT session/provider separation; keep Evidence as SSOT for gates
- **DECISION:** ADAPT
- **Confidence:** MEDIUM

### EXTERNAL_MECHANISM: Middleware (agent / function / chat)
- **PROBLEM_SOLVED:** Interception for validation, logging, approval, transform
- **OUR_CURRENT_MECHANISM:** Policy Engine + hooks + Evidence gates
- **EQUIVALENCE:** SUBSTANTIAL conceptually (policy/hooks ≈ middleware layers)
- **GAP:** Fine-grained per-tool-call middleware chain in one process
- **TRADE_OFF:** SDK middleware vs declarative Policy — ours should stay declarative for auditability
- **EVIDENCE:** DOCUMENTED middleware + baseline Policy
- **APPLICABILITY:** Map function-middleware ideas onto Policy/tool approval; avoid second registry
- **DECISION:** ALREADY_PRESENT (policy/hooks) + ADAPT tool-approval pause semantics if missing
- **Confidence:** MEDIUM — tool-approval parity needs CursorSKILLS audit → residual UNKNOWN

### EXTERNAL_MECHANISM: Workflow HITL request/response + checkpoints
- **PROBLEM_SOLVED:** Pause for human/external input; durable resume
- **OUR_CURRENT_MECHANISM:** Evidence gates; jobs/checkpoints PARTIAL
- **EQUIVALENCE:** PARTIAL
- **GAP:** First-class request_info event loop with typed request/response
- **TRADE_OFF:** Stronger long-running UX vs complexity
- **EVIDENCE:** DOCUMENTED HITL + baseline Persistence PARTIAL
- **APPLICABILITY:** High for orchestrator long jobs
- **DECISION:** PROTOTYPE — minimal request/response gate in orchestrator if product need exists
- **Confidence:** LOW–MEDIUM (need product requirement)

### EXTERNAL_MECHANISM: AutoGen Core distributed actor runtime
- **PROBLEM_SOLVED:** Cross-process / distributed agents via messaging
- **OUR_CURRENT_MECHANISM:** Local Cursor Agent + Task subagents
- **EQUIVALENCE:** NONE for distributed actor fabric
- **GAP:** N/A for current MegaBrain host
- **TRADE_OFF:** Power vs operational burden; MAF itself focuses single-process today (migration guide: distributed planned)
- **EVIDENCE:** DOCUMENTED
- **APPLICABILITY:** Low for Cursor-hosted Agent System
- **DECISION:** REJECT (for MegaBrain host) — note as pattern for other runtimes only
- **Confidence:** HIGH

### EXTERNAL_MECHANISM: Default multi-turn tool loop (vs AutoGen single-turn default)
- **PROBLEM_SOLVED:** Agent keeps calling tools until final answer
- **OUR_CURRENT_MECHANISM:** Agent/Capability loops via Cursor + skill instructions; policy bounds UNKNOWN/PARTIAL
- **EQUIVALENCE:** PARTIAL
- **GAP:** Explicit max-iteration / termination contracts at runtime layer
- **TRADE_OFF:** Autonomy vs runaway cost
- **EVIDENCE:** DOCUMENTED migration guide difference
- **APPLICABILITY:** Enforce bounds in Policy/Orchestrator
- **DECISION:** ADAPT — explicit termination budgets
- **Confidence:** HIGH on external fact; MEDIUM on our gap depth

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Typed Workflow graphs | ADAPT | MEDIUM |
| Orchestration pattern library | ADAPT (patterns) / DEFER (Magentic product) | MEDIUM |
| AgentSession + context providers | ADAPT | MEDIUM |
| Middleware layers | ALREADY_PRESENT (+ ADAPT approval) | MEDIUM |
| HITL request/response + checkpoints | PROTOTYPE | LOW–MEDIUM |
| AutoGen distributed Core | REJECT (MegaBrain host) | HIGH |
| Multi-turn tool loop bounds | ADAPT | MEDIUM |
| Adopt MAF SDK into Agent System | REJECT | HIGH |
| AutoGen as ongoing dependency | REJECT (maintenance; use as historical evidence only) | HIGH |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

Notable **CONFLICT:**

```text
CONFLICT:
  claim: Provider support for Anthropic / Ollama in MAF Python
  source_a: Overview — lists Anthropic, Ollama among supported agents
  source_b: Migration guide client table — Anthropic/Ollama marked Planned
  difference: Supported vs planned
  resolution: UNRESOLVED — prefer verifying package/docs per language/version; do not assert both
```

Release maturity wording: AutoGen README claims MAF “production-ready / 1.0”; Go zone is public preview; some tools marked preview/experimental. Treat maturity as **version- and language-specific UNKNOWN** without release notes audit.

---

## 9. Sources (primary)

1. https://learn.microsoft.com/en-us/agent-framework/overview/
2. https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/
3. https://learn.microsoft.com/en-us/agent-framework/workflows/
4. https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop
5. https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff
6. https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic
7. https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/group-chat
8. https://learn.microsoft.com/en-us/agent-framework/agents/conversations/session
9. https://learn.microsoft.com/en-us/agent-framework/agents/conversations/context-providers
10. https://learn.microsoft.com/en-us/agent-framework/agents/tools/
11. https://learn.microsoft.com/en-us/agent-framework/agents/agent-pipeline
12. https://learn.microsoft.com/en-us/agent-framework/concepts/agents/middleware/
13. https://github.com/microsoft/agent-framework (README)
14. https://github.com/microsoft/autogen (README)
15. https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/index.html
16. Baseline: `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`

---

## 10. Handoff

- **Para `agent-authoring`:** Consider termination budgets, handoff-vs-tool semantics, and HITL pause patterns as *guidance* — do not add MAF dependency.
- **Para `architect` / ADR:** Optional ADR on “workflow request/response + checkpoint” if long-running orchestrator jobs become a product requirement.
- **Não implementado nesta skill.**

Wiki: n/a (OFFICIAL_EXTERNAL TARGET_RESEARCH; no Agent System code edits).
