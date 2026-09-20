# CROSS-SYSTEM-ANALYSIS — agent-architecture-mining

**Date:** 2026-09-18  
**Worker:** PATTERN_MINING + CROSS_SYSTEM_ANALYSIS  
**Corpus:** 21 dossiers (`research/targets/{local,external}/*/REPORT.md` + `MECHANISMS.yaml`)  
**Baseline:** `research/OUR-SYSTEM-BASELINE.md` (MegaBrain / CursorSKILLS Agent System)  
**Rules:** mechanism > feature · no rankings · no implementation · LOCAL vs EXTERNAL provenance · UNKNOWN when unsure · frequency ≠ quality  
**Do-not-change:** `research/DO-NOT-CHANGE.md`

---

## 1. Terminology taxonomy

| TERM (surface) | SEMANTIC ROLE | IMPLEMENTATIONS (examples) | EQUIVALENCE caution |
|----------------|---------------|----------------------------|---------------------|
| Agent / AIAgent / Runner | Unit that loops model↔tools until stop | OpenAI Agents SDK Runner; PydanticAI Agent; MAF AIAgent; CrewAI Agent; Cursor/Cline/Codex harness loop | **Not** MegaBrain “Agent” = WhatsApp bot. Ours: Agent *decides*, Capability *does*. Do not import vendor Agent class as registry. |
| Skill / Agent Skill / SKILL.md | Packaged procedural expertise with progressive load | Anthropic Agent Skills; Claude Code; Codex; Cursor; CrewAI; OpenHands; LOCAL: superpowers, mattpocock, brag | Equivalent *package idea* to ours; disclosure/bootstrap/trust differ. Not a second Capability Registry. |
| Tool / Function tool / Capability | Side-effectful callable with schema | MCP tools; OpenAI function tools; Cline/Codex builtins; MegaBrain Capability | MCP Tool ≈ Capability *wire*; MCP must not replace Capability/Provider registries. |
| Provider / Model / Profile | LLM (or gateway) abstraction | PydanticAI Model/Profile; Aider model layer; MegaBrain Provider Registry | Provider ≠ MCP server. Sticky-per-mode models ≠ Provider Registry redesign. |
| Policy / Guardrail / Approval / Permission profile | Authorize or gate side effects | Codex approval⊕sandbox; Cline tool policies; Roo auto-approve matrix; OpenAI guardrails; MegaBrain Policy Engine | Hooks/middleware are *adapters* into Policy, not parallel engines. |
| Sandbox / Workspace / SWE-ReX / SandboxAgent | Isolate execution from host | Codex OS sandbox; Claude Code Bash sandbox; OpenHands workspace; SWE-agent SWE-ReX; OpenAI SandboxAgent | Our baseline: UNKNOWN–PARTIAL. Product IDE sandbox ≠ orchestrator-owned sandbox. |
| Memory / Session / Store / Auto memory | Continuity of state across turns/threads | LlamaIndex memory; CrewAI unified memory; LangGraph Store; Claude auto-memory; gaabwiki-mem | Episodic wiki continuity ≠ agent working memory ≠ RAG Knowledge. Do not merge labels. |
| Knowledge / RAG / Index / Repo map | Ground answers/actions on corpora | LlamaIndex RAG; CrewAI Knowledge; Aider repomap; Roo Qdrant index; GaabWiki+RAG | Retrieval-as-tool ≠ replace Knowledge gate with vendor Index stack. |
| Orchestrator / Graph / Flow / Crew / Workflow | Control multi-step / multi-actor execution | LangGraph Pregel; LlamaIndex Workflow; CrewAI Flow/Crew; MAF Workflow; MegaBrain Orchestrator+IR | Embed foreign runtime = REJECT cluster. Adapt *ideas* (reducers, interrupt) only. |
| Handoff / Delegation / Subagent / Task | Transfer or fan-out work with context isolation | OpenAI handoffs vs agents-as-tools; LlamaIndex can_handoff_to; Cursor/Claude Task; Roo Boomerang; PDA roles | Handoff ACL ≠ roster of personas. Prompt-only “orchestrator persona” ≠ Runtime. |
| Checkpoint / RunState / Persist | Durable pause/resume | LangGraph checkpoint; OpenAI RunState; CrewAI persist; MAF checkpoints; Cline shadow-git | Shadow-git ≠ job checkpoints. Prefer single resume model. |
| Hooks / Middleware | Deterministic lifecycle intercept | Claude/Cursor/Codex hooks; OpenAI hooks; MAF middleware; LOCAL superpowers SessionStart | Soft prompt ≠ hook. Hooks enforce; skills advise. |
| Evidence / Guardrail output / Verdict / Ledger | Proof that a step succeeded | MegaBrain Evidence Bus; security-audit tri-verdict+ledger; Aider lint/test reflect; CrewAI task guardrails; PydanticAI validators | Tracing/OTel observes; Evidence *proves*. Do not replace Evidence with spans alone. |
| Rules / AGENTS.md / CLAUDE.md / Modes | Standing instructions / specialization packs | Cursor Rules; Claude CLAUDE.md; Codex AGENTS.md; Roo modes; Aider conventions | Rules channel ≠ Policy Engine; modes ≠ Agent Registry. |
| MCP Host/Client/Server | Protocol boundary for tools/resources/prompts | Spec + all major coding harnesses as hosts | Transports ADOPT *via host*; reimplement REJECT. |

---

## 2. Mechanism matrix

Values: `ABSENT` | `PRESENT` | `PARTIAL` | `UNKNOWN`  
Columns = selected independent targets + **Our System** (MegaBrain).  
Selected for coverage: LOCAL `superpowers`, `security-audit-skill`; EXTERNAL `codex`, `claude-code`, `cursor`, `openhands`, `langgraph`, `openai-agents-sdk`, `mcp`, `aider`, `swe-agent`, `crewai`.

| Mechanism (canonical) | superpowers (L) | security-audit (L) | codex (E) | claude-code (E) | cursor (E) | openhands (E) | langgraph (E) | openai-agents (E) | mcp (E) | aider (E) | swe-agent (E) | crewai (E) | **Our System** |
|----------------------|-----------------|--------------------|-----------|-----------------|------------|---------------|---------------|-------------------|---------|-----------|---------------|------------|----------------|
| Progressive skill disclosure | PRESENT | PARTIAL | PRESENT | PRESENT | PRESENT | PRESENT | ABSENT | PARTIAL | ABSENT* | ABSENT | ABSENT | PRESENT | PRESENT |
| Plan-before-mutate / Plan\|Act | PRESENT | PARTIAL | PARTIAL | PARTIAL | PRESENT | PRESENT | PARTIAL | PARTIAL | ABSENT | PRESENT | PARTIAL | PARTIAL | PRESENT |
| Isolated subagent / Task | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT | PARTIAL | PRESENT | ABSENT | PARTIAL | ABSENT | PRESENT | PRESENT |
| HITL approval gates | PRESENT | PARTIAL | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PRESENT |
| OS/workspace sandbox | ABSENT | UNKNOWN | PRESENT | PRESENT | UNKNOWN | PRESENT | ABSENT | PRESENT | PARTIAL† | ABSENT | PRESENT | PARTIAL | UNKNOWN–PARTIAL |
| Approval ⊕ sandbox duality | ABSENT | ABSENT | PRESENT | PARTIAL | PARTIAL | PRESENT | ABSENT | PARTIAL | PARTIAL | ABSENT | PARTIAL | ABSENT | PARTIAL |
| Lifecycle hooks (hard) | PRESENT | ABSENT | PRESENT | PRESENT | PRESENT | PARTIAL | PARTIAL | PRESENT | ABSENT | ABSENT | ABSENT | PARTIAL | PARTIAL |
| Hard loop / cost / iter bounds | PARTIAL | PRESENT | PARTIAL | PRESENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | ABSENT | PARTIAL | PRESENT | PRESENT | PARTIAL |
| Context compaction / condenser | PARTIAL | ABSENT | PRESENT | PRESENT | PRESENT | PRESENT | ABSENT | PARTIAL | ABSENT | PRESENT | PRESENT | ABSENT | PARTIAL |
| Checkpoint / durable resume | PARTIAL | PARTIAL | PARTIAL | PRESENT | PARTIAL | PRESENT | PRESENT | PRESENT | PARTIAL | PARTIAL | PARTIAL | PRESENT | PARTIAL |
| MCP host consumption | ABSENT | ABSENT | PRESENT | PRESENT | PRESENT | PARTIAL | ABSENT | PRESENT | PRESENT | ABSENT | ABSENT | PRESENT | PRESENT |
| Hierarchical project instructions | PRESENT | ABSENT | PRESENT | PRESENT | PRESENT | PARTIAL | ABSENT | ABSENT | ABSENT | PRESENT | ABSENT | ABSENT | PRESENT |
| Evidence / validation gates | PRESENT | PRESENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PRESENT | ABSENT | PRESENT | PRESENT | PRESENT | PRESENT |
| Stuck / unproductive-loop detector | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | PRESENT | ABSENT | ABSENT | ABSENT | PARTIAL | PARTIAL | ABSENT | ABSENT–UNKNOWN |
| State reducers / crash durability modes | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | PARTIAL | PRESENT | PARTIAL | ABSENT | ABSENT | ABSENT | PARTIAL | ABSENT–PARTIAL |
| Prompt-cache-safe history discipline | ABSENT | ABSENT | PRESENT | UNKNOWN | UNKNOWN | UNKNOWN | ABSENT | UNKNOWN | ABSENT | PRESENT | PRESENT | ABSENT | UNKNOWN |
| Handoff ACL / tool-group ACL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PRESENT | PARTIAL | ABSENT | PARTIAL | PARTIAL | PARTIAL |
| Structured output + retry budgets | ABSENT | PRESENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PRESENT | PARTIAL | PARTIAL | PARTIAL | PRESENT | PARTIAL |
| Repo structural map / summarized search | ABSENT | ABSENT | UNKNOWN | PARTIAL | PARTIAL | PARTIAL | ABSENT | ABSENT | ABSENT | PRESENT | PRESENT | ABSENT | PARTIAL |
| Eval harness (coding-agent) | PARTIAL | PARTIAL | UNKNOWN | UNKNOWN | UNKNOWN | PRESENT | ABSENT | ABSENT | ABSENT | PRESENT | PRESENT | ABSENT | PARTIAL |

\*MCP is a protocol, not a skill package format.  
†MCP Roots / host security annotations are host-enforced boundaries, not full OS sandboxes.

### Matrix notes (epistemic)

- **LOCAL** = corpus under `reverseEnginering` or audited local packages; **EXTERNAL** = third-party product/SDK/docs/code sampled in dossiers.
- Cells marked UNKNOWN reflect dossier/baseline honesty (esp. Cursor proprietary internals, our sandbox, cache discipline).
- Presence in many systems ≠ adopt; see Decision matrix and `patterns/` confidence.

---

## 3. Decision matrix (key patterns / mechanisms)

Vocabulary ONLY: `ALREADY_PRESENT` | `ADOPT` | `ADAPT` | `PROTOTYPE` | `DEFER` | `REJECT`

| Pattern / mechanism cluster | Decision | Rationale (compressed) | Primary provenance |
|----------------------------|----------|------------------------|--------------------|
| Skills as SKILL.md packages | ALREADY_PRESENT | Base format matches; improve disclosure/authoring | LOCAL+EXTERNAL |
| Capability + Provider registries | ALREADY_PRESENT | Recurring REJECT of second “agent/tool registry” | EXTERNAL cluster |
| Orchestrator + Capability IR / PDA | ALREADY_PRESENT | Covers Runner/graph/crew *roles* without embed | EXTERNAL REJECT-embed |
| Policy Engine (authorization) | ALREADY_PRESENT | Approval/guardrail/HITL map here; hooks as adapters | EXTERNAL |
| Evidence Bus | ALREADY_PRESENT | Stronger than prose-done; align ledger/verdict ideas | LOCAL security-audit + baseline |
| MCP via Cursor host (transports/OAuth) | ADOPT (host) / REJECT (reimplement) | Protocol at host boundary | EXTERNAL mcp |
| Progressive disclosure + list budgets | ADAPT + PROTOTYPE (budgets) | Near-universal; numbers need experiment | EXTERNAL anthropic/codex/cline + LOCAL |
| Plan\|Act / plan-before-mutate tool whitelist | ADAPT | Strengthen mode-gated mutation | EXTERNAL cline/cursor/openhands |
| Subagent isolation + summary handoff | ADAPT | Already PDA; tighten isolation contracts | EXTERNAL+LOCAL |
| Hooks → Policy adapters | ADAPT | Deterministic gates beat soft prompts | EXTERNAL claude/cursor/codex |
| Hard max_iter / cost / turn caps | ADAPT | Bound runaway loops; audit ours | EXTERNAL crewai/swe/claude |
| Context compaction + skill hygiene | PROTOTYPE | Widely present; our compaction UNKNOWN | EXTERNAL openhands/cline/codex |
| OS sandbox + refuse-if-unenforceable | PROTOTYPE | Baseline UNKNOWN–PARTIAL; high safety value | EXTERNAL codex/openhands/swe |
| Permission profiles (named posture) | PROTOTYPE | Codex beta; compose with Policy | EXTERNAL codex |
| Stuck detector | PROTOTYPE | Sparse but concrete (OpenHands); high leverage | EXTERNAL openhands |
| HITL RunState / interrupt+resume | PROTOTYPE | LangGraph/OpenAI/MAF; jobs PARTIAL | EXTERNAL |
| State channel reducers / durability modes | PROTOTYPE | LangGraph-specific clarity; crash edge cases | EXTERNAL langgraph |
| Fuzzy edit apply + reflect | PROTOTYPE | Aider coding-loop resilience | EXTERNAL aider |
| Critic / independent refute loops | ADAPT | PDA critic + security-audit Phase 5 | LOCAL+EXTERNAL |
| Handoff ACL (`can_handoff_to` / tool groups) | ADAPT | Formalize who may call whom | EXTERNAL llamaindex/roo/openai |
| Prompt-cache-safe history mutation | ADAPT | Cost; audit our packing | EXTERNAL codex/aider |
| Hierarchical AGENTS.md/CLAUDE.md discipline | ADAPT | Align rules vs Policy vs skills | EXTERNAL |
| Repo map / summarized ACI search | ADAPT | Context efficiency for coding | EXTERNAL aider/swe-agent |
| Scripts-as-deterministic tools (skills) | PROTOTYPE | Anthropic AAS-06 | EXTERNAL anthropic-agent-skills |
| Sticky model per mode | PROTOTYPE | Roo; routing idea only | EXTERNAL roo-code |
| Cloud / hub-spoke / app-server embed | DEFER | Product/ops; not core contracts | EXTERNAL |
| Cross-thread long-term Store / auto-memory SSOT | DEFER | Memory pollution risk; wiki already grounds | EXTERNAL |
| Whole foreign runtime (LangGraph/Crew/MAF/…) | REJECT | DO-NOT-CHANGE; equivalence NONE for core | EXTERNAL |
| Persona roster bulk / prompt-only orchestrator | REJECT | Over-agentization; agency-agents evidence | LOCAL agency-agents + EXTERNAL crewai |
| Leaderboards / stars as architecture SSOT | REJECT | Popularity ≠ mechanism quality | EXTERNAL aider |
| EnIGMA / offensive CTF tooling | REJECT | Out of scope / harmful for Agent System | EXTERNAL swe-agent |
| Equating MegaBrain ≡ Cursor product | REJECT | Harness we run inside | EXTERNAL cursor |

---

## 4. Cross-cutting observations (not rankings)

1. **Convergence on skills + MCP + subagents + HITL** across coding harnesses (EXTERNAL) with LOCAL process packs (superpowers, mattpocock) refining *invocation* and *authoring*.
2. **Divergence on sandbox depth**: OS-enforced (Codex/OpenHands/SWE-ReX) vs prompt/policy-only — MegaBrain gap is real (UNKNOWN–PARTIAL).
3. **Orchestration libraries** (LangGraph, CrewAI Flow, MAF Workflow, LlamaIndex Workflow) share *graph/interrupt/checkpoint* ideas but dossiers consistently **REJECT embed** as MegaBrain runtime.
4. **Evidence-first** practices recur (lint gates, guardrails, security ledger, verify-before-complete) and align with MegaBrain Evidence Bus — ADAPT contracts, don’t add parallel buses.
5. **Anti-pattern cluster:** duplicate registries, soft-policy-only, unbounded multi-agent chat, context/tool explosion, whole-runtime fashion.

---

## 5. Artefact index (this pass)

| Kind | Path | Count aim |
|------|------|-----------|
| Patterns | `research/patterns/P-NNN-*.md` | 12 |
| Anti-patterns | `research/anti-patterns/AP-NNN-*.md` | 8 |
| Architecture gaps | `research/architecture-gaps/GAP-NNN-*.md` | 8 |
| Hypotheses | `research/hypotheses/H-NNN-*.md` | 5 |
| Experiments | `research/experiments/E-NNN-*.md` | 5 |

---

## 6. Sources

- All 21 `targets/**/REPORT.md` + `MECHANISMS.yaml` (superpowers YAML has trailing orphan `)` — mechanisms still read via salvage; treat end-of-file as OBSERVED inventory).
- `OUR-SYSTEM-BASELINE.md`, `DO-NOT-CHANGE.md`
- Skill refs: `agent-architecture-mining/references/analysis-framework.md`, `output-schema.md`
