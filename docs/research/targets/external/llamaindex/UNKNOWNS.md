# UNKNOWNS — LlamaIndex TARGET_RESEARCH

Date: 2026-09-18  
Rule: every gap without primary evidence stays UNKNOWN (no invention).

## Access / method limitations

| ID | Unknown | Why |
|----|---------|-----|
| U-01 | Exact git commit SHA of `main` files read | Raw URLs without `git rev-parse`; content may drift |
| U-02 | Runtime behaviour under load / latency | No MEASURED benchmarks executed here |
| U-03 | TypeScript (`llamaindexts`) agent/workflow parity | Out of scope; not audited |
| U-04 | LlamaCloud / LlamaAgents hosted product internals | Commercial; docs skim only |
| U-05 | Security model of tool sandboxing | No OBSERVED isolation layer for arbitrary tools |

## Architecture unknowns

| ID | Unknown | Notes |
|----|---------|-------|
| U-06 | Precise durable workflow checkpoint format & guarantees | Docs mention “Writing Durable Workflows”; not deep-read this pass |
| U-07 | Resource(...) dependency injection semantics edge cases | Mentioned in workflows guide; not OBSERVED in AgentWorkflow path |
| U-08 | Full BaseMemory implementations inventory (beyond ChatMemoryBuffer / Mem0 example) | Only defaults + Mem0 example DOCUMENTED |
| U-09 | Whether `can_handoff_to=None` means “all” in all versions | OBSERVED check treats empty restriction; confirm across releases |
| U-10 | Interaction of structured_output_fn failures with StopEvent (warn vs fail) | OBSERVED warnings.warn path; product policy UNKNOWN |
| U-11 | Default Workflow timeout when `timeout=None` on AgentWorkflow | Passed through; numeric default not verified |
| U-12 | IngestionPipeline vs simple `from_documents` — production best practice | Many paths DOCUMENTED; no single canonical production recipe claimed here |

## Comparison unknowns (MegaBrain)

| ID | Unknown | Notes |
|----|---------|-------|
| U-13 | Exact orchestrator max-iteration / loop caps today | Baseline says Policy IMPLEMENTED — numeric defaults need CursorSKILLS audit |
| U-14 | Whether MegaBrain has any wait_for_human primitive | Baseline does not list HITL waiter → treat as UNKNOWN–ABSENT until audit |
| U-15 | GaabWiki RAG roadmap vs “adapt QueryEngineTool pattern” priority | Product decision; not this investigation |

## Conflicts (unresolved nuance)

| ID | Conflict | Resolution status |
|----|----------|-------------------|
| C-01 | Import `workflows` vs `llama_index.core.workflow` | Prefer both DOCUMENTED; Agent path uses core — UNRESOLVED for standalone package evolution |
| C-02 | instrumentation vs CallbackManager | Prefer instrumentation as current; legacy transitional — UNRESOLVED deprecation end date |
| C-03 | Docs stars table “flexibility” for multi-agent patterns | Marketing-adjacent DX table — treat as OPINION/DOCUMENTED UX guidance, not technical proof |

## Intentionally not investigated (scope)

- Full vector store connector matrix  
- LlamaParse / LlamaHub catalog completeness  
- Every deprecated agent API (`ReActAgent.from_tools` legacy paths)  
- Enterprise compliance / SOC2 of LlamaCloud  
- Cost economics of embeddings at scale  

If Lead needs closure: prioritize U-06 (durable), U-13–U-14 (MegaBrain audit), U-05 (tool sandbox).
