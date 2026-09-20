# Target Report — `openhands`

| Campo | Valor |
|-------|-------|
| Target | OpenHands (All Hands / OpenHands org) |
| Category | coding-agent (+ Agent SDK + Agent Canvas control plane) |
| Mode | TARGET_RESEARCH |
| source_type | OFFICIAL_EXTERNAL |
| Versions examined | Docs site **V1** (`docs.openhands.dev`, index states Legacy V0 pages excluded from `llms.txt`); GitHub `OpenHands/software-agent-sdk` + `OpenHands/OpenHands` as of **2026-09-18** (API: SDK ~1133★, OpenHands/OpenHands ~88439★ — popularity only) |
| Access limitations | READ-ONLY; **no install / no run**; no local clone; source sampled via GitHub API + raw files + official docs. Rate-limit hit mid-session on some API listings. Runtime behavior **not MEASURED**. |
| Date | 2026-09-18 |
| Wiki | n/a (alvo OFFICIAL_EXTERNAL; fora packs Gaab mapeados) |

## 1. What exists?

OpenHands is an **AI-driven software engineering agent ecosystem**, not a single binary. Official materials (2026) separate concerns:

| Surface | Repo / package | Role (DOCUMENTED) |
|---------|----------------|-------------------|
| **Software Agent SDK** | `OpenHands/software-agent-sdk` — packages `openhands.sdk`, `openhands.tools`, `openhands.workspace`, `openhands.agent_server` | Canonical agent loop, tools, workspaces, events, security, Agent Server HTTP/WS |
| **Agent Canvas** | `OpenHands/OpenHands` (README: “self-hosted developer control center”) | UI / control plane; can drive OpenHands agent **or** ACP-compatible third-party agents (Claude Code, Codex, Gemini, …) |
| **Automation** | `OpenHands/automation` (referenced by SDK README) | Scheduling, webhooks, run history, dispatch (not deeply audited here) |
| **Legacy V0 app architecture** | Still documented under “architecture/runtime|backend” | CodeActAgent + EventStream + Docker/Local/Remote **Runtime** + Action Execution Server inside sandbox |

**DOCUMENTED (docs index):** V1 prefers the term **sandbox** over legacy **runtime**; some env knobs still named `RUNTIME` during migration.

**Identity claim (DOCUMENTED SDK overview):** SDK is source of truth for agent behavior; applications (Canvas, CLI, custom) consume SDK / Agent Server APIs.

Core coding-agent loop (V1 SDK, DOCUMENTED + OBSERVED examples):

- `Conversation` owns lifecycle/state/events
- Stateless `Agent.step()`: optional condense → LLM → parse tool calls → security/confirmation → execute tools → observations → loop
- Tools: typed Action / Observation / Executor (Terminal, FileEditor, TaskTracker, BrowserToolSet, MCP, planning/delegation presets, …)
- Workspace swap selects Local vs Remote execution without rewriting agent code

Legacy coding agent (DOCUMENTED `usage/agents`): **CodeActAgent** — unified code action space (bash + IPython via plugins); Converse vs CodeAct each turn.

## 2. Architecture map

```text
                    ┌─────────────────────────────────────────┐
                    │ Clients: Agent Canvas / CLI / Custom    │
                    └───────────────┬─────────────────────────┘
                                    │ HTTP/WS (Agent Server) or in-process SDK
                    ┌───────────────▼─────────────────────────┐
                    │ openhands.sdk                           │
                    │  Conversation ──► Agent (stateless)     │
                    │       │              │                  │
                    │       │              ├─ LLM             │
                    │       │              ├─ Skills/Context  │
                    │       │              ├─ Condenser       │
                    │       │              ├─ Security+Policy │
                    │       │              ├─ Critic (exp.)   │
                    │       │              └─ Tools (+ MCP)   │
                    │       └─ Events / StuckDetector / Persist│
                    └───────────────┬─────────────────────────┘
                                    │ tools execute in workspace env
                    ┌───────────────▼─────────────────────────┐
                    │ Workspace / Sandbox                     │
                    │  Local | Docker(+agent-server) | Remote │
                    │  API/Cloud | Process (unsafe)           │
                    │  Terminal · Files · Browser · (VS Code) │
                    └─────────────────────────────────────────┘

LEGACY V0 (still in docs; paths under openhands/runtime/...):
  Backend ──EventStream──► Agent(CodeAct)
       │                      │
       └── Runtime I/F ──REST──► ActionExecutionServer
                                  ├ BashSession
                                  ├ JupyterPlugin
                                  └ BrowserEnv
```

**Package split (DOCUMENTED):**

1. `openhands.sdk` — Agent, Conversation, LLM, tools base, events, LocalWorkspace, security, skills, condenser, MCP  
2. `openhands.tools` — concrete tools (bash/terminal, editor, browser, …)  
3. `openhands.workspace` — DockerWorkspace, RemoteAPIWorkspace, …  
4. `openhands.agent_server` — FastAPI + WebSocket multi-user server  

## 3. Execution flow (or UNKNOWN)

### V1 SDK local path (DOCUMENTED sequence)

```text
Input: user message → Conversation.send_message / run
  → Agent.step():
       pending confirmed actions? → execute → ObservationEvents → return
       condenser? → View | Condensation event
       LLM(history + tools + skills)
       context overflow? → CondensationRequest
       tool calls? → ActionEvents
         → confirmation policy? → WAITING_FOR_CONFIRMATION
         → else SecurityAnalyzer risk → execute ToolExecutor in workspace
       → ObservationEvents → loop
       message only? → MessageEvent → user
  → StuckDetector may flag repetitive patterns (default on)
  → optional Critic on FinishAction → iterative refinement
Final Output: conversation events + workspace side effects (files/commands/browser)
```

### V1 remote path (DOCUMENTED)

```text
Same Conversation API → RemoteWorkspace spawns/connects Agent Server
  → agent loop runs server-side → events via WebSocket callbacks
  → file/command ops proxied through server API
```

### Legacy V0 (DOCUMENTED backend/runtime)

```text
User → Frontend SPA → Backend → EventStream ↔ Agent
  Agent Action → Runtime.send_action_for_execution → AES REST
  → Bash / Jupyter / BrowserEnv → Observation → EventStream → Agent
```

**Exact production Canvas ↔ automation ↔ SDK wiring for every deploy mode:** PARTIAL / see UNKNOWNS.

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M01 | Host compromised by agent code | Sandbox providers: Docker (recommended), Process (unsafe), Remote; Workspace abstraction Local/Docker/API | DOCUMENTED sandboxes + workspace arch | HIGH |
| M02 | Agent logic coupled to deploy | Same agent code; swap `LocalWorkspace` → `DockerWorkspace` → `RemoteAPIWorkspace` | DOCUMENTED SDK overview | HIGH |
| M03 | Opaque autonomous loop | Stateless `Agent` + immutable event log + Conversation status machine | DOCUMENTED agent/conversation arch | HIGH |
| M04 | Unsafe tool calls | Risk levels + analyzers (`LLMSecurityAnalyzer`, Pattern/PolicyRail/Ensemble, …) + `ConfirmRisky` / Always/Never | DOCUMENTED security + OBSERVED `confirmation_policy.py`, `security/__init__.py` | HIGH |
| M05 | Infinite / stuck loops | `StuckDetector` pattern matching (action-obs, action-error, monologue, alternating, context errors); thresholds configurable | DOCUMENTED guide + OBSERVED source | HIGH |
| M06 | Context window blow-up | Pluggable Condenser (e.g. `LLMSummarizingCondenser`) | DOCUMENTED condenser + OBSERVED planning preset import | HIGH |
| M07 | Weak computer-use | Terminal/Bash + FileEditor + BrowserToolSet (browser-use) + optional session recording | DOCUMENTED browser guide + OBSERVED tools tree | HIGH |
| M08 | Unstructured long tasks | Planning preset (structured PLAN.md sections) → separate execution agent; `TaskTrackerTool` | OBSERVED `planning.py` + example `24_planning_agent_workflow.py` | MEDIUM–HIGH |
| M09 | Single-agent bottleneck | Subagent registration + `TaskToolSet` / delegation | OBSERVED example `25_agent_delegation.py` | MEDIUM |
| M10 | Behavior specialization | Skills (repo always-on / knowledge trigger) + AgentContext | DOCUMENTED SDK skills | MEDIUM–HIGH |
| M11 | External tool sprawl | MCP integration (tools appear as SDK tools) | DOCUMENTED MCP section | MEDIUM |
| M12 | No outcome gate | Experimental Critic + iterative refinement on FinishAction | DOCUMENTED critic guide (experimental) | MEDIUM |
| M13 | Benchmark / regression | Evaluation harness (`evaluation/benchmarks/`, `run_controller`, fake user responses) | DOCUMENTED eval harness (paths look V0-era) | MEDIUM |
| M14 | Pause / recover sessions | Conversation pause/resume + persistence; event-sourcing benchmarks in SDK scripts | DOCUMENTED conversation; OBSERVED benchmark script paths | MEDIUM |
| M15 | Multi-agent product UX | Agent Canvas + ACP backends + automations | DOCUMENTED OpenHands README | Product / MEDIUM for MegaBrain |
| M16 | Legacy CodeAct simplicity | Unified bash/Python action space vs many tools | DOCUMENTED CodeActAgent page | MEDIUM (historical) |
| M17 | Secret leakage | Secret registry / masking; agent-server secret redaction modules | DOCUMENTED secrets; OBSERVED server file names | MEDIUM |

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Strong separation Agent↔Workspace↔Server; typed Action/Observation; defense-in-depth security story; stuck+condense+critic stack | OPINION on “strong”; mechanisms DOCUMENTED/OBSERVED |
| Product | Canvas as multi-backend control center; Cloud/Enterprise offerings | DOCUMENTED marketing/product docs — not merit |
| Distribution | Large public GitHub presence; pip packages; Docker images `ghcr.io/openhands/...` | OBSERVED repo metadata / DOCUMENTED install |
| Ecosystem | MCP, ACP, LiteLLM-style model strings, SWE-Bench badge on README | Mixed DOCUMENTED / badge MEASURED-elsewhere |
| Timing | Active V0→V1 rename (runtime→sandbox); dual docs generations | DOCUMENTED |
| Community / DX | Extensive docs, examples, design principles | DOCUMENTED |

**Prohibido:** popularidade ≠ superioridade técnica.

## 6. Comparison with MegaBrain (per mechanism)

### M01 Sandbox / Workspace isolation

```text
EXTERNAL_MECHANISM   Docker/Process/Remote sandbox + Workspace API
PROBLEM_SOLVED       Isolate untrusted agent code/commands from host
OUR_CURRENT_MECHANISM Sandbox UNKNOWN–PARTIAL (baseline)
EQUIVALENCE          NONE–PARTIAL
GAP                  No first-class sandboxed execution plane comparable to OH workspace/server
TRADE_OFF            Isolation vs DX/latency; Process mode is explicitly unsafe
EVIDENCE             DOCUMENTED sandboxes/overview + workspace arch; baseline Sandbox row
APPLICABILITY        High for any MegaBrain path that executes user/repo code
DECISION             ADAPT
Confidence           HIGH
```

### M02 Deploy-agnostic workspace swap

```text
EXTERNAL_MECHANISM   Conversation factory: Local vs Remote by workspace type
PROBLEM_SOLVED       One agent API across local/prod
OUR_CURRENT_MECHANISM Orchestrator + providers; not the same workspace swap
EQUIVALENCE          PARTIAL
GAP                  No equivalent “swap isolation backend without rewriting agent”
TRADE_OFF            Abstraction cost vs ops flexibility
EVIDENCE             DOCUMENTED conversation/workspace factory
APPLICABILITY        Medium–High if MegaBrain gains remote exec
DECISION             ADAPT
Confidence           MEDIUM
```

### M03 Event-sourced conversation + stateless agent

```text
EXTERNAL_MECHANISM   Immutable events; Agent holds no mutable session state
PROBLEM_SOLVED       Debuggable, pausable, serializable runs
OUR_CURRENT_MECHANISM Evidence Bus + execution traces + jobs/checkpoints PARTIAL
EQUIVALENCE          PARTIAL–SUBSTANTIAL (Evidence/trace intent overlaps; not same model)
GAP                  Append-only agent event IR as primary runtime SSOT may be thinner
TRADE_OFF            Event volume vs inspectability
EVIDENCE             DOCUMENTED conversation/events; baseline Evidence/Telemetry
APPLICABILITY        High
DECISION             ADAPT
Confidence           MEDIUM
```

### M04 Security analyzer + confirmation policy

```text
EXTERNAL_MECHANISM   Risk enum + pluggable analyzers + ConfirmRisky
PROBLEM_SOLVED       Gate dangerous tool calls with HITL
OUR_CURRENT_MECHANISM Policy Engine (DOCUMENTED+IMPLEMENTED)
EQUIVALENCE          PARTIAL (policy exists; inline LLM risk + ensemble rails differ)
GAP                  Action-risk-before-tool pattern vs capability authorization may not align 1:1
TRADE_OFF            LLM self-risk is gameable; deterministic rails miss novel attacks
EVIDENCE             DOCUMENTED security; OBSERVED policies; baseline Policy
APPLICABILITY        High
DECISION             ADAPT (compose with existing Policy — do not duplicate registry)
Confidence           HIGH
```

### M05 Stuck detector

```text
EXTERNAL_MECHANISM   Sliding-window semantic pattern stuck detection
PROBLEM_SOLVED       Stop unproductive autonomous loops
OUR_CURRENT_MECHANISM UNKNOWN / not inventoried as equivalent in baseline
EQUIVALENCE          NONE–UNKNOWN
GAP                  Runtime loop-breaker at conversation layer
TRADE_OFF            False positives halt useful retries
EVIDENCE             OBSERVED stuck_detector.py + DOCUMENTED guide
APPLICABILITY        High for long agent runs
DECISION             PROTOTYPE
Confidence           MEDIUM
```

### M06 Condenser / context compression

```text
EXTERNAL_MECHANISM   Pluggable condensers on event view
PROBLEM_SOLVED       Long horizons under token limits
OUR_CURRENT_MECHANISM Knowledge/RAG PARTIAL; episodic mem PARTIAL — not conversation condenser
EQUIVALENCE          PARTIAL
GAP                  First-class history compression in agent loop
TRADE_OFF            Summarization loss vs cost
EVIDENCE             DOCUMENTED condenser
APPLICABILITY        High
DECISION             ADAPT
Confidence           MEDIUM
```

### M07 Computer interaction (terminal + browser)

```text
EXTERNAL_MECHANISM   Terminal/FileEditor + BrowserToolSet
PROBLEM_SOLVED       Code + web interaction in one agent
OUR_CURRENT_MECHANISM Cursor tools / Task roles — different host; no OH-equivalent browser sandbox stack
EQUIVALENCE          PARTIAL (IDE tools) / NONE (sandboxed browser-use)
GAP                  Browser+terminal inside isolated workspace
TRADE_OFF            Browser automation fragility & attack surface
EVIDENCE             DOCUMENTED browser-use
APPLICABILITY        Medium (depends on MegaBrain product scope)
DECISION             DEFER
Confidence           MEDIUM
```

### M08 Planning then execute

```text
EXTERNAL_MECHANISM   Planning agent (structured PLAN.md) → execution agent
PROBLEM_SOLVED       Separate read/plan from mutate/implement
OUR_CURRENT_MECHANISM Task IR `plan.ir.yaml` + PDA plan/exec roles
EQUIVALENCE          SUBSTANTIAL (role split) / PARTIAL (artifact shape)
GAP                  Optional read-only tool set for planner may be sharper in OH preset
TRADE_OFF            Extra latency vs plan quality
EVIDENCE             OBSERVED planning preset/example; baseline Task Graph / PDA
APPLICABILITY        Medium
DECISION             ALREADY_PRESENT (with residual ADAPT of read-only planner tools if audit shows gap)
Confidence           MEDIUM
```

### M09 Delegation / subagents

```text
EXTERNAL_MECHANISM   register_agent + TaskToolSet delegation
PROBLEM_SOLVED       Parallel specialized sub-runs
OUR_CURRENT_MECHANISM Multi-agent PDA Task tool roles
EQUIVALENCE          SUBSTANTIAL
GAP                  Residual API/UX differences only
TRADE_OFF            Handoff overhead
EVIDENCE             OBSERVED delegation example; baseline Multi-agent PDA
APPLICABILITY        Medium
DECISION             ALREADY_PRESENT
Confidence           MEDIUM
```

### M10 Skills

```text
EXTERNAL_MECHANISM   Declarative skills in AgentContext
PROBLEM_SOLVED       Reusable behavior modules
OUR_CURRENT_MECHANISM `.cursor/skills/**/SKILL.md`
EQUIVALENCE          SUBSTANTIAL–EQUIVALENT (instruction packages)
GAP                  Trigger taxonomy (repo vs knowledge) may differ
EVIDENCE             DOCUMENTED skills; baseline Skills
APPLICABILITY        Low for new abstraction
DECISION             ALREADY_PRESENT
Confidence           HIGH
```

### M11 MCP

```text
EXTERNAL_MECHANISM   MCP → SDK tools
PROBLEM_SOLVED       External tool servers without custom wrappers
OUR_CURRENT_MECHANISM MCP available in Cursor ecosystem; MegaBrain Provider/Capability mapping UNKNOWN depth
EQUIVALENCE          UNKNOWN–PARTIAL
GAP                  Needs audit of CursorSKILLS MCP binding vs OH translation layer
EVIDENCE             DOCUMENTED MCP; baseline does not list MCP explicitly
APPLICABILITY        Medium
DECISION             DEFER (GAP: needs audit of CursorSKILLS)
Confidence           LOW
```

### M12 Critic / iterative refinement

```text
EXTERNAL_MECHANISM   APIBasedCritic + IterativeRefinementConfig
PROBLEM_SOLVED       Outcome-quality gate with retries
OUR_CURRENT_MECHANISM Evidence Bus gates + skill evals PARTIAL; no inventoried critic model
EQUIVALENCE          PARTIAL
GAP                  Inference-time success critic tied to FinishAction
TRADE_OFF            Extra LLM cost; experimental; vendor-tied defaults
EVIDENCE             DOCUMENTED critic (experimental)
APPLICABILITY        Medium
DECISION             PROTOTYPE
Confidence           MEDIUM
```

### M13 Evaluation harness

```text
EXTERNAL_MECHANISM   Benchmark runners + fake user_response_fn + EvalOutput
PROBLEM_SOLVED       Reproducible agent benchmarks
OUR_CURRENT_MECHANISM Skill evals JSON; gaabwiki pytest PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Full coding-agent eval harness
TRADE_OFF            Harness maintenance; V0 path drift risk
EVIDENCE             DOCUMENTED evaluation-harness (imports suggest legacy layout)
APPLICABILITY        Medium
DECISION             DEFER
Confidence           LOW–MEDIUM (repo location of harness post-split UNKNOWN)
```

### M17 Secrets / redaction

```text
EXTERNAL_MECHANISM   Secret registry + masked logging / server redaction
PROBLEM_SOLVED       Prevent secret exfil in logs/events
OUR_CURRENT_MECHANISM UNKNOWN depth in baseline
EQUIVALENCE          UNKNOWN
GAP                  Possibly real; needs MegaBrain audit
EVIDENCE             DOCUMENTED secrets guide; OBSERVED server module names only
APPLICABILITY        High
DECISION             DEFER (audit first)
Confidence           LOW
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| M01 Sandbox/Workspace | ADAPT | HIGH |
| M02 Workspace swap API | ADAPT | MEDIUM |
| M03 Event-sourced Conversation | ADAPT | MEDIUM |
| M04 Security+Confirmation | ADAPT | HIGH |
| M05 StuckDetector | PROTOTYPE | MEDIUM |
| M06 Condenser | ADAPT | MEDIUM |
| M07 Browser+Terminal stack | DEFER | MEDIUM |
| M08 Plan→Execute split | ALREADY_PRESENT | MEDIUM |
| M09 Subagent delegation | ALREADY_PRESENT | MEDIUM |
| M10 Skills | ALREADY_PRESENT | HIGH |
| M11 MCP bridge | DEFER | LOW |
| M12 Critic refinement | PROTOTYPE | MEDIUM |
| M13 Eval harness | DEFER | LOW–MEDIUM |
| M15 Agent Canvas / ACP product | REJECT (as MegaBrain core) / DEFER product-wise | HIGH as non-goal for Agent System core |
| M16 CodeAct as primary model | DEFER (historical; V1 tool-calling dominates docs) | MEDIUM |
| M17 Secrets registry | DEFER | LOW |

**REJECT note:** Adopting Agent Canvas / multi-ACP control plane as MegaBrain architecture is out of scope of Agent System MegaBrain lens (product shell ≠ capability/runtime contracts). Marked REJECT for core; product interest is separate.

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`. Highlights:

- **CONFLICT (terminology/architecture generation):** V1 SDK+Canvas vs V0 Runtime+CodeAct docs both “official”; migration incomplete (`RUNTIME` env vs “sandbox”).
- Exact default agent tool set / security defaults in production Canvas: not verified without run.
- Where `evaluation/benchmarks/` lives after monorepo split: docs still describe old Python layout.
- Whether tools always execute *inside* sandbox vs “alongside agent in workspace env” phrasing: docs assert tools share workspace environment (DOCUMENTED); mediation details for DockerRuntime in agent-server OBSERVED as modules exist, internals not fully read.

## 9. Sources

### Primary — documentation

- https://docs.openhands.dev/llms.txt  
- https://docs.openhands.dev/sdk/arch/overview  
- https://docs.openhands.dev/sdk/arch/sdk  
- https://docs.openhands.dev/sdk/arch/agent  
- https://docs.openhands.dev/sdk/arch/conversation  
- https://docs.openhands.dev/sdk/arch/workspace  
- https://docs.openhands.dev/sdk/arch/security  
- https://docs.openhands.dev/sdk/guides/agent-server/overview  
- https://docs.openhands.dev/sdk/guides/agent-stuck-detector  
- https://docs.openhands.dev/sdk/guides/security.md  
- https://docs.openhands.dev/sdk/guides/critic  
- https://docs.openhands.dev/sdk/guides/agent-browser-use  
- https://docs.openhands.dev/openhands/usage/sandboxes/overview  
- https://docs.openhands.dev/openhands/usage/architecture/runtime  
- https://docs.openhands.dev/openhands/usage/architecture/backend  
- https://docs.openhands.dev/openhands/usage/agents  
- https://docs.openhands.dev/openhands/usage/developers/evaluation-harness  

### Primary — GitHub (sampled)

- https://github.com/OpenHands/software-agent-sdk (README, tree, raw: `stuck_detector.py`, `confirmation_policy.py`, `security/__init__.py`, `tools/preset/planning.py`, examples 24/25)  
- https://github.com/OpenHands/OpenHands (README Agent Canvas; stars/metadata via API 2026-09-18)  

### Baseline

- `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`

### Not used as technical proof

- Star counts / SWE-Bench badge as architecture evidence (popularity / external score only).

## 10. Handoff

- Para `agent-authoring`: considerar **ADAPT** de (1) action-risk + confirmation mapping onto Policy Engine, (2) workspace/sandbox provider interface, (3) conversation event IR; **PROTOTYPE** StuckDetector + Critic-style finish gate — sem implementar nesta skill.  
- Para `architect` / `adr`: decisão de sandbox plane vs Cursor-only execution; não clonar Agent Canvas.  
- **Não implementado nesta skill.**
