# Target Report — `langgraph`

| Campo | Valor |
|-------|-------|
| Target | LangGraph (LangChain Inc.) |
| Category | SDK / agent orchestration runtime |
| Mode | `TARGET_RESEARCH` |
| Classification | `OFFICIAL_EXTERNAL` |
| Versions examined | Docs OSS Python (docs.langchain.com, 2026-09-18); public repo `langchain-ai/langgraph` `main`; package version on `main` **1.2.11** (`libs/langgraph/pyproject.toml`) |
| Access limitations | No install/run of LangGraph; no Agent Server / LangSmith Deployment internals; closed commercial path = `UNKNOWN`. Source inspected via docs + GitHub API/raw only. |
| Date | 2026-09-18 |
| Wiki | n/a (external mining; not Gaab product domain) |
| Baseline | `research/OUR-SYSTEM-BASELINE.md` |

## 1. What exists?

**DOCUMENTED + OBSERVED (public tree):** LangGraph is a low-level **graph orchestration runtime** for long-running stateful agents/workflows. Core public model:

- **State** — shared schema (`TypedDict` / dataclass / Pydantic) with per-key **reducers**
- **Nodes** — functions `State → Partial[State]` (side effects allowed; must be idempotent under resume)
- **Edges** — static, conditional, `Send` (map-reduce fan-out), `Command` (update + route / resume)
- **Compile** → `CompiledStateGraph` with optional **checkpointer**, **store**, static **interrupt_before/after**
- **Runtime algorithm** — Pregel-inspired **super-steps** / message passing (`langgraph/pregel/`)
- **Persistence** — thread-scoped checkpoints + optional cross-thread **Store**
- **HITL** — dynamic `interrupt()` + static breakpoints; resume via `Command(resume=…)`
- **Streaming** — `stream`/`astream` modes + recommended `stream_events` projections (v2/v3)
- **Time travel** — replay / fork via `get_state_history` + `update_state`
- **Subgraphs** — nested compiled graphs as nodes; optional own checkpointer namespace
- **Functional API** — `@entrypoint` / `@task` compiles to graph semantics (task-level cache on resume)

**Not in scope of this lens (noted only):** LangChain higher-level agents, Deep Agents harness, LangSmith product UX, Agent Server managed persistence.

**Inspiration (DOCUMENTED):** Pregel, Apache Beam; public interface inspired by NetworkX.

## 2. Architecture map

```text
                    ┌─────────────────────────────────────────┐
                    │           Application code              │
                    │  State schema + reducers                │
                    │  Nodes / edges / Command / interrupt    │
                    └──────────────────┬──────────────────────┘
                                       │ .compile(checkpointer, store, …)
                    ┌──────────────────▼──────────────────────┐
                    │         CompiledStateGraph              │
                    │  invoke | stream | stream_events | a*   │
                    └──────────┬───────────────┬──────────────┘
                               │               │
              ┌────────────────▼──┐   ┌────────▼────────────┐
              │ Pregel runtime    │   │ Persistence layer   │
              │ super-steps       │   │ Checkpointer(thread)│
              │ channels/writes   │   │ Store (cross-thread)│
              │ pending writes    │   │ durability exit|    │
              │ subgraphs ns      │   │   async|sync        │
              └───────────────────┘   └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Observability hook  │
                    │ (LangSmith optional)│
                    └─────────────────────┘
```

**Public package layout (OBSERVED via GitHub API `libs/langgraph/langgraph/`):**
`graph/`, `pregel/`, `channels/`, `stream/`, `func/`, `managed/`, `types.py`, `runtime.py`, `config.py` — plus separate packages `langgraph-checkpoint*`.

## 3. Execution flow

```text
Input (dict | Command(resume=…))
  + config.configurable.thread_id[+checkpoint_id]
    → load checkpoint (if checkpointer)
    → schedule START / next tasks
    → SUPER-STEP loop:
         activate nodes with pending messages
         run nodes (parallel within step when fan-out)
         apply channel updates via reducers
         put_writes (task-level) → commit checkpoint (per durability mode)
         emit stream parts (values|updates|messages|…)
         if interrupt()/breakpoint → pause; surface payload; wait
    → when all inactive & no messages → END
    → Final state (filtered by output_schema on invoke)
```

**DOCUMENTED invariants:**

1. Checkpoints land at **super-step boundaries**, not mid-node (except Functional API **tasks** cache results inside a node).
2. On resume after `interrupt()`, the **node restarts from the beginning**; pre-interrupt side effects must be **idempotent**.
3. Replay from `checkpoint_id` **skips** nodes before that checkpoint; nodes after **re-execute** (LLM/API/interrupts fire again).
4. Mixing static `add_edge` with `Command(goto=…)` from the same node can schedule **both** successors — documented footgun.

## 4. Mechanisms

| id | problem | mechanism | evidence | utility for MegaBrain |
|----|---------|-----------|----------|------------------------|
| LG-GRAPH-EXEC | Orchestrate mixed deterministic + LLM steps with loops/branches | Pregel super-steps + StateGraph compile | DOCUMENTED graph-api; OBSERVED `pregel/` | Conceptual; not drop-in |
| LG-STATE-REDUCER | Concurrent/sequential partial updates to shared state | Per-channel reducers (default overwrite; `Annotated[..., add]`) | DOCUMENTED | Ideas for IR/state merge |
| LG-EDGES-COMMAND | Static vs dynamic routing + update-in-one | Edges / conditional / `Send` / `Command` | DOCUMENTED | Compare to plan.ir routing |
| LG-CHECKPOINT | Survive pause/fail across process boundaries | `BaseCheckpointSaver` + `thread_id` | DOCUMENTED checkpointers | Strong gap signal |
| LG-PENDING-WRITES | Partial super-step failure | Task-level `checkpoint_writes`; skip successful nodes on resume | DOCUMENTED | Recovery design |
| LG-DURABILITY | Perf vs crash safety | `durability=exit\|async\|sync` | DOCUMENTED | Policy knob pattern |
| LG-INTERRUPT-HITL | Pause for human/external input | `interrupt()` + `Command(resume=)` + static breakpoints | DOCUMENTED interrupts | Adapt to SkillJobs |
| LG-STORE | Memory across threads | `BaseStore` key-value outside graph state | DOCUMENTED persistence | Distinct from wiki-mem |
| LG-SUBGRAPH | Multi-agent / modular graphs | Nested compile; `checkpoint_ns`; `checkpointer=True` | DOCUMENTED | PDA / nested skills analogy |
| LG-STREAM | Live progress / tokens / debug | stream modes + `stream_events` | DOCUMENTED | Telemetry partial |
| LG-TIME-TRAVEL | Debug / explore alternatives | `get_state_history`, replay, `update_state` fork | DOCUMENTED use-time-travel | Mostly ABSENT ours |
| LG-IDEMPOTENCY | Correctness under re-exec | Documented resume semantics + tasks | DOCUMENTED | Critical design constraint |

## 5. Adoption analysis (separated — not merit)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Mature public graph+checkpoint model; Python/JS; explicit durability | DOCUMENTED |
| Product | Bundled with LangChain/LangSmith narrative; Agent Server hides checkpointers | DOCUMENTED (marketing adjacent — treat as distribution) |
| Distribution | PyPI `langgraph` + checkpoint extras; MIT | OBSERVED pyproject |
| Ecosystem | Checkpointers (sqlite/postgres/cosmos), LangSmith, Deep Agents on top | DOCUMENTED |
| Timing | Docs actively evolving (stream v2/v3, DeltaChannel beta ≥1.2) | DOCUMENTED |
| Community / DX | Large GitHub stars; Graph API + Functional API dual surface | OBSERVED stars; DOCUMENTED dual API |
| Lock-in | Runtime coupling if MegaBrain *runs on* LangGraph; ideas transferable without dependency | INFERRED |

**Forbidden inference:** popularity ≠ technical superiority for MegaBrain.

## 6. Comparison with MegaBrain (per mechanism)

### LG-GRAPH-EXEC / LG-EDGES-COMMAND

```text
EXTERNAL_MECHANISM   Pregel graph runtime (nodes/edges/Command/Send)
PROBLEM_SOLVED       Explicit control flow for long stateful agent workflows
OUR_CURRENT_MECHANISM Capability IR plan.ir.yaml + Orchestrator/Runtime + PDA Task roles
EQUIVALENCE          PARTIAL
GAP                  Ours is capability/job oriented; lacks first-class super-step parallel scheduler & Command-as-control-primitive
TRADE_OFF            Adopting LangGraph runtime = framework lock-in vs adapting graph IR semantics in-house
EVIDENCE             Baseline Task Graph IMPLEMENTED; README resume/jobs; LangGraph graph-api DOCUMENTED
APPLICABILITY        High for IR/runtime design language; Low for replacing orchestrator
DECISION             ADAPT
```

### LG-STATE-REDUCER

```text
EXTERNAL_MECHANISM   Channel reducers + input/output/private schemas
PROBLEM_SOLVED       Deterministic merge of partial updates (incl. parallel nodes)
OUR_CURRENT_MECHANISM Evidence JSON + plan IR fields; no documented channel reducers
EQUIVALENCE          NONE–PARTIAL (UNKNOWN exact merge semantics in engine)
GAP                  Formal reducer model for concurrent capability outputs
TRADE_OFF            Complexity vs safer fan-out merges
EVIDENCE             Baseline; GAP needs orchestrator code audit for merge rules
APPLICABILITY        Medium
DECISION             PROTOTYPE
```

### LG-CHECKPOINT / LG-PENDING-WRITES / LG-DURABILITY

```text
EXTERNAL_MECHANISM   Thread checkpoints, pending writes, durability modes
PROBLEM_SOLVED       Resume, HITL, crash recovery with tunable durability
OUR_CURRENT_MECHANISM jobs/checkpoints/ + --resume (PARTIAL per baseline)
EQUIVALENCE          PARTIAL
GAP                  Super-step granularity, pending-writes recovery, explicit durability modes, time-travel history API
TRADE_OFF            Storage growth & latency vs recoverability
EVIDENCE             orchestrator README resume; LangGraph checkpointers DOCUMENTED
APPLICABILITY        High
DECISION             ADAPT
```

### LG-INTERRUPT-HITL

```text
EXTERNAL_MECHANISM   interrupt() + Command(resume) + stream.interrupted
PROBLEM_SOLVED       First-class pause/resume with payload round-trip
OUR_CURRENT_MECHANISM SkillJobs pickup/complete + wait-for-jobs (PARTIAL HITL)
EQUIVALENCE          PARTIAL
GAP                  In-node dynamic interrupt with typed resume value; multi-interrupt map by id
TRADE_OFF            Job-file HITL is Cursor-native; interrupt API is more runtime-native
EVIDENCE             README job complete/resume; interrupts DOCUMENTED
APPLICABILITY        High for long workflows needing approval gates
DECISION             ADAPT
```

### LG-STORE

```text
EXTERNAL_MECHANISM   Cross-thread Store vs thread checkpointer
PROBLEM_SOLVED       Separate short-term run state from long-term facts
OUR_CURRENT_MECHANISM GaabWiki + gaabwiki-mem + memory/evidence (PARTIAL / different ontology)
EQUIVALENCE          PARTIAL (conceptual split only)
GAP                  Do not invent parallel “Store” if Knowledge/Memory already cover use cases — audit first
TRADE_OFF            Another KV store vs extending Knowledge contracts
EVIDENCE             Baseline Knowledge/Memory; persistence DOCUMENTED
APPLICABILITY        Medium — ontology mapping required
DECISION             DEFER
```

### LG-SUBGRAPH

```text
EXTERNAL_MECHANISM   Nested graphs + checkpoint namespaces
PROBLEM_SOLVED       Modular multi-agent / team boundaries with optional inner time-travel
OUR_CURRENT_MECHANISM PDA multi-agent Task roles + nested skills (IMPLEMENTED)
EQUIVALENCE          PARTIAL
GAP                  Namespace checkpointing & parent Command.PARENT navigation
TRADE_OFF            Extra persistence complexity
EVIDENCE             Baseline Multi-agent PDA; subgraphs DOCUMENTED
APPLICABILITY        Medium
DECISION             DEFER (unless persistence ADAPT lands first)
```

### LG-STREAM

```text
EXTERNAL_MECHANISM   Multi-mode streaming + event projections
PROBLEM_SOLVED       Live tokens, state deltas, interrupt surfaces
OUR_CURRENT_MECHANISM summarizeExecutionTrace + telemetry PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Typed stream projections for UX/HITL loops
TRADE_OFF            Implementation cost vs operator visibility
EVIDENCE             Baseline Telemetry PARTIAL; streaming DOCUMENTED
APPLICABILITY        Medium
DECISION             ADAPT (ideas into telemetry/event bus — not LangGraph stream API)
```

### LG-TIME-TRAVEL

```text
EXTERNAL_MECHANISM   Replay + fork via checkpoint history
PROBLEM_SOLVED       Debug & counterfactual trajectories
OUR_CURRENT_MECHANISM UNKNOWN / ABSENT as product feature (baseline Persistence PARTIAL only)
EQUIVALENCE          NONE
GAP                  Full checkpoint lineage + non-destructive fork
TRADE_OFF            Storage + non-determinism on replay (LLM re-call)
EVIDENCE             use-time-travel DOCUMENTED; ours UNKNOWN without deeper audit
APPLICABILITY        Low–Medium near-term
DECISION             DEFER
```

### Framework as MegaBrain runtime

```text
EXTERNAL_MECHANISM   Run MegaBrain on LangGraph
PROBLEM_SOLVED       Would buy durability/HITL/streaming quickly
OUR_CURRENT_MECHANISM Custom orchestrator + Cursor skills
EQUIVALENCE          N/A (replacement)
GAP                  Conflicts with Capability/Provider/Policy/Evidence contracts
TRADE_OFF            Speed vs lock-in and dual runtimes
EVIDENCE             Skill DO NOT implement; anti-duplication rules
APPLICABILITY        Low for core Agent System
DECISION             REJECT
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Graph execution / routing primitives (ideas) | `ADAPT` | HIGH |
| State channel reducers | `PROTOTYPE` | MEDIUM |
| Checkpoints + pending writes + durability | `ADAPT` | HIGH |
| Interrupt / HITL resume protocol | `ADAPT` | HIGH |
| Cross-thread Store | `DEFER` | MEDIUM |
| Subgraph checkpoint namespaces | `DEFER` | MEDIUM |
| Streaming projections → telemetry | `ADAPT` | MEDIUM |
| Time travel / fork | `DEFER` | MEDIUM |
| Adopt LangGraph as MegaBrain runtime | `REJECT` | HIGH |
| Duplicate Capability/Provider registries via “agent registry” | `REJECT` | HIGH |

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

**CONFLICT (docs surface evolution):**
- Older docs/examples emphasize `stream(..., stream_mode=…)`; newer recommend `stream_events` v3 projections and `stream` v2 `StreamPart` shape.
- Resolution: prefer latest OSS docs pages cited; treat older NetworkX-style concept pages as secondary.

## 9. Sources

1. https://docs.langchain.com/langgraph — overview  
2. https://docs.langchain.com/oss/python/langgraph/graph-api — State/Nodes/Edges/Command/Send/idempotency  
3. https://docs.langchain.com/oss/python/langgraph/checkpointers — threads, checkpoints, durability, pending writes  
4. https://docs.langchain.com/oss/python/langgraph/persistence — checkpointer vs store  
5. https://docs.langchain.com/oss/python/langgraph/interrupts — HITL  
6. https://docs.langchain.com/oss/python/langgraph/use-time-travel — replay/fork/subgraphs  
7. https://docs.langchain.com/oss/python/langgraph/use-subgraphs — subgraph patterns  
8. https://docs.langchain.com/oss/python/langgraph/streaming — stream modes / v2  
9. https://docs.langchain.com/oss/python/langgraph/functional-api — tasks/entrypoint resume  
10. https://reference.langchain.com/python/langgraph/graph/state/StateGraph — API reference  
11. https://github.com/langchain-ai/langgraph — public source tree / `pyproject.toml` version 1.2.11  
12. Baseline: `research/OUR-SYSTEM-BASELINE.md` + `CursorSKILLS/orchestrator/README.md`

## 10. Handoff

- **agent-authoring:** Do **not** add LangGraph dependency. If pursuing ADAPT items, design against existing Orchestrator / Evidence / Policy contracts (checkpoint durability knobs, interrupt-shaped SkillJob resume, reducer experiments on IR outputs).
- **architect / adr:** Candidate ADRs — (1) durability modes for `jobs/checkpoints`, (2) HITL interrupt protocol vs job complete, (3) reject LangGraph runtime embedding.
- **PATTERN_MINING / CROSS_SYSTEM:** Super-step checkpoint + pending writes + interrupt resume are strong candidates once other targets confirm recurrence.
- **Não implementado nesta skill.**
