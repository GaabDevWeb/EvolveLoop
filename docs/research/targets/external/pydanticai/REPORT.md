# Target Report — `pydanticai`

| Campo | Valor |
|-------|-------|
| Target | Pydantic AI (PydanticAI) |
| Category | SDK |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | PyPI `pydantic-ai==2.45.0` (2026-09-18); docs live at `pydantic.dev/docs/ai/`; GitHub `pydantic/pydantic-ai` (`main`, MIT) |
| Access limitations | No package install; no local clone; no runtime execution. Firecrawl MCP unauthorized. Evidence from official docs (WebFetch + docs search API), Context7 (`/pydantic/pydantic-ai`), GitHub/PyPI metadata, README raw. Internals of node scheduling / durability serialization beyond docs = UNKNOWN. |
| Date | 2026-09-18 |
| Wiki grounding | n/a (OFFICIAL_EXTERNAL; comparison via `OUR-SYSTEM-BASELINE.md` only) |
| Baseline | `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md` |

## 1. What exists?

**DOCUMENTED** — Pydantic AI is an open-source **Python agent SDK** from the Pydantic team: a typed agent loop (`Agent`), model-agnostic providers, function tools / toolsets / MCP / native tools, structured `output_type` validated by Pydantic, dependency injection via `deps_type` + `RunContext`, optional graph orchestration (`pydantic-graph`), OpenTelemetry instrumentation (first-party Logfire), durable execution adapters (Temporal, DBOS, Prefect, Restate, AWS Lambda durable; plus external Kitaru/Airflow), and a separate **Harness** package (`pydantic-ai-harness`) for coding-agent capabilities.

Canonical positioning (README + docs): “typed end to end”, FastAPI-like DX, same agent runnable behind CLI / web / realtime voice / durable queue.

**Not claimed here as measured:** production reliability vs peers; token efficiency; “best framework”. Stars (~20k) are adoption signal only — separated in §5.

## 2. Architecture map

```text
                    ┌─────────────────────────────────────────┐
                    │  Agent[DepsT, OutputT]                  │
                    │  instructions · tools/toolsets          │
                    │  output_type · deps_type · capabilities │
                    │  model settings · retries               │
                    └──────────────────┬──────────────────────┘
                                       │
              run / run_sync / stream / iter / realtime
                                       │
                                       ▼
         ┌────────────────────────────────────────────────────┐
         │  pydantic-graph agent run (internal)               │
         │  UserPromptNode → ModelRequestNode → CallToolsNode │
         │  … (retry / validation loops) → End[FinalResult]   │
         └───────────────┬────────────────────┬───────────────┘
                         │                    │
                         ▼                    ▼
              ┌──────────────────┐   ┌────────────────────────┐
              │ Model + Provider │   │ Toolsets / Capabilities│
              │ + ModelProfile   │   │ MCP · native · deferred│
              └──────────────────┘   └────────────────────────┘
                         │                    │
                         ▼                    ▼
              ┌──────────────────┐   ┌────────────────────────┐
              │ Structured output│   │ RunContext[DepsT]      │
              │ validators /     │   │ deps · usage · retry   │
              │ ModelRetry       │   │ enqueue · emit         │
              └──────────────────┘   └────────────────────────┘
                         │
                         ▼
              AgentRunResult[OutputT] (+ messages, usage)
                         │
         optional: OTel/Logfire · DurableExec · Evals · Harness
```

**DOCUMENTED** components of an Agent: instructions, function tools/toolsets, structured output type, dependency type constraint, LLM model, model settings, capabilities (reusable bundles of tools/hooks/instructions/settings).

**Separate product surface (stack):** Pydantic Validation · Pydantic AI · Logfire · AI Gateway · Pydantic Evals · Pydantic Graph · genai-prices · Harness.

## 3. Execution flow

```text
Input (user prompt + deps + optional message_history / usage_limits)
  → build agent graph (prompts, tools, output schemas)
  → UserPromptNode / instruction assembly (incl. dynamic system prompts via RunContext)
  → ModelRequestNode (Model + Provider + Profile; optional before_model_request hooks)
  → ModelResponse (text / tool calls / output-tool calls)
  → CallToolsNode: validate tool args (Pydantic) → execute tools → ToolReturn parts
       OR validate structured output / output function → optional output_validator
       OR ModelRetry / validation failure → RetryPromptPart (tool vs output budgets)
  → loop until End(FinalResult[OutputT]) or UnexpectedModelBehavior / usage limit
  → Final Output: AgentRunResult.output (typed) + all_messages + RunUsage
```

**DOCUMENTED** via Agents “Running Agents” + `Agent.iter` node list (UserPromptNode → ModelRequestNode → CallToolsNode → End). Streaming variants (`run_stream`, `run_stream_events`) change when the run is considered finished (`end_strategy` matters for dangling tool calls).

## 4. Mechanisms (lens-aligned)

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| PAI-AGENT | Need a reusable LLM “conversation unit” with typed I/O | `Agent[DepsT, OutputT]` as FastAPI-like app object; run/stream/iter/realtime | DOCUMENTED | HIGH for Python apps |
| PAI-DEPS | Inject DB/HTTP/user context into prompts/tools/validators without globals | `deps_type` + `RunContext[Deps].deps`; `override()` for tests | DOCUMENTED | HIGH |
| PAI-TOOLS | Let model call typed side effects / retrieval | `@tool` / `@tool_plain` / `Tool` / toolsets; schema from signature+docstring (griffe); args validated before call | DOCUMENTED | HIGH |
| PAI-OUTPUT | Force validated final value | `output_type` (models, unions, output functions); default tool-output mode; Native/Prompted markers | DOCUMENTED | HIGH |
| PAI-VALIDATE | Recover from bad model I/O | Pydantic validation + `ModelRetry` + separate tool/output retry budgets + `output_validator` | DOCUMENTED | HIGH |
| PAI-MODEL | Swap vendors without rewriting agent | `provider:model` string or Model/Provider/Profile; FallbackModel; ConcurrencyLimitedModel; TestModel/FunctionModel | DOCUMENTED | HIGH |
| PAI-TOOL-EXEC | Execute/orchestrate tool results in the loop | CallToolsNode; combined toolset; MCP; native tools; deferred/HITL tools; max_concurrency / tool_timeout | DOCUMENTED | HIGH |
| PAI-GRAPH | Explicit FSM/workflows beyond agent loop | `pydantic-graph` (standalone); agent loop itself is a graph; `Agent.iter`/`next` for control | DOCUMENTED | MED–HIGH (advanced) |
| PAI-CONTEXT | Runtime context + history + progressive capability load | RunContext fields; message_history; Capability `defer_loading`; enqueue/emit mid-run | DOCUMENTED | HIGH |
| PAI-DURABLE | Survive restarts / long runs / HITL | TemporalDurability / DBOS / Prefect / Restate / Lambda (+ Kitaru/Airflow); activities for model/tool | DOCUMENTED | HIGH when ops need it |
| PAI-OTEL | Observe model+tool spans/cost | `logfire.instrument_pydantic_ai()`; OTel-native; genai-prices | DOCUMENTED | HIGH |
| PAI-TYPES | Catch wiring errors at write-time | Generics + Pydantic schemas; IDE/type-checker alignment on tools/output | DOCUMENTED | HIGH (Python) |
| PAI-CAPABILITY | Package reusable agent behavior | `Capability` / `capabilities=[…]` (tools+instructions+hooks); Harness compositions | DOCUMENTED | HIGH |
| PAI-EVALS | Measure agent behavior | Pydantic Evals (OSS; Logfire UI optional) | DOCUMENTED | MED (product-adjacent) |

## 5. Adoption analysis (separated — not merit)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Strong typing + validation story; model-agnostic; graph optional; durable first-party | OPINION on “fit”, DOCUMENTED features |
| Product | Part of commercial Logfire/Gateway stack; Harness extends coding agents | DOCUMENTED |
| Distribution | PyPI `pydantic-ai`; MIT; docs at pydantic.dev; ~20k GitHub stars | MEASURED (stars/version) / DOCUMENTED |
| Ecosystem | MCP, Temporal, DBOS, Prefect, AG-UI/Vercel AI streams, ACP | DOCUMENTED |
| Timing | Active `main` push same day as research; v2.x line | MEASURED (API metadata) |
| Community / DX | FastAPI analogy; llms.txt + docs search API for agents; official skills | DOCUMENTED |
| Lock-in | Core OSS portable; Logfire/Gateway are optional commercial; durability binds to chosen engine | INFERRED (from docs product split) |

**Prohibited inference:** popularity ≠ architectural superiority for MegaBrain.

## 6. Comparison with MegaBrain (per mechanism)

### PAI-AGENT — Agent container
```text
EXTERNAL_MECHANISM   Agent[Deps, Output] reusable run loop
PROBLEM_SOLVED       Bound instructions+tools+model+typed result
OUR_CURRENT_MECHANISM Agent Contracts / PDA roles + Orchestrator + skills
EQUIVALENCE          PARTIAL
GAP                  MegaBrain agents are instruction packages + runtime orchestration, not a Python generic Agent class
TRADE_OFF            SDK embeds loop in-app; MegaBrain separates Agent decide vs Capability vs Runtime
EVIDENCE             DOCUMENTED (PAI agents.md) · OBSERVED baseline inventory
APPLICABILITY        Conceptual only — not a drop-in
DECISION             REJECT (as runtime replacement) · ALREADY_PRESENT (role of “agent unit” at conceptual level)
```

### PAI-DEPS — Typed dependency injection
```text
EXTERNAL_MECHANISM   deps_type + RunContext.deps (+ override for tests)
PROBLEM_SOLVED       Type-safe services in tools/prompts/validators
OUR_CURRENT_MECHANISM Provider Registry + capability inputs; no single RunContext[Deps] generic
EQUIVALENCE          PARTIAL
GAP                  No end-to-end typed DI object threaded through skill/tool execution
TRADE_OFF            App DI vs registry manifests
EVIDENCE             DOCUMENTED dependencies.md · baseline Provider Registry IMPLEMENTED
APPLICABILITY        Pattern for typed run context in orchestrator — not copy dataclass API
DECISION             ADAPT
```

### PAI-TOOLS / PAI-TOOL-EXEC — Typed tools + execution
```text
EXTERNAL_MECHANISM   Signature→JSON Schema tools; validated args; toolsets/MCP/native/deferred
PROBLEM_SOLVED       Safe, typed tool surface for LLM
OUR_CURRENT_MECHANISM Capability Registry + Provider implementations + MCP (ecosystem)
EQUIVALENCE          SUBSTANTIAL (registry role) / PARTIAL (schema-from-signature + ModelRetry)
GAP                  Automatic schema+docstring extraction + per-tool retry budgets less formalized
TRADE_OFF            Python reflection DX vs Cursor skill YAML/contracts
EVIDENCE             DOCUMENTED tools.md · baseline Capability Registry
APPLICABILITY        ADAPT validation/retry + schema discipline; REJECT parallel “Tool Registry”
DECISION             ADAPT · ALREADY_PRESENT (capability/tool registration)
```

### PAI-OUTPUT + PAI-VALIDATE — Structured output + validation loops
```text
EXTERNAL_MECHANISM   output_type + Pydantic validate + output_validator + ModelRetry budgets
PROBLEM_SOLVED       Guaranteed typed final value; self-correction
OUR_CURRENT_MECHANISM Evidence Bus gates + contracts/schemas; Policy; evals PARTIAL
EQUIVALENCE          PARTIAL
GAP                  LLM I/O retry-as-prompt is stronger/productized in PAI; Evidence Bus is artifact gates not model-retry loop
TRADE_OFF            Tight Pydantic coupling vs MegaBrain multi-language/skill world
EVIDENCE             DOCUMENTED output.md + retries.md · baseline Evidence Bus
APPLICABILITY        ADAPT ModelRetry-style feedback into orchestration; keep Evidence Bus
DECISION             ADAPT · REJECT second validation bus
```

### PAI-MODEL — Model / Provider / Profile
```text
EXTERNAL_MECHANISM   Model+Provider+Profile; string swap; FallbackModel
PROBLEM_SOLVED       Vendor portability + capability flags
OUR_CURRENT_MECHANISM Provider Registry (IMPLEMENTED)
EQUIVALENCE          SUBSTANTIAL
GAP                  Explicit ModelProfile capability flags (supports_tools, native tools, context_window) may be richer
TRADE_OFF            Python SDK vs our provider manifests
EVIDENCE             DOCUMENTED models overview · baseline Provider Registry
APPLICABILITY        ADAPT profile/capability flags into provider manifests if missing
DECISION             ALREADY_PRESENT · ADAPT (profile flags)
```

### PAI-GRAPH — Typed graphs / agent.iter
```text
EXTERNAL_MECHANISM   pydantic-graph + agent graph nodes; GraphBuilder; Agent.iter
PROBLEM_SOLVED       Explicit FSM and node-level control
OUR_CURRENT_MECHANISM Capability IR `plan.ir.yaml` / Task Graph (IMPLEMENTED)
EQUIVALENCE          PARTIAL
GAP                  Node-level async iteration API & type-driven edges are different from YAML IR
TRADE_OFF            Code-defined typed edges vs declarative IR
EVIDENCE             DOCUMENTED graph.md + agents running · baseline Task Graph
APPLICABILITY        Do not duplicate LangGraph-style second graph runtime; learn from iter/debug surfaces
DECISION             ALREADY_PRESENT (task graph role) · DEFER (typed-edge graph DSL)
```

### PAI-CONTEXT — RunContext / history / deferred capabilities
```text
EXTERNAL_MECHANISM   RunContext; message_history; Capability defer_loading (skill-like)
PROBLEM_SOLVED       Context injection + progressive tool loading
OUR_CURRENT_MECHANISM Skills + Knowledge/RAG PARTIAL + episodic mem PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Progressive capability load resembles skills; working memory still PARTIAL on our side
TRADE_OFF            In-loop context vs wiki/RAG grounding
EVIDENCE             DOCUMENTED README bank example + agents.md · baseline Skills/Memory
APPLICABILITY        ADAPT deferred capability loading patterns to skill loading
DECISION             ADAPT · ALREADY_PRESENT (skills as instruction packages)
```

### PAI-DURABLE — Durable execution
```text
EXTERNAL_MECHANISM   First-party Temporal/DBOS/Prefect/Restate/Lambda durability capabilities
PROBLEM_SOLVED       Crash-safe long agent runs (not chat storage)
OUR_CURRENT_MECHANISM Persistence jobs/checkpoints PARTIAL
EQUIVALENCE          NONE–PARTIAL
GAP                  No Temporal-class durable agent activities documented in baseline
TRADE_OFF            Ops complexity vs reliability
EVIDENCE             DOCUMENTED durable_execution overview · baseline Persistence PARTIAL
APPLICABILITY        Relevant if MegaBrain runs long autonomous jobs; premature for Cursor-session agents
DECISION             DEFER · PROTOTYPE only if product needs multi-hour agent jobs
```

### PAI-OTEL — Observability
```text
EXTERNAL_MECHANISM   OTel spans for model+tool; Logfire one-liner; cost via genai-prices
PROBLEM_SOLVED       Trace agent loops end-to-end
OUR_CURRENT_MECHANISM summarizeExecutionTrace + docs PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Full OTel/genai semantic conventions not equivalent to Logfire depth
TRADE_OFF            SaaS Logfire vs portable OTel
EVIDENCE             DOCUMENTED logfire integration · baseline Telemetry PARTIAL
APPLICABILITY        ADAPT OTel span taxonomy for model/tool/capability; REJECT mandatory Logfire
DECISION             ADAPT
```

### PAI-TYPES — End-to-end type safety
```text
EXTERNAL_MECHANISM   Generics + runtime Pydantic = write-time + run-time agreement
PROBLEM_SOLVED       Catch tool/output mismatches early
OUR_CURRENT_MECHANISM Agent Contracts / schemas / GATE_BUNDLE DOCUMENTED+IMPLEMENTED
EQUIVALENCE          PARTIAL
GAP                  Python generics story doesn’t map 1:1 to skill markdown world
TRADE_OFF            Language-native types vs portable contracts
EVIDENCE             DOCUMENTED · baseline Agent Contracts
APPLICABILITY        Strengthen JSON Schema contracts for tools/outputs; don’t require Python
DECISION             ADAPT
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Agent as Python SDK runtime | REJECT | HIGH |
| Conceptual agent unit | ALREADY_PRESENT | MEDIUM |
| Typed DI / RunContext | ADAPT | HIGH |
| Tool registration | ALREADY_PRESENT | HIGH |
| Schema-from-signature + ModelRetry budgets | ADAPT | HIGH |
| Structured output + validators | ADAPT | HIGH |
| Second Evidence/Validation bus | REJECT | HIGH |
| Model Provider abstraction | ALREADY_PRESENT | HIGH |
| ModelProfile capability flags | ADAPT | MEDIUM |
| Task/plan graph role | ALREADY_PRESENT | MEDIUM |
| Typed-edge graph DSL (pydantic-graph style) | DEFER | MEDIUM |
| Deferred capabilities / progressive load | ADAPT | MEDIUM |
| Durable execution (Temporal et al.) | DEFER | HIGH |
| OTel model/tool tracing | ADAPT | HIGH |
| Logfire as required backend | REJECT | HIGH |
| Whole-framework ranking / “copy PAI” | REJECT | HIGH |

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

**CONFLICT (docs URLs):** Historical host `ai.pydantic.dev` still resolves; canonical docs now under `https://pydantic.dev/docs/ai/`. Same product; prefer pydantic.dev links. Resolution: prefer_primary (`pydantic.dev/docs/ai`).

**CONFLICT (scope):** README markets Harness coding agent heavily; this TARGET_RESEARCH focuses on **Pydantic AI core** mechanisms per lens — Harness noted but not fully reverse-engineered. Resolution: scope limited; Harness = follow-up UNKNOWN depth.

## 9. Sources

1. https://pydantic.dev/docs/ai/ — docs home / overview  
2. https://pydantic.dev/docs/ai/core-concepts/agent/ — Agents  
3. https://pydantic.dev/docs/ai/core-concepts/dependencies/ — Dependencies  
4. https://pydantic.dev/docs/ai/tools-toolsets/tools/ — Function tools  
5. https://pydantic.dev/docs/ai/core-concepts/output/ — Output  
6. https://pydantic.dev/docs/ai/models/overview/ — Models  
7. https://pydantic.dev/docs/ai/graph/graph/ — Graphs  
8. https://pydantic.dev/docs/ai/integrations/logfire/ — Observability  
9. https://pydantic.dev/docs/ai/capabilities/durable_execution/overview/ — Durable execution  
10. https://github.com/pydantic/pydantic-ai/blob/main/README.md  
11. https://pypi.org/project/pydantic-ai/ (2.45.0)  
12. https://api.github.com/repos/pydantic/pydantic-ai (stars, license MIT)  
13. https://pydantic.dev/docs/api/search (library=ai)  
14. Context7 `/pydantic/pydantic-ai` (dependencies, retries, durable snippets)  
15. Baseline: `research/OUR-SYSTEM-BASELINE.md`

## 10. Handoff

- Para `agent-authoring`: considerar ADAPT de (1) retry budgets tool vs output com feedback ao modelo, (2) deferred capability loading, (3) ModelProfile-like flags em providers, (4) OTel span names para model/tool — **sem** novo registry paralelo.
- Para `architect` / `adr`: DEFER durable execution até haver requisito de jobs multi-hora; REJECT substituição do Orchestrator por Pydantic AI.
- **Não implementado nesta skill.**
