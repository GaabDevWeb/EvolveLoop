# Target Report — `crewai`

| Campo | Valor |
|-------|-------|
| Target | CrewAI (crewAIInc/crewAI) |
| Category | SDK / multi-agent framework |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | PyPI `crewai==1.15.22` (depends on `crewai-core==1.15.22`); GitHub `main` as of 2026-09-18 (`lib/crewai` monorepo layout); docs `docs.crewai.com/edge` + older concept pages (v1.13 / v1.15.17) |
| Access limitations | Observational only: raw GitHub + docs + PyPI metadata. No install, no execution of framework code, no Enterprise/AMP internals, no commit SHA pinned (API rate-limit on `/commits`). Docs index `llms.txt` fetch timed out once. |
| Date | 2026-09-18 |
| Baseline | `research/OUR-SYSTEM-BASELINE.md` (MegaBrain / CursorSKILLS) |

Wiki: n/a (corpus de research externo; não é código de produto Gaab).

---

## 1. What exists?

CrewAI is an open-source Python framework (MIT) for **role-playing agents** organized into **Crews** (task teams) and optionally wrapped by **Flows** (event-driven, stateful application orchestration).

**OBSERVED (repo layout):** workspace packages under `lib/` — `crewai` (framework), `crewai-core`, `crewai-tools`, `crewai-cli`, `crewai-files`. Public surface still imported as `crewai`.

**Core abstractions (OBSERVED + DOCUMENTED):**

| Abstraction | Role |
|-------------|------|
| `Agent` | LLM worker with `role` / `goal` / `backstory`, tools, limits (`max_iter`, RPM, timeouts), optional delegation / code exec / knowledge / skills |
| `Task` | Unit of work: description, expected_output, agent, context deps, structured output, guardrails, async flag, human_input |
| `Crew` | Set of agents + tasks + `Process` (sequential \| hierarchical) + memory/knowledge/planning/callbacks/tracing |
| `Process` | Enum: `sequential`, `hierarchical` (`consensual` TODO in source) |
| `Flow` | Stateful orchestrator: DSL `@start` / `@listen` / `@router` / `or_` / `and_`, Pydantic/dict state, `@persist`, checkpoints |
| `Memory` | Unified memory (LLM analysis + pluggable storage; LanceDB default in code comments) |
| `Knowledge` | Vectorized knowledge sources (PDF/CSV/JSON/text/docling/…) queried into agent prompts |
| Tools | `BaseTool` + agent delegation tools + MCP resolver + optional platform/code tools |
| Skills | Agent Skills / `SKILL.md` progressive disclosure (levels 1–3) |
| Events / OTEL | `crewai_event_bus`, crew/flow/agent/memory events, OpenTelemetry deps |

**Marketing claims on docs intro** (“leading”, “100,000+ certified”, “enterprise-ready”, “cost-efficient”) are **not** treated as technical evidence (`OPINION` / marketing).

---

## 2. Architecture map

```text
                    ┌─────────────────────────────────────┐
                    │  Flow (optional production shell)   │
                    │  state (Pydantic|dict) + DSL graph  │
                    │  @start → @listen/@router → …       │
                    │  @persist / checkpoints             │
                    └──────────────┬──────────────────────┘
                                   │ kickoff Crew / Python steps
                                   ▼
                    ┌─────────────────────────────────────┐
                    │  Crew.kickoff(inputs)               │
                    │  prepare → planning? → process      │
                    │  sequential | hierarchical          │
                    └──────────────┬──────────────────────┘
                                   │ per Task
                                   ▼
              ┌────────────────────┴────────────────────┐
              │ Agent (or manager_agent if hierarchical)│
              │ executor loop (max_iter) + tools        │
              │ knowledge recall · memory · skills      │
              │ guardrails on TaskOutput · events       │
              └─────────────────────────────────────────┘
```

**Recommended production shape (DOCUMENTED):** Flow-first → Crew as unit of collaborative work → Tasks/Agents inside Crew. Crews/Agents alone are supported but docs argue Flows for state/control/observability.

---

## 3. Execution flow (Crew)

```text
inputs (+ optional files/checkpoint)
  → before_kickoff_callbacks / hooks (EXECUTION_START, INPUT)
  → interpolate task/agent templates
  → setup_agents (knowledge, skills, executor)
  → [if planning] CrewPlanner LLM → append plan text to each task.description
  → Process:
       sequential: for each Task → _get_agent_to_use(task.agent) → execute
       hierarchical: create manager → every Task executed by manager_agent
  → per task: build context from prior TaskOutputs → agent.execute_task
       → knowledge retrieval into prompt
       → AgentExecutor iterations until answer or max_iter
       → tools (incl. Delegate/Ask if allow_delegation)
       → Task guardrails (retry up to guardrail_max_retries)
  → CrewOutput (raw / pydantic / json_dict / tasks_output / token_usage)
  → after_kickoff_callbacks · drain memory writes · emit completion/failure events
```

**Hierarchical nuance (OBSERVED, critical):** `_get_agent_to_use` returns `manager_agent` for **all** tasks when `process == hierarchical`. Worker agents are reached via **delegation tools** (`DelegateWorkTool`, `AskQuestionTool`), not by assigning `task.agent` as the executor. Docs that imply “manager validates then proceeds” overstate a separate validation gate; the mechanism is **manager-as-executor + tool-mediated coworker calls**.

**Flow execution (OBSERVED at API level):** `Flow.kickoff` → async engine in `flow/runtime/__init__.py` (~4k LOC): load/restore state, emit start, run start methods, follow listen/router conditions, optional persist. Full internal scheduling algorithm not fully line-traced in this pass → residual `UNKNOWN` (see UNKNOWNS.md).

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M01 | Need specialized LLM workers | Agent = role + goal + backstory + tools + limits | OBSERVED | High (pattern), low as library |
| M02 | Need discrete units of work | Task with context graph + structured output | OBSERVED | High |
| M03 | Need team orchestration | Crew binds agents/tasks + Process strategy | OBSERVED | Medium |
| M04 | Linear multi-step pipeline | Process.sequential + context aggregation | OBSERVED | High / already common |
| M05 | Dynamic assignment / oversight | Process.hierarchical + manager + AgentTools | OBSERVED | Medium–High (costly) |
| M06 | Cross-crew app control & state | Flow DSL + typed state + persist/checkpoint | OBSERVED + DOCUMENTED | High for apps |
| M07 | Improve task execution quality | CrewPlanner appends plan to descriptions | OBSERVED | Mixed (overhead) |
| M08 | Agent may need coworkers | `allow_delegation` injects Delegate/Ask tools | OBSERVED | Medium |
| M09 | Bad outputs must not propagate | Task guardrail(s) + retries | OBSERVED | High |
| M10 | Persist useful interaction facts | Unified `Memory` (LLM analyze + recall) | OBSERVED + DOCUMENTED | Medium |
| M11 | Ground agents on corpora | `Knowledge` sources → retrieve into prompt | OBSERVED | Medium |
| M12 | Bound agent loops | `max_iter` / executor iteration check | OBSERVED | High |
| M13 | Observe runs | Event bus + OTEL deps + tracing flags | OBSERVED | High |
| M14 | Package reusable playbooks | Skills (`SKILL.md`, disclosure 1–3) | OBSERVED | High (familiar) |
| M15 | External tool servers | MCP tool resolver on agent | OBSERVED | Medium |
| M16 | Resume long runs | Crew/Flow checkpoints; Flow `@persist` | OBSERVED + DOCUMENTED | High |
| M17 | Optional code tools | `allow_code_execution` + safe/unsafe modes | DOCUMENTED + partial OBSERVED | Security-sensitive |

---

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Rich surface (Crew+Flow+Memory+Knowledge+Skills+MCP). Two orchestration layers. Hierarchical is tool-delegation, not a true scheduler. Planning is prompt-append. | Technical |
| Product | Strong “teams of agents” narrative; AMP/Enterprise/deploy CLI separate from OSS core. | Product |
| Distribution | PyPI + GitHub (~58k stars metadata) + docs site + CLI scaffolding (`crew.jsonc`). Stars ≠ quality. | Distribution |
| Ecosystem | `crewai-tools`, MCP, platform apps, skills repo (`npx skills add crewaiinc/skills`). | Ecosystem |
| Timing | Mature 1.x line; monorepo split (`crewai-core`); memory unified (replacing older STM/LTM/entity split per current docs). | Timing |
| Community / DX | YAML/JSONC + decorators + Python API; large docs; version skew between `/edge` and `/v1.13` pages. | Community / DX |

**Forbidden inference:** popularity ⇒ architectural superiority. Not used in decisions.

---

## 6. Comparison with MegaBrain (per mechanism)

```text
EXTERNAL_MECHANISM   M01 Role/Goal/Backstory Agent
PROBLEM_SOLVED       Specialize LLM behavior without new code paths
OUR_CURRENT_MECHANISM Skills + PDA roles + Agent contracts
EQUIVALENCE          PARTIAL
GAP                  MegaBrain separates decide/do via Capability/Provider; CrewAI collapses “agent” as executor+persona
TRADE_OFF            Persona prompts are cheap DX; weak authority boundaries vs Policy/Capability
EVIDENCE             OBSERVED agent fields; baseline PDA/skills
APPLICABILITY        Prompt/role packaging only — not a second agent runtime
DECISION             ALREADY_PRESENT (concept) / REJECT (adopting CrewAI Agent runtime)
```

```text
EXTERNAL_MECHANISM   M02/M04 Task list + sequential context
PROBLEM_SOLVED       Ordered work with explicit prior outputs as context
OUR_CURRENT_MECHANISM Capability IR `plan.ir.yaml` + Orchestrator
EQUIVALENCE          SUBSTANTIAL
GAP                  CrewAI Task is LLM-facing; our IR is capability-facing
TRADE_OFF            Task IR vs natural-language tasks
EVIDENCE             OBSERVED `_execute_tasks`; baseline Task IR
APPLICABILITY        Keep IR; do not duplicate Task class
DECISION             ALREADY_PRESENT
```

```text
EXTERNAL_MECHANISM   M05 Hierarchical manager + delegation tools
PROBLEM_SOLVED       Runtime routing of work among specialists via LLM
OUR_CURRENT_MECHANISM Multi-agent PDA (plan/exec/gate/explore/critic/librarian) via Task tool
EQUIVALENCE          PARTIAL
GAP                  PDA is role-routed by Cursor Agent System; CrewAI uses in-loop tool delegation under one manager executor
TRADE_OFF            More autonomy / more tokens / weaker deterministic assignment
EVIDENCE             OBSERVED `_get_agent_to_use`, `AgentTools`
APPLICABILITY        Study as pattern; do not import manager LLM as default
DECISION             PROTOTYPE (pattern eval) — not ADOPT library
```

```text
EXTERNAL_MECHANISM   M06 Flow stateful event graph
PROBLEM_SOLVED       App-level control, branching, persistence around agent teams
OUR_CURRENT_MECHANISM Orchestrator + jobs/checkpoints (PARTIAL)
EQUIVALENCE          PARTIAL
GAP                  No first-class `@listen/@router` DSL in MegaBrain
TRADE_OFF            Flow power vs framework lock-in and dual orchestration (Flow+Crew)
EVIDENCE             OBSERVED Flow runtime module; DOCUMENTED production-architecture
APPLICABILITY        Ideas for explicit state machines around capabilities — via our Runtime
DECISION             ADAPT (state+branching principles) / REJECT (CrewAI Flow engine)
```

```text
EXTERNAL_MECHANISM   M07 CrewPlanner prompt-append planning
PROBLEM_SOLVED       Give agents a step plan before execution
OUR_CURRENT_MECHANISM plan.ir / orquestrar planning
EQUIVALENCE          NONE–PARTIAL
GAP                  Ours plans capabilities; CrewAI mutates NL task text via extra LLM call
TRADE_OFF            Quality vs tokens + non-structured plans
EVIDENCE             OBSERVED `planning_handler.py`, `_handle_crew_planning`
APPLICABILITY        Anti-pattern risk if piled on IR planning
DECISION             DEFER (as feature) / note as anti-pattern candidate
```

```text
EXTERNAL_MECHANISM   M09 Task guardrails + retries
PROBLEM_SOLVED       Validate/transform outputs before accepting
OUR_CURRENT_MECHANISM Evidence Bus + Policy Engine
EQUIVALENCE          PARTIAL
GAP                  Evidence is artifact gates; CrewAI often callable/LLM check on TaskOutput with retry loop
TRADE_OFF            Tight feedback vs retry cost / callable non-serializable on checkpoint
EVIDENCE             OBSERVED `process_guardrail`, task `_invoke_guardrail_function`
APPLICABILITY        ADAPT retry+validator loop onto Evidence/Policy edges
DECISION             ADAPT
```

```text
EXTERNAL_MECHANISM   M10 Unified Memory
PROBLEM_SOLVED       Cross-run / cross-step recall with scored retrieval
OUR_CURRENT_MECHANISM gaabwiki-mem / sessions (PARTIAL — episodic continuity)
EQUIVALENCE          PARTIAL
GAP                  Not agent working-memory equivalent; CrewAI uses LLM-on-save + vector store
TRADE_OFF            Rich recall vs memory pollution + embed/LLM cost
EVIDENCE             OBSERVED `unified_memory.py`; DOCUMENTED memory page
APPLICABILITY        Separate from wiki grounding; only if agent runtime needs working memory
DECISION             DEFER
```

```text
EXTERNAL_MECHANISM   M11 Knowledge RAG into prompts
PROBLEM_SOLVED       Ground agents on document corpora
OUR_CURRENT_MECHANISM GaabWiki + RAG gate (PARTIAL / BM25 degraded per baseline)
EQUIVALENCE          PARTIAL–SUBSTANTIAL (intent)
GAP                  Implementation stack differs
TRADE_OFF            Local chromadb-style vs vault SSOT
EVIDENCE             OBSERVED `knowledge.py`; baseline Knowledge
APPLICABILITY        Strengthen our grounding — not adopt Crew knowledge module
DECISION             ALREADY_PRESENT (intent) / REJECT (module)
```

```text
EXTERNAL_MECHANISM   M12 max_iter executor bound
PROBLEM_SOLVED       Prevent unbounded tool/LLM loops
OUR_CURRENT_MECHANISM Policy / runtime limits (verify depth UNKNOWN in baseline)
EQUIVALENCE          PARTIAL
GAP                  Need audit of our hard iteration caps
TRADE_OFF            Safety vs incomplete answers (`handle_max_iterations_exceeded`)
EVIDENCE             OBSERVED AgentExecutor `check_max_iterations`
APPLICABILITY        Ensure equivalent hard stops exist
DECISION             ADAPT (ensure hard caps) — GAP: audit CursorSKILLS limits
```

```text
EXTERNAL_MECHANISM   M13 Events + OTEL tracing
PROBLEM_SOLVED       Observe multi-agent runs
OUR_CURRENT_MECHANISM `summarizeExecutionTrace` + docs (PARTIAL)
EQUIVALENCE          PARTIAL
GAP                  Less structured event taxonomy than CrewAI bus
TRADE_OFF            Vendor tracing (login/grants) vs local-first telemetry
EVIDENCE             OBSERVED imports/deps; DOCUMENTED tracing recommendation
APPLICABILITY        Enrich local traces; avoid share_crew-style exfil defaults
DECISION             ADAPT
```

```text
EXTERNAL_MECHANISM   M14 Agent Skills progressive disclosure
PROBLEM_SOLVED       Load instructions/resources on demand
OUR_CURRENT_MECHANISM `.cursor/skills/**/SKILL.md`
EQUIVALENCE          EQUIVALENT (pattern family)
GAP                  CrewAI embeds skills into agent tool/loader; we use Cursor skill protocol
TRADE_OFF            N/A for MegaBrain — already core
EVIDENCE             OBSERVED `skills/models.py` DisclosureLevel 1–3
APPLICABILITY        Cross-system pattern only
DECISION             ALREADY_PRESENT
```

```text
EXTERNAL_MECHANISM   M15 MCP tools on agent
PROBLEM_SOLVED       Attach external tool servers
OUR_CURRENT_MECHANISM MCP in Cursor ecosystem (baseline: protocols separate target)
EQUIVALENCE          SUBSTANTIAL
GAP                  Wiring details differ
DECISION             ALREADY_PRESENT (ecosystem) / REJECT (CrewAI resolver specifically)
```

```text
EXTERNAL_MECHANISM   M16 Persist/checkpoint
PROBLEM_SOLVED       Resume after crash / HITL wait
OUR_CURRENT_MECHANISM jobs/checkpoints PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Dual systems in CrewAI (`from_checkpoint` vs `@persist`) — complexity
EVIDENCE             OBSERVED Flow kickoff mutual exclusion ValueError
DECISION             ADAPT (single resume model preferred)
```

```text
EXTERNAL_MECHANISM   share_crew / remote training opt-in
PROBLEM_SOLVED       Vendor model improvement (vendor goal)
OUR_CURRENT_MECHANISM N/A (privacy-local wiki)
EQUIVALENCE          NONE
DECISION             REJECT
```

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Role-persona Agent (as library) | REJECT | HIGH |
| Role specialization concept | ALREADY_PRESENT | HIGH |
| Task sequential + context | ALREADY_PRESENT | HIGH |
| Hierarchical manager+tools | PROTOTYPE (pattern) | MEDIUM |
| Flow engine | REJECT engine / ADAPT ideas | HIGH |
| CrewPlanner append | DEFER | MEDIUM |
| Task guardrail retries | ADAPT | HIGH |
| Unified Memory module | DEFER | MEDIUM |
| Knowledge module | REJECT module / ALREADY_PRESENT intent | HIGH |
| max_iter hard stop | ADAPT | HIGH |
| Event/OTEL style observability | ADAPT | MEDIUM |
| Skills disclosure | ALREADY_PRESENT | HIGH |
| MCP resolver | ALREADY_PRESENT / REJECT specific | HIGH |
| Persist/checkpoint duality | ADAPT (simplify) | MEDIUM |
| share_crew telemetry | REJECT | HIGH |
| Consensual process | DEFER | HIGH (unimplemented upstream) |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`. Highlights:

- **CONFLICT:** Crews docs attribute table still describes memory as short/long/entity; current Memory docs + `unified_memory.py` describe unified Memory.
- **CONFLICT:** Crews docs list `cache` default True; code `Crew.cache` default **False** (opt-in).
- **CONFLICT:** Docs hierarchical “validates outcomes”; code = manager executes all tasks via tools.
- **CONFLICT:** Docs Agent `max_iter` default 20; `AgentExecutor.max_iter` Field default **25**.
- Flow scheduler internals, Enterprise AMP, telemetry defaults when `tracing=None`: UNKNOWN.

---

## 9. Sources

**Primary code (raw GitHub `crewAIInc/crewAI` main):**

- `lib/crewai/src/crewai/crew.py`
- `lib/crewai/src/crewai/process.py`
- `lib/crewai/src/crewai/task.py`
- `lib/crewai/src/crewai/crews/utils.py` (`prepare_kickoff`, `prepare_task_execution`)
- `lib/crewai/src/crewai/utilities/planning_handler.py`
- `lib/crewai/src/crewai/utilities/guardrail.py`
- `lib/crewai/src/crewai/tools/agent_tools/{agent_tools,delegate_work_tool}.py`
- `lib/crewai/src/crewai/agent/core.py`
- `lib/crewai/src/crewai/experimental/agent_executor.py`
- `lib/crewai/src/crewai/memory/unified_memory.py`
- `lib/crewai/src/crewai/knowledge/knowledge.py`
- `lib/crewai/src/crewai/flow/{flow.py,runtime/__init__.py,dsl/*,persistence/*}`
- `lib/crewai/src/crewai/skills/models.py`
- `lib/crewai/pyproject.toml` (version alignment 1.15.22)

**Docs:**

- https://docs.crewai.com/edge/en/introduction
- https://docs.crewai.com/edge/en/concepts/production-architecture
- https://docs.crewai.com/edge/en/concepts/crews
- https://docs.crewai.com/edge/en/concepts/flows
- https://docs.crewai.com/edge/en/concepts/memory
- https://docs.crewai.com/v1.13.0/en/concepts/agents (version-skew risk)
- https://docs.crewai.com/v1.15.17/en/concepts/tasks

**Metadata:** https://pypi.org/pypi/crewai/json → 1.15.22; GitHub API repo metadata.

**Baseline:** `research/OUR-SYSTEM-BASELINE.md`

---

## 10. Handoff

- Para `agent-authoring`: **não** integrar CrewAI runtime. Considerar ADAPT de (1) guardrail+retry em gates Evidence/Policy, (2) hard `max_iter`-like caps, (3) richer local execution events.
- Para `architect` / `adr`: decidir se queremos um **Flow-like** state machine *dentro* do Orchestrator (ADAPT) vs manter só Capability IR; avaliar PROTOTYPE do padrão manager+delegation vs PDA routing.
- Para PATTERN_MINING / CROSS_SYSTEM: candidatos — “tool-mediated delegation”, “NL plan append”, “dual orchestration shell+team”, “progressive skill disclosure” (já nosso).
- **Não implementado nesta skill.**
