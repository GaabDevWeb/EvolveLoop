# DECISION-MATRIX

**Date:** 2026-09-18  
**Sources:** `CROSS-SYSTEM-ANALYSIS.md` §3 · `CROSS-INVESTIGATION-REVIEW.md` · `DO-NOT-CHANGE.md` · `OUR-SYSTEM-BASELINE.md` · 21 target dossiers  
**Vocabulary ONLY:** `ALREADY_PRESENT` | `ADOPT` | `ADAPT` | `PROTOTYPE` | `DEFER` | `REJECT`  
**Not a ranking.** Prefer ~340 YAML primary decisions over aggregate JSON inflation (1211).

| Mechanism | Our State | Evidence | Applicability | Decision |
|-----------|-----------|----------|---------------|----------|
| Skills as SKILL.md packages | IMPLEMENTED (`.cursor/skills`) | LOCAL+EXTERNAL dossiers | Core authoring | ALREADY_PRESENT |
| Capability + Provider registries | IMPLEMENTED_TESTED | REJECT-second-registry cluster | Core | ALREADY_PRESENT |
| Orchestrator + Capability IR / PDA | IMPLEMENTED_TESTED | REJECT-embed LangGraph/Crew/MAF/… | Core runtime | ALREADY_PRESENT |
| Policy Engine | IMPLEMENTED + DOCUMENTED | Approval/guardrail map; hooks as adapters | Authorization | ALREADY_PRESENT |
| Evidence Bus | IMPLEMENTED (JSON gates) | security-audit ledger/verdicts ADAPT shapes | Proof SSOT | ALREADY_PRESENT |
| GaabWiki / Knowledge grounding | PARTIAL (RAG degraded known) | REJECT vendor Knowledge-as-SSOT | Grounding | ALREADY_PRESENT |
| MCP via Cursor host (transports/OAuth) | PRESENT via host | mcp dossier | Host boundary | ADOPT (host) |
| Reimplement MCP transports in orchestrator | ABSENT (correct) | mcp REJECT | — | REJECT |
| Progressive disclosure + skill list budgets | PARTIAL | anthropic/codex/cline + LOCAL | Harness/authoring | ADAPT + PROTOTYPE (budgets) |
| Plan\|Act / plan-before-mutate whitelist | PARTIAL (≠ Task IR) | cline/cursor/openhands | Mutation safety | ADAPT |
| Subagent isolation + summary handoff | SUBSTANTIAL (PDA) | roo/openai/llamaindex + LOCAL | Multi-agent contracts | ADAPT |
| Hooks → Policy adapters | PARTIAL | claude/cursor/codex + superpowers | Enforcement | ADAPT |
| Hard max_iter / cost / turn caps | PARTIAL | crewai/swe/claude | Loop safety | ADAPT |
| Critic / independent refute | SUBSTANTIAL (PDA critic) | security-audit Phase 5 | Validation | ADAPT |
| Handoff ACL / tool-group ACL | PARTIAL | llamaindex/roo/openai | Who may call whom | ADAPT |
| Prompt-cache-safe history | UNKNOWN | codex/aider | Cost | ADAPT |
| Hierarchical AGENTS.md/CLAUDE.md discipline | PRESENT | coding harnesses | Instructions vs Policy | ADAPT |
| Repo map / summarized ACI search | PARTIAL | aider/swe-agent | Coding context | ADAPT |
| Context compaction + skill hygiene | UNKNOWN–PARTIAL | openhands/cline/codex | Context | PROTOTYPE |
| OS sandbox + refuse-if-unenforceable | UNKNOWN–PARTIAL | codex/openhands/swe | Safety | PROTOTYPE |
| Permission profiles (named posture) | PARTIAL | codex beta | Compose with Policy | PROTOTYPE |
| Stuck detector | ABSENT–UNKNOWN | openhands | Unproductive loops | PROTOTYPE |
| HITL RunState / interrupt+resume | PARTIAL (jobs) | LangGraph/OpenAI/MAF | Durable HITL | PROTOTYPE |
| State reducers / durability modes | ABSENT–PARTIAL | langgraph | Crash edges | PROTOTYPE |
| Fuzzy edit apply + reflect | ABSENT–PARTIAL | aider | Edit resilience | PROTOTYPE |
| Scripts-as-deterministic tools in skills | PARTIAL | anthropic AAS | Skill packages | PROTOTYPE |
| Sticky model per mode | ABSENT | roo (archived) | Routing idea | PROTOTYPE |
| Cloud / hub-spoke / app-server embed | ABSENT | cline/codex product | Ops | DEFER |
| Cross-thread Store / auto-memory SSOT | PARTIAL episodic only | claude/crew/llamaindex | Memory pollution risk | DEFER |
| Magentic / team fashion patterns | ABSENT | MAF | Optional later | DEFER |
| Whole foreign runtime embed | ABSENT (keep) | 9+ REJECT-embed | Core | REJECT |
| Second Agent/Tool registry | ABSENT (keep) | MCP/OpenAI/Cursor dossiers | Core | REJECT |
| Persona roster bulk / prompt-only orchestrator | ABSENT (keep) | agency-agents + crewai | Over-agentization | REJECT |
| Leaderboards/stars as architecture SSOT | ABSENT (keep) | aider | Popularity≠quality | REJECT |
| MegaBrain ≡ Cursor product | FALSE equivalence | cursor dossier | Identity | REJECT |
| EnIGMA / offensive CTF tooling | ABSENT | swe-agent | Out of scope | REJECT |
| Hyperframes / browser-builtin as core | ABSENT | brag / cline | Product deps | REJECT |

## Notes

- **Our State** composites: prefer `OUR-SYSTEM-BASELINE.md`; cells marked UNKNOWN require CursorSKILLS audit before Principle elevation (esp. sandbox — CROSS §1.3).  
- Subtypes matter: “handoff”, “plan”, “checkpoint”, “memory” are **not** single decisions — see CROSS-INVESTIGATION-REVIEW.  
- Experiments: `experiments/E-001`…`E-005` for PROTOTYPE cluster.
