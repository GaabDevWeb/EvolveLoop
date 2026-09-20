# DUPLICATION-ANALYSIS

**Date:** 2026-09-18  
**Rule:** Similar names ≠ duplicate mechanisms.

| A | B | Responsibilities | Shared boundary | Call path | Duplicate or complementary | Evidence |
|---|---|------------------|-----------------|-----------|----------------------------|----------|
| ExecutionPolicy | CapabilityAuthority | Schedule/retry/gates vs allow/deny/confirm side-effects | Both “policy” in docs | Engine uses both; only Deterministic enforces authority | **Complementary** (often conflated in docs) | EA-0004, EA-0005 |
| Engine Evidence[] | MegaBrain `memory/*/evidence/` | In-run proof objects vs PDA gate JSON files | Both called “Evidence Bus” | Engine does not write gate JSON | **Complementary / vocabulary collision** | EA-0006, EA-0007 |
| KnowledgeStore | MemoryStore | Durable learnings/search vs feature context yaml | Both under --data-dir | Separate modules | **Complementary** | knowledge-memory tests |
| KnowledgeStore | wiki deterministic search | Local md index vs external RAG CLI | knowledge.* capability | DeterministicProvider may call wiki | **Complementary layers** | EA-0009 |
| Orchestrator class (decide) | ExecutionEngine | Post-block decision vs schedule/execute loop | Both “orchestrator” | Engine owns loop; Orchestrator.decide for replan/continue | **Complementary** | orchestrator.test.ts |
| Agents/*.md | Capability IR nodes | Human/agent prompts vs executable graph nodes | “Agent System” branding | No call path between them in engine | **Not duplicates** — different layers | EA-0008 |
| Cursor hooks | In-engine hooks | Host lifecycle vs (absent) engine hooks | job pickup | Hooks call CLI | **Not duplicate** — host adapter | hooks OBSERVED |
| CursorSKILLS orchestrator | AGENTS/Cursor/orchestrator | Same package lineage | jobs/ only in AGENTS | Tree drift | **Version/sync drift** — not intentional dual runtime | EA-0003 |

**No second Capability Registry or second ExecutionEngine observed inside CursorSKILLS.**
