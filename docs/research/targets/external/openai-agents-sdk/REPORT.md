# Target Report — `openai-agents-sdk`

| Campo | Valor |
|-------|-------|
| Target | OpenAI Agents SDK (Python + TypeScript) |
| Category | SDK |
| Mode | TARGET_RESEARCH |
| source_type | OFFICIAL_EXTERNAL |
| Versions examined | Docs live (openai.github.io) + GitHub `openai/openai-agents-python` **v0.22.3** (latest release 2026-09-17); TS docs at `openai.github.io/openai-agents-js` (parity claimed, not line-audited) |
| Access limitations | Observational only: docs + public source via HTTP. No package install, no runtime execution, no private OpenAI service internals. Sandbox/hosted backends and Traces dashboard backend = UNKNOWN beyond docs. |
| Date | 2026-09-18 |
| Baseline | `research/OUR-SYSTEM-BASELINE.md` (MegaBrain / CursorSKILLS) |

## 1. What exists?

The OpenAI Agents SDK is an official, open-source (MIT) multi-language agent **runtime harness** that wraps model calls (default: OpenAI Responses API) in a small set of primitives:

- **Agents** — LLM + instructions + tools + optional handoffs/guardrails/structured output  
- **Runner** — agent loop (model → final | handoff | tools → repeat) with `max_turns` (default **10**, `OBSERVED` in `run_config.py`)  
- **Tools** — function tools, hosted OpenAI tools, local shell/computer/apply_patch, agents-as-tools, MCP, experimental Codex tool  
- **Handoffs** — peer control transfer (tool-shaped `transfer_to_*`) vs **agents-as-tools** (manager retains control)  
- **Guardrails** — input / output / tool tripwires with parallel vs blocking input modes  
- **Sessions** — conversation history persistence across runs (SQLite, OpenAI Conversations, Redis, SQLAlchemy, encrypted, Advanced SQLite, …)  
- **HITL** — `needs_approval` → `interruptions` → serializable `RunState` approve/reject/resume  
- **Tracing** — default spans to OpenAI Traces dashboard; pluggable processors  
- **Context** — typed local DI via `RunContextWrapper[T]` (not sent to the LLM)  
- **Sandbox agents (beta)** — `SandboxAgent` + `Manifest` + capabilities + sandbox clients (Unix-local, Docker, hosted)  
- **Realtime / voice** — separate surfaces (documented; out of primary MegaBrain coding-agent lens unless noted)

Predecessor: Swarm (experimental). Positioning: “few primitives, Python/TS-first orchestration.” Distinguishes SDK (app-owned loop) vs Agents API (OpenAI-managed harness) vs raw Responses API.

**Epistemic:** feature list above = `DOCUMENTED` (official docs) + loop/`DEFAULT_MAX_TURNS` = `OBSERVED` (public source). Closed service behavior of hosted tools/sandbox providers = `UNKNOWN`.

## 2. Architecture map

```text
                    ┌─────────────────────────────────────────┐
                    │ Application (tools, policy, storage)    │
                    └───────────────────┬─────────────────────┘
                                        │
   input (str | items | RunState)       │ context=T (local DI)
   session? conversation_id?            │
                    ┌───────────────────▼─────────────────────┐
                    │ Runner.run / run_sync / run_streamed    │
                    │  + RunConfig (tracing, filters, sandbox)│
                    └───────────────────┬─────────────────────┘
          ┌─────────────────────────────┼─────────────────────────────┐
          ▼                             ▼                             ▼
   input_guardrails              Agent (current)                 Session I/O
   (first agent only)            instructions/tools/MCP          get/append items
                                 handoffs / as_tool
          │                             │
          │                    ┌────────▼────────┐
          │                    │ Model (Responses │
          │                    │  default / other)│
          │                    └────────┬────────┘
          │           final?  handoff?  │  tool calls?
          │              │        │     │      │
          │              │        │     │      ├── FunctionTool (+ tool guardrails,
          │              │        │     │      │   needs_approval → interrupt)
          │              │        │     │      ├── Hosted tools / HostedMCP
          │              │        │     │      ├── Shell/ApplyPatch/Computer
          │              │        │     │      └── Agent.as_tool (nested run)
          │              │        ▼     │
          │              │   switch agent│
          │              │   (+ input_filter / nest history)
          │              ▼              ▼
          │         output_guardrails   loop until final / max_turns / interrupt
          │         (last agent only)
          ▼
   RunResult (+ interruptions, new_items, usage)
   Trace spans → BatchTraceProcessor → OpenAI (or custom)
   Optional Sandbox session (workspace ≠ conversational Session)
```

**Design principle (`DOCUMENTED`):** enough features to be useful; few primitives; customize hooks/`RunConfig` rather than new framework layers.

## 3. Execution flow (documented + observed)

```text
Input → [Session prepend history] → [input_guardrails*] → Model call (turn)
  → Interpret output:
       final output (+ type) → [output_guardrails*] → Persist session → Result
       handoff → filter/map history → set current agent → Next Decision
       tool calls → [approval?] → [tool input guardrails] → Execute
                 → [tool output guardrails] → append results → Next Decision
  → max_turns exceeded → MaxTurnsExceeded
  → interruption → RunState serialize → human/programmatic decision → resume

* Input guardrails: first agent only. Output guardrails: final-producing agent only.
```

Source: Running agents docs + `Runner.run` docstring in `src/agents/run.py` (`OBSERVED`).

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M01-agent-loop | Own multi-step tool/handoff loop without reinventing | `Runner` loop + `max_turns` | DOCUMENTED + OBSERVED | CONDITIONALLY_USEFUL |
| M02-function-tools | Expose app actions to LLM with schema validation | `@tool` / `function_tool`, Pydantic/TypeAdapter schemas, `tool_use_behavior` | DOCUMENTED | USEFUL |
| M03-hosted-tools | Offload search/code/image/MCP to OpenAI servers | `WebSearchTool`, `FileSearchTool`, `CodeInterpreterTool`, `HostedMCPTool`, … | DOCUMENTED | CONDITIONALLY_USEFUL |
| M04-agents-as-tools | Specialize without losing manager control | `Agent.as_tool(...)` | DOCUMENTED | USEFUL |
| M05-handoffs | Route conversation to specialist that owns turn | `handoffs` / `handoff()`, tool-shaped transfer, `input_filter` | DOCUMENTED | CONDITIONALLY_USEFUL |
| M06-guardrails | Validate input/output/tool I/O; fail-fast / cost control | input/output/tool guardrails + tripwire exceptions; parallel vs blocking | DOCUMENTED | USEFUL |
| M07-sessions | Persist working conversation across runs | Session ABC + SQLite/OpenAI/Redis/…; merge callback | DOCUMENTED | USEFUL |
| M08-context-di | Share app state/deps without sending to LLM | `RunContextWrapper[T]`, `ToolContext` | DOCUMENTED | USEFUL |
| M09-hitl-runstate | Pause for human approval; durable resume | `needs_approval`, `interruptions`, `RunState` ser/deser | DOCUMENTED + OBSERVED (run_state.py snippets via docs/context7) | USEFUL |
| M10-tracing | Debug/monitor agent workflows | Default spans + TraceProvider/BatchTraceProcessor; custom processors | DOCUMENTED | USEFUL |
| M11-mcp | Use MCP tool servers alongside function tools | `mcp_servers`, HostedMCP, filters, MCP tool guardrails/approvals | DOCUMENTED | USEFUL |
| M12-sandbox | Isolated mutable workspace + resume | `SandboxAgent`, Manifest, capabilities, clients (beta) | DOCUMENTED | CONDITIONALLY_USEFUL |
| M13-hooks | Observe/extend lifecycle without forking runner | `RunHooks` / `AgentHooks` | DOCUMENTED | USEFUL |
| M14-structured-output | Typed final outputs | `output_type` → structured outputs | DOCUMENTED | USEFUL |
| M15-tool-search-ptc | Large tool surfaces / multi-tool programs | `ToolSearchTool`, `ProgrammaticToolCallingTool` (Responses-specific) | DOCUMENTED | CONDITIONALLY_USEFUL |
| M16-server-continuation | Server-managed conversation continuity | `conversation_id` / `previous_response_id` (mutually exclusive w/ session) | DOCUMENTED | CONDITIONALLY_USEFUL |

## 5. Adoption analysis (separated — not merit ranking)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Thin primitives over Responses; rich HITL/guardrail/session/sandbox surface; Python+TS | DOCUMENTED |
| Product | OpenAI-aligned DX; Traces/evals/fine-tune suite coupling | DOCUMENTED / INFERRED (product bundling) |
| Distribution | PyPI `openai-agents`, npm `@openai/agents`; GitHub ~29.5k★ (2026-09-18) | OBSERVED (GitHub API) |
| Ecosystem | Extensions (Redis/SQLAlchemy sessions), many sandbox providers, community trace exporters | DOCUMENTED |
| Timing | Successor to Swarm; active releases (v0.22.3) | OBSERVED |
| Community / DX | Official docs hub; examples tree; dual-language parity messaging | DOCUMENTED |
| Lock-in | Default tracing + hosted tools + Conversations session bias OpenAI; non-OpenAI models supported with caveats | DOCUMENTED |

**Forbidden inference avoided:** popularity ≠ technical superiority for MegaBrain.

## 6. Comparison with MegaBrain (per mechanism)

### M01 Agent loop / Runner

```text
EXTERNAL_MECHANISM   Runner agent loop (model→tools/handoffs→repeat, max_turns)
PROBLEM_SOLVED       Reliable multi-step tool use without app rewriting the loop
OUR_CURRENT_MECHANISM Orchestrator/Runtime + orquestrar + Capability IR / Task Graph
EQUIVALENCE          PARTIAL
GAP                  MegaBrain orchestrates Capabilities/PDA roles; not a Responses-shaped LLM tool loop as primary runtime
TRADE_OFF            SDK loop is LLM-centric; MegaBrain is contract/capability-centric
EVIDENCE             DOCUMENTED SDK; baseline Orchestrator IMPLEMENTED_TESTED
APPLICABILITY        Idea-level only — do not replace Orchestrator with Runner
DECISION             ALREADY_PRESENT (orchestration role) / DEFER (literal Runner adoption)
Confidence           HIGH
```

### M02 Function tools + schema validation

```text
EXTERNAL_MECHANISM   FunctionTool + auto schema + Pydantic validation
PROBLEM_SOLVED       Safe, typed tool invocation from model
OUR_CURRENT_MECHANISM Capability Registry + Provider + contracts/schemas
EQUIVALENCE          PARTIAL
GAP                  Different abstraction (LLM tools vs Capability/Provider); both validate I/O
TRADE_OFF            SDK couples tools to model tool-calling; MegaBrain separates decide/do/implement
EVIDENCE             DOCUMENTED; baseline Capability Registry IMPLEMENTED_TESTED
APPLICABILITY        ADAPT validation/lifecycle ideas into Capability contracts — not a second tool registry
DECISION             ALREADY_PRESENT (registry+validation role) with residual ADAPT on tool-guardrail patterns
Confidence           HIGH
```

### M04 / M05 Multi-agent (as_tool vs handoff)

```text
EXTERNAL_MECHANISM   Manager-as-tools vs handoff control transfer
PROBLEM_SOLVED       Specialization without monolithic prompts
OUR_CURRENT_MECHANISM PDA multi-agent Task roles (plan/exec/gate/explore/critic/librarian)
EQUIVALENCE          PARTIAL
GAP                  PDA is role/policy gated; SDK handoffs are LLM-chosen tool transfers with history filters
TRADE_OFF            Handoffs risk over-routing; as_tool keeps control (SDK docs warn when to use which)
EVIDENCE             DOCUMENTED multi_agent + handoffs; baseline Multi-agent PDA IMPLEMENTED
APPLICABILITY        Study history-filter / nest_handoff_history as patterns for PDA handoffs — do not add parallel handoff framework
DECISION             ALREADY_PRESENT (multi-agent specialization) + ADAPT (history filtering / control-retention clarity)
Confidence           MEDIUM
```

### M06 Guardrails

```text
EXTERNAL_MECHANISM   Input/output/tool guardrails + tripwires; blocking vs parallel
PROBLEM_SOLVED       Safety/cost/relevance checks colocated with agent/tool
OUR_CURRENT_MECHANISM Policy Engine (authorize) + Evidence gates
EQUIVALENCE          PARTIAL
GAP                  Policy ≠ I/O validation tripwires; MegaBrain Evidence proves; SDK tripwires halt
TRADE_OFF            Parallel guardrails save latency but may waste tokens/side effects (documented)
EVIDENCE             DOCUMENTED guardrails; baseline Policy DOCUMENTED+IMPLEMENTED
APPLICABILITY        ADAPT tripwire semantics / tool-level checks beside Policy — avoid duplicating Policy Engine
DECISION             ADAPT
Confidence           HIGH
```

### M07 Sessions

```text
EXTERNAL_MECHANISM   Automatic conversation history session stores
PROBLEM_SOLVED       Multi-turn chat memory without manual to_input_list
OUR_CURRENT_MECHANISM gaabwiki-mem / .ai/sessions (episodic continuity) — PARTIAL; not agent working memory
EQUIVALENCE          PARTIAL / NONE for true agent working-memory session
GAP                  MegaBrain lacks first-class agent-run conversation session like SQLiteSession
TRADE_OFF            Full-history sessions → context explosion; SDK offers session_input_callback compaction hooks
EVIDENCE             DOCUMENTED sessions; baseline Memory PARTIAL
APPLICABILITY        PROTOTYPE bounded session store for agent loops if product needs chat continuity
DECISION             PROTOTYPE
Confidence           MEDIUM
```

### M08 Context DI

```text
EXTERNAL_MECHANISM   RunContextWrapper local context (not LLM-visible)
PROBLEM_SOLVED       DI for tools/hooks without prompt pollution
OUR_CURRENT_MECHANISM Orchestrator job context / skill context — UNKNOWN exact surface vs typed DI
EQUIVALENCE          UNKNOWN → treat as PARTIAL pending CursorSKILLS audit
GAP                  Clear typed run-scoped DI may be thinner than SDK
TRADE_OFF            Serialized RunState persists context — secret leakage risk (documented)
EVIDENCE             DOCUMENTED context; baseline GAP note
APPLICABILITY        ADAPT typed run-context wrapper pattern if audit confirms gap
DECISION             DEFER (needs MegaBrain audit) 
Confidence           LOW–MEDIUM
```

### M09 HITL / RunState

```text
EXTERNAL_MECHANISM   needs_approval + interruptions + durable RunState
PROBLEM_SOLVED       Human gate on sensitive tool calls across handoffs/nested tools
OUR_CURRENT_MECHANISM Policy authorize + Cursor hooks — PARTIAL; durable pause/resume UNKNOWN
EQUIVALENCE          PARTIAL
GAP                  Serializable mid-run approval state is a strong gap candidate
TRADE_OFF            Complexity of versioning agent defs with stored state (SDK documents versioning advice)
EVIDENCE             DOCUMENTED HITL; baseline Policy/Hooks PARTIAL; Sandbox/HITL durable = UNKNOWN
APPLICABILITY        PROTOTYPE RunState-like interrupt/approve for high-impact Capabilities
DECISION             PROTOTYPE
Confidence           HIGH (external) / MEDIUM (our gap)
```

### M10 Tracing / Observability

```text
EXTERNAL_MECHANISM   Built-in traces/spans (agent, generation, function, guardrail, handoff)
PROBLEM_SOLVED       End-to-end workflow visibility
OUR_CURRENT_MECHANISM summarizeExecutionTrace + Telemetry PARTIAL
EQUIVALENCE          PARTIAL
GAP                  MegaBrain tracing less span-structured than SDK default
TRADE_OFF            Default export to OpenAI; sensitive data on by default (configurable)
EVIDENCE             DOCUMENTED tracing; baseline Telemetry PARTIAL
APPLICABILITY        ADAPT span taxonomy (agent/tool/handoff/guardrail) into MegaBrain telemetry — reject OpenAI-only exporter as requirement
DECISION             ADAPT
Confidence           HIGH
```

### M11 MCP

```text
EXTERNAL_MECHANISM   First-class MCP servers + HostedMCP + filters/approvals/guardrails
PROBLEM_SOLVED       Expose MCP tools in the same agent tool surface
OUR_CURRENT_MECHANISM Cursor MCP ecosystem (workspace) — not the same as MegaBrain Orchestrator MCP registry
EQUIVALENCE          PARTIAL / UNKNOWN at Orchestrator layer
GAP                  If Orchestrator should call MCP uniformly with tool guardrails, SDK pattern is relevant
TRADE_OFF            Hosted MCP approval identity is (server_label, tool_name) — sticky approve scope
EVIDENCE             DOCUMENTED mcp; baseline UNKNOWN for orchestrator MCP
APPLICABILITY        ADAPT guardrail/approval attachment to MCP tool lists
DECISION             ADAPT (patterns) / DEFER (full HostedMCP coupling)
Confidence           MEDIUM
```

### M12 Sandbox execution

```text
EXTERNAL_MECHANISM   SandboxAgent + Manifest + client backends + snapshots (beta)
PROBLEM_SOLVED       Isolated workspace for coding/docs with resume
OUR_CURRENT_MECHANISM Sandbox UNKNOWN–PARTIAL per baseline
EQUIVALENCE          NONE–PARTIAL
GAP                  No equivalent first-class sandbox harness in MegaBrain baseline
TRADE_OFF            Unix-local is weak isolation (docs warn); Docker/hosted needed for untrusted; API still beta
EVIDENCE             DOCUMENTED sandbox_agents + clients; baseline Sandbox UNKNOWN–PARTIAL
APPLICABILITY        PROTOTYPE workspace isolation for code-exec Capabilities; REJECT adopting beta API as core dependency now
DECISION             PROTOTYPE (concept) + DEFER (SDK SandboxAgent as dependency)
Confidence           HIGH
```

### M13 Hooks

```text
EXTERNAL_MECHANISM   RunHooks / AgentHooks lifecycle callbacks
PROBLEM_SOLVED       Observability and side effects at agent/LLM/tool/handoff boundaries
OUR_CURRENT_MECHANISM Cursor hooks + MegaBrain promote-queue PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Finer LLM/tool/handoff hooks may be missing in Orchestrator
TRADE_OFF            Hook sprawl vs Evidence Bus discipline
EVIDENCE             DOCUMENTED agents hooks; baseline Hooks PARTIAL
APPLICABILITY        ADAPT lifecycle hook points aligned to Evidence/Telemetry — not parallel bus
DECISION             ADAPT
Confidence           MEDIUM
```

### M03 / M15 / M16 Hosted / Responses-specific

```text
EXTERNAL_MECHANISM   Hosted tools, tool search, PTC, server conversation IDs
PROBLEM_SOLVED       Provider-managed capabilities & continuation
OUR_CURRENT_MECHANISM Provider Registry (model providers) — not OpenAI hosted tool suite
EQUIVALENCE          NONE (product surface)
GAP                  N/A as MegaBrain core — optional provider features
TRADE_OFF            Strong OpenAI lock-in
EVIDENCE             DOCUMENTED
APPLICABILITY        Only if a Provider explicitly needs them
DECISION             DEFER / REJECT as MegaBrain core primitives
Confidence           HIGH
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Agent loop / Runner | ALREADY_PRESENT (role) — do not replace Orchestrator | HIGH |
| Function tools / schemas | ALREADY_PRESENT + residual ADAPT (tool guardrails) | HIGH |
| Agents-as-tools vs handoffs | ALREADY_PRESENT + ADAPT (history/control patterns) | MEDIUM |
| Guardrails / tripwires | ADAPT | HIGH |
| Sessions (conversation) | PROTOTYPE | MEDIUM |
| Context DI | DEFER (audit ours) | LOW–MEDIUM |
| HITL RunState | PROTOTYPE | HIGH |
| Tracing span model | ADAPT | HIGH |
| MCP integration patterns | ADAPT patterns / DEFER HostedMCP core | MEDIUM |
| SandboxAgent | PROTOTYPE concept / DEFER SDK dependency | HIGH |
| Lifecycle hooks | ADAPT | MEDIUM |
| Hosted tools / PTC / server continuation | DEFER or REJECT as core | HIGH |

**No rankings. No implementation in this skill.**

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

Notable:

- Exact MegaBrain Orchestrator surfaces for DI, durable HITL, MCP = `UNKNOWN` until code audit.  
- Sandbox beta stability and hosted provider security guarantees = `UNKNOWN`.  
- Internal OpenAI Responses/Agents API harness behavior behind hosted tools = `UNKNOWN`.  
- Full TS↔Python behavioral parity for every edge case = `UNKNOWN` (docs claim shared concepts).

## 9. Sources

### Official docs (primary)

- https://openai.github.io/openai-agents-python/  
- https://openai.github.io/openai-agents-python/agents/  
- https://openai.github.io/openai-agents-python/tools/  
- https://openai.github.io/openai-agents-python/handoffs/  
- https://openai.github.io/openai-agents-python/guardrails/  
- https://openai.github.io/openai-agents-python/tracing/  
- https://openai.github.io/openai-agents-python/sessions/  
- https://openai.github.io/openai-agents-python/mcp/  
- https://openai.github.io/openai-agents-python/human_in_the_loop/  
- https://openai.github.io/openai-agents-python/context/  
- https://openai.github.io/openai-agents-python/running_agents/  
- https://openai.github.io/openai-agents-python/multi_agent/  
- https://openai.github.io/openai-agents-python/sandbox_agents/  
- https://openai.github.io/openai-agents-python/sandbox/guide/  
- https://openai.github.io/openai-agents-python/sandbox/clients/  
- https://openai.github.io/openai-agents-js/  
- https://developers.openai.com/api/docs/guides/agents/sdk  

### Official source / releases

- https://github.com/openai/openai-agents-python (MIT; v0.22.3)  
- https://raw.githubusercontent.com/openai/openai-agents-python/v0.22.3/src/agents/run.py  
- https://raw.githubusercontent.com/openai/openai-agents-python/v0.22.3/src/agents/run_config.py (`DEFAULT_MAX_TURNS = 10`)  
- https://github.com/openai/openai-agents-js  

### Context7 (official package docs mirror)

- Library ID `/openai/openai-agents-python` (High reputation)

### Baseline

- `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`

## 10. Handoff

- Para `agent-authoring`: se `PROTOTYPE` HITL RunState ou Session — desenhar experimento mínimo **sem** importar `openai-agents` como runtime do MegaBrain.  
- Para `architect` / `adr`: decidir se tripwire-guardrails e span taxonomy entram como extensões de Policy/Telemetry vs novas abstrações (preferir extensão).  
- **Não implementado nesta skill.**
