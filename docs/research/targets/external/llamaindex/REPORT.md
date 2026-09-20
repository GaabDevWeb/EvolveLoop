# Target Report — `llamaindex`

| Campo | Valor |
|-------|-------|
| Target | LlamaIndex (Python) — Agents / Workflows / RAG |
| Category | SDK / Agent + Data framework |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | PyPI `llama-index` / `llama-index-core` **0.14.24**; `llama-index-workflows` **2.24.0** (MEASURED 2026-09-18); source `run-llama/llama_index` `main` (`multi_agent_workflow.py`, `base_agent.py`) |
| Access limitations | Sem clone local do monorepo; sem execução de exemplos; leitura de docs oficiais + raw GitHub + Context7 + PyPI. TS / LlamaAgents cloud: fora de escopo profundo. |
| Date | 2026-09-18 |
| Wiki | n/a (OFFICIAL_EXTERNAL; não é domínio Gaab product) |

## 1. What exists?

LlamaIndex é um framework Python (umbrella `llama-index` + `llama-index-core` + integrações) para **ligar LLMs a dados** e, na camada moderna, para **orquestrar agentes sobre um runtime event-driven (`Workflow`)**.

Foco desta investigação (não o produto inteiro):

| Camada | Peças centrais | Label |
|--------|----------------|-------|
| Workflow runtime | `Workflow`, `@step`, `Event` / `StartEvent` / `StopEvent`, `Context`/`ctx.store`, `send_event`/`collect_events`, timeout, validação de grafo de eventos | DOCUMENTED + OBSERVED (código AgentWorkflow) |
| Agents | `AgentWorkflow`, `FunctionAgent`, `ReActAgent`, tools, handoff, memory, streaming, HITL | DOCUMENTED + OBSERVED |
| RAG / Knowledge | Readers → Documents/Nodes → Indexes → Retrievers → Query/Chat Engines; `QueryEngineTool` para agentes | DOCUMENTED |
| Observability | `instrumentation` (dispatcher/events/spans); legacy `CallbackManager`; OTel / parceiros | DOCUMENTED |
| Evaluation | Faithfulness, relevancy, correctness; retrieval MRR/hit-rate; dataset synth; integrações Ragas/DeepEval/… | DOCUMENTED |

**Não é** um coding agent de IDE. **Não é** um Capability Registry no sentido MegaBrain. É um SDK de aplicação GenAI com primitives fortes de *data→index→retrieve→synthesize* e *event→step→agent*.

## 2. Architecture map

```text
                    ┌─────────────────────────────────────────┐
  Data sources      │  Readers / connectors (LlamaHub etc.)   │
                    └──────────────────┬──────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  Documents → Node parsing / transforms  │
                    │  (IngestionPipeline optional)            │
                    └──────────────────┬──────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  Indexes (VectorStoreIndex, …)           │
                    │  Vector / keyword / graph stores         │
                    └──────────────────┬──────────────────────┘
                                       ▼
              ┌────────────────────────┴────────────────────────┐
              ▼                                                 ▼
   Retriever / QueryEngine                          QueryEngineTool
   (RAG síncrono clássico)                          (RAG como tool)
              │                                                 │
              └────────────────────────┬────────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  Workflow runtime (event-driven steps)  │
                    │  Context.store · stream · timeout       │
                    └──────────────────┬──────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  AgentWorkflow                          │
                    │  FunctionAgent | ReActAgent             │
                    │  tools · handoff · memory · HITL        │
                    └──────────────────┬──────────────────────┘
                                       ▼
                         StopEvent / AgentOutput (+ stream)
```

Multi-agent (DOCUMENTED): três padrões explícitos —

1. **AgentWorkflow “swarm”** — handoffs entre agentes (`can_handoff_to`)  
2. **Orchestrator** — um `FunctionAgent` cujos tools invocam sub-agentes  
3. **Custom planner** — `Workflow` DIY que planeia (XML/JSON) e executa agents

## 3. Execution flow (AgentWorkflow)

```text
user_msg / chat_history (+ optional ctx, memory)
  → AgentWorkflowStartEvent
  → init_run: seed Context (agents, state, memory=ChatMemoryBuffer, can_handoff_to, …)
  → AgentInput
  → setup_agent: inject system_prompt; optionally format last msg with state_prompt
  → run_agent_step: agent.take_step(llm, tools incl. handoff, memory)
  → AgentOutput (streamed)
  → parse_agent_output:
       · bump num_iterations; fail/generate if ≥ max_iterations (default 20)
       · no tool_calls → finalize → StopEvent
       · else fan-out ToolCall events
  → call_tool (parallel collect) → ToolCallResult
  → aggregate_tool_results:
       · handle_tool_call_results into memory
       · if next_agent set by handoff tool → switch current_agent_name
       · return_direct (except handoff name) → StopEvent
       · else → AgentInput again
  → Final Output: AgentOutput / structured_response
```

**Label:** OBSERVED em `llama_index/core/agent/workflow/multi_agent_workflow.py` (raw GitHub `main`).

HITL (DOCUMENTED): tool chama `ctx.wait_for_event(HumanResponseEvent, waiter_event=InputRequiredEvent(...))`; UI/API faz `handler.ctx.send_event(HumanResponseEvent(...))`; Context serializável para pausa/retoma (nota: steps in-progress recomeçam do início no restore).

## 4. Mechanisms

| id | problem | mechanism | evidence | utility vs MegaBrain |
|----|---------|-----------|----------|----------------------|
| LI-WF-EVENT | Orquestrar loops/ramos sem DAG rígido | Typed events + `@step`; validação de grafo; `send_event`/`collect_events` para fan-out | DOCUMENTED workflows guide; OBSERVED AgentWorkflow steps | Alto — comparar a Task IR / Runtime |
| LI-AGENT-WF | Orquestrar 1..N agentes com tools | `AgentWorkflow` pré-construído sobre Workflow | DOCUMENTED + OBSERVED | Médio — PDA já cobre multi-role |
| LI-HANDOFF | Transferir controlo entre especialistas | Tool `handoff(to_agent, reason)` + `can_handoff_to` ACL no store | OBSERVED | Médio — ACL de handoff explícita |
| LI-FN-vs-REACT | Adaptar a capacidade do LLM | `FunctionAgent` se `is_function_calling_model` else `ReActAgent` | DOCUMENTED `from_tools_or_functions` | Baixo — routing de provider já nosso |
| LI-TOOL-CTX | Tools partilharem estado de run | 1º param `Context`; `ctx.store.edit_state()` / `state` dict | DOCUMENTED | Médio — vs Evidence/Context contracts |
| LI-MEMORY | Continuidade chat vs run | `BaseMemory` / `ChatMemoryBuffer` no store; Context serializável entre runs | DOCUMENTED + OBSERVED | Médio — episodic mem ≠ working mem |
| LI-HITL | Pausar para humano | `wait_for_event` + InputRequired/HumanResponse + serialize Context | DOCUMENTED | Alto se quisermos gates interactivos |
| LI-RAG-CORE | Grounding em dados privados | Index → Retriever → QueryEngine (retrieve+synthesize) | DOCUMENTED | Alto conceptual; stack diferente |
| LI-RAG-TOOL | Agente decidir quando recuperar | `QueryEngineTool` wrapping query engine | DOCUMENTED | Médio — Capability=tool pattern |
| LI-STREAM | Observabilidade de progresso | `handler.stream_events()`; AgentStream/ToolCall/… | DOCUMENTED + OBSERVED `write_event_to_stream` | Médio — vs execution trace |
| LI-INSTR | Tracing span/event global | `instrumentation` dispatcher; OTel integrations | DOCUMENTED | Médio |
| LI-EVAL | Medir qualidade RAG/agent | Faithfulness, relevancy, retrieval metrics, synth Q | DOCUMENTED | Médio — vs skill evals JSON |
| LI-MAXITER | Evitar loops infinitos | `DEFAULT_MAX_ITERATIONS=20`; `early_stopping_method` force\|generate | OBSERVED | Já próximo de policy limits |
| LI-ORCH-PATTERNS | Trade-off conveniência vs controlo | Swarm / Orchestrator-tools / Custom planner | DOCUMENTED multi_agent | Conceitual — pattern mining |

## 5. Adoption analysis (separated — popularidade ≠ mérito)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Runtime event-driven claro; RAG primitives maduras; agents recentes unificados em Workflow | DOCUMENTED / OBSERVED |
| Product | Ecossistema data connectors + LlamaCloud/Parse (comercial adjacente) — não avaliado em profundidade | UNKNOWN (comercial) |
| Distribution | PyPI modular; workflows também `pip install llama-index-workflows` | MEASURED versions |
| Ecosystem | Muitas integrações LLM/vector/obs/eval — risco de superfície e churn de APIs | DOCUMENTED |
| Timing | Migração DAG→Workflow; instrumentation vs callbacks legacy ainda coexistentes | DOCUMENTED (deprecation note) |
| Community / DX | Docs agent-friendly (`llms.txt`, MCP docs); notebooks abundantes | DOCUMENTED |
| Lock-in | Acoplar MegaBrain a `llama-index-core` seria acoplamento pesado | INFERRED |

## 6. Comparison with MegaBrain (per mechanism)

### LI-WF-EVENT — Event-driven Workflow

```text
EXTERNAL_MECHANISM   Typed Event → @step → next Event; Context.store; graph validate
PROBLEM_SOLVED       Branch/loop/concurrency sem edges DAG opacos
OUR_CURRENT_MECHANISM Orchestrator + Capability IR plan.ir.yaml + Runtime; PDA Task tool
EQUIVALENCE          PARTIAL
GAP                  Sem runtime event-typed first-class no Agent System; IR é capability graph, não Pydantic Event bus
TRADE_OFF            Workflow LI = lib app-level; nosso Runtime = policy/evidence-first
EVIDENCE             DOCUMENTED workflows; baseline Task IR IMPLEMENTED
APPLICABILITY        Ideias de validação de grafo + fan-out tipado; não importar package
DECISION             ADAPT (conceitos) / REJECT (dependência llama-index-workflows)
Confidence           HIGH
```

### LI-AGENT-WF + LI-HANDOFF — Multi-agent handoffs

```text
EXTERNAL_MECHANISM   Agent list + root + handoff tool + can_handoff_to
PROBLEM_SOLVED       Especialização com transferência de controlo
OUR_CURRENT_MECHANISM PDA roles plan/exec/gate/explore/critic/librarian; orquestrar
EQUIVALENCE          SUBSTANTIAL (conceito) / PARTIAL (mecanismo ACL)
GAP                  can_handoff_to como policy explícita entre roles; handoff como tool LLM-chosen
TRADE_OFF            Handoff LLM-driven vs handoff policy/orchestrator-driven
EVIDENCE             OBSERVED handoff(); baseline Multi-agent PDA IMPLEMENTED
APPLICABILITY        Avaliar ACL de handoff no Policy Engine — não novo Agent Registry
DECISION             ADAPT (handoff ACL / prompt contracts) | ALREADY_PRESENT (multi-role)
Confidence           MEDIUM
```

### LI-TOOL-CTX / tools

```text
EXTERNAL_MECHANISM   FunctionTool / QueryEngineTool; Context inject
PROBLEM_SOLVED       Acções tipadas + estado partilhado
OUR_CURRENT_MECHANISM Capability Registry + Provider Registry
EQUIVALENCE          SUBSTANTIAL
GAP                  Tools LI são Python callables; Capabilities são contratos/IR
TRADE_OFF            DX rápido vs governance MegaBrain
EVIDENCE             baseline Capability Registry IMPLEMENTED_TESTED
APPLICABILITY        Não duplicar registry
DECISION             ALREADY_PRESENT (Capability/Provider) | REJECT (Agent Registry paralelo)
Confidence           HIGH
```

### LI-MEMORY / Context persistence

```text
EXTERNAL_MECHANISM   ChatMemoryBuffer + serializable Context; state dict
PROBLEM_SOLVED       Continuidade intra/inter-run; pause HITL
OUR_CURRENT_MECHANISM gaabwiki-mem episodic; jobs/checkpoints PARTIAL; Evidence Bus
EQUIVALENCE          PARTIAL
GAP                  Working memory de agent run vs memória episódica de sessão
TRADE_OFF            Context pickle/json vs Evidence JSON gates
EVIDENCE             DOCUMENTED state; baseline Memory PARTIAL
APPLICABILITY        Serialização de run-state para HITL/checkpoints
DECISION             PROTOTYPE (run-state serialize) | DEFER (Mem0-style long memory)
Confidence           MEDIUM
```

### LI-HITL

```text
EXTERNAL_MECHANISM   wait_for_event + InputRequiredEvent/HumanResponseEvent
PROBLEM_SOLVED       Confirmação humana mid-tool
OUR_CURRENT_MECHANISM Policy/gates; Evidence; UNKNOWN interactive pause formal
EQUIVALENCE          PARTIAL / UNKNOWN
GAP                  Primitive first-class de waiter no Runtime
TRADE_OFF            Complexidade de resume vs segurança
EVIDENCE             DOCUMENTED agent_workflow_basic HITL
APPLICABILITY        Gates perigosos / promote-queue
DECISION             PROTOTYPE
Confidence           MEDIUM
```

### LI-RAG-CORE + LI-RAG-TOOL

```text
EXTERNAL_MECHANISM   Index/Retriever/QueryEngine; QueryEngineTool
PROBLEM_SOLVED       Ground answers in corpus; agent-triggered retrieval
OUR_CURRENT_MECHANISM GaabWiki + RAG gate (wiki: BM25 degraded)
EQUIVALENCE          PARTIAL (objetivo Knowledge grounds)
GAP                  Pipeline index/retrieve maduro vs RAG parcial MegaBrain
TRADE_OFF            Adoptar stack LI vs fortalecer wiki RAG próprio
EVIDENCE             DOCUMENTED; baseline Knowledge PARTIAL
APPLICABILITY        Padrão “retrieval as capability”; métricas eval
DECISION             ADAPT (padrão QueryEngine-as-Capability + evals) | REJECT (substituir Knowledge por LlamaIndex)
Confidence           HIGH
```

### LI-STREAM / LI-INSTR

```text
EXTERNAL_MECHANISM   stream_events + instrumentation dispatcher
PROBLEM_SOLVED       Progress UX + spans/events
OUR_CURRENT_MECHANISM summarizeExecutionTrace PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Event taxonomy rica (AgentInput/ToolCall/…)
TRADE_OFF            Vendor OTel vs trace mínimo
EVIDENCE             DOCUMENTED observability
APPLICABILITY        Enriquecer telemetry taxonomy
DECISION             ADAPT
Confidence           MEDIUM
```

### LI-EVAL

```text
EXTERNAL_MECHANISM   Faithfulness / relevancy / retrieval ranking metrics
PROBLEM_SOLVED       Medir alucinação e retrieval quality
OUR_CURRENT_MECHANISM Skill evals JSON; gaabwiki pytest PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Evals de grounding RAG sistemáticos
TRADE_OFF            LLM-as-judge custo vs cobertura
EVIDENCE             DOCUMENTED evaluating guide
APPLICABILITY        Gate Evidence para respostas grounded
DECISION             ADAPT (métricas faithfulness/relevancy como eval contracts)
Confidence           MEDIUM
```

### LI-MAXITER

```text
EXTERNAL_MECHANISM   max_iterations=20; early_stopping force|generate
PROBLEM_SOLVED       Bound autonomous loops
OUR_CURRENT_MECHANISM Policy / orchestrator limits (verify)
EQUIVALENCE          SUBSTANTIAL (intent)
GAP                  Confirmar defaults explícitos no Runtime
TRADE_OFF            force fail vs generate partial answer
EVIDENCE             OBSERVED DEFAULT_MAX_ITERATIONS=20
APPLICABILITY        Explicitar no Policy
DECISION             ALREADY_PRESENT (conceito) | ADAPT (early_stopping generate option)
Confidence           MEDIUM
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Dependência / framework LlamaIndex no Agent System | REJECT | HIGH |
| Event-driven step/event model (ideias) | ADAPT | HIGH |
| Capability ≡ Tool (sem Agent Registry) | ALREADY_PRESENT | HIGH |
| Multi-agent roles / PDA | ALREADY_PRESENT | HIGH |
| Handoff ACL (`can_handoff_to`) | ADAPT | MEDIUM |
| HITL wait_for_event + serialize | PROTOTYPE | MEDIUM |
| Run-state Context persistence | PROTOTYPE | MEDIUM |
| RAG Index stack wholesale | REJECT | HIGH |
| Retrieval-as-Capability + QueryEngine pattern | ADAPT | HIGH |
| Stream event taxonomy | ADAPT | MEDIUM |
| Instrumentation/OTel | ADAPT / DEFER (se telemetria mínima basta) | MEDIUM |
| Faithfulness/retrieval evals | ADAPT | MEDIUM |
| Mem0 / long-term memory integrations | DEFER | LOW |
| Custom planner XML Workflow | DEFER | MEDIUM |

## 8. UNKNOWN / CONFLICTS

Ver `UNKNOWNS.md`.

**CONFLICT (API surface):**

```text
CONFLICT:
  claim: Import path estável de Workflows
  source_a: Docs mostram `from workflows import Workflow, step` (package standalone)
  source_b: Docs e AgentWorkflow usam `from llama_index.core.workflow import ...`
  difference: Dual surface para estabilidade de API llama_index
  resolution: prefer_primary — ambos DOCUMENTED; AgentWorkflow OBSERVED usa llama_index.core.workflow
```

**CONFLICT (observability):**

```text
CONFLICT:
  claim: API canónica de observability
  source_a: instrumentation module (v0.10.20+) recommended
  source_b: CallbackManager legacy ainda documentado / algumas integrações
  difference: Período de depreciação
  resolution: prefer_primary — instrumentation; marcar legacy como transitional
```

## 9. Sources

1. https://developers.llamaindex.ai/python/framework/module_guides/workflow — Workflows (DOCUMENTED)  
2. https://developers.llamaindex.ai/python/framework/understanding/agent/multi_agent/index.md — multi-agent patterns  
3. https://developers.llamaindex.ai/python/framework/understanding/agent/state/index.md — Context/state  
4. https://developers.llamaindex.ai/python/examples/agent/agent_workflow_basic/index.md — FunctionAgent, stream, HITL  
5. https://developers.llamaindex.ai/python/framework/module_guides/observability/ — observability  
6. https://developers.llamaindex.ai/python/framework/module_guides/evaluating/index.md — evaluation  
7. https://raw.githubusercontent.com/run-llama/llama_index/main/llama-index-core/llama_index/core/agent/workflow/multi_agent_workflow.py — OBSERVED  
8. https://raw.githubusercontent.com/run-llama/llama_index/main/llama-index-core/llama_index/core/agent/workflow/base_agent.py — `DEFAULT_MAX_ITERATIONS=20` OBSERVED  
9. PyPI JSON `llama-index` / `llama-index-core` / `llama-index-workflows` — MEASURED 0.14.24 / 2.24.0  
10. Context7 `/websites/developers_llamaindex_ai_python`, `/run-llama/llama_index` — DOCUMENTED snippets  
11. Baseline: `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`

## 10. Handoff

- Para `agent-authoring`: **não** implementar LlamaIndex. Considerar (1) taxonomia de stream events, (2) handoff ACL no Policy, (3) HITL waiter prototype, (4) eval contracts faithfulness/relevancy para Knowledge gate.  
- Para `architect` / `adr`: ADRs só se PROTOTYPE HITL/run-state ou ADAPT RAG-as-Capability forem priorizados.  
- Para `PATTERN_MINING` / Lead: candidatar padrões *event-step runtime*, *handoff-as-tool*, *retrieval-as-tool*, *HITL wait_for_event*.  
- **Não implementado nesta skill.**
