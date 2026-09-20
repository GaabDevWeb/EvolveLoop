# AGENT-ARCHITECTURE-PRINCIPLES

**Date:** 2026-09-18  
**Role:** Lead `PRINCIPLE_EXTRACTION` (agent-architecture-mining)  
**Corpus:** 21 dossiers + `CROSS-SYSTEM-ANALYSIS.md` + `CROSS-INVESTIGATION-REVIEW.md` + `OUR-SYSTEM-BASELINE.md` + `DO-NOT-CHANGE.md`  
**Rules:** mechanism > feature · no rankings · no implementation · principles only with sufficient evidence  
**Provenance classes:** **LOCAL_CORPUS** | **OFFICIAL_EXTERNAL**

### Pattern vs Principle (this document)

| Kind | Meaning here |
|------|----------------|
| **Pattern** | Recurring *mechanism shape* across ≥2–3 independent targets (Level-3). May still be ADAPT/PROTOTYPE vs MegaBrain. |
| **Principle** | Cross-cutting architectural constraint we treat as durable for MegaBrain *given* evidence + DO-NOT-CHANGE alignment. Patterns can support a Principle; a single Pattern ≠ Principle. |

**Not elevated to Principle (this pass):** OS sandbox depth, stuck detectors, compaction budgets, LangGraph reducers, sticky-per-mode models — recurrence or fit exists, but baseline audit / subtype hygiene still incomplete (`CROSS-INVESTIGATION-REVIEW` §1.3, §7). See Patterns `P-009`+ and `EXECUTIVE-FINDINGS.md`.

**Aggregate warning:** `_aggregate_decisions.json` totals (1211 decisions; ADOPT:32) are **inflated** (secondary decisions, dual-tags, theme_presence ≠ distinct mechanisms). Principles below are grounded in YAMLs/reports + CROSS artefacts, **not** raw aggregate counts.

---

## PRINCIPLE-01 — Single runtime, no foreign orchestrator embed

```yaml
id: PRINCIPLE-01
kind: Principle
principle: MegaBrain keeps one Orchestrator/Runtime + Capability IR; foreign graph/crew/workflow runtimes are ideas sources, not second cores.
problem: Product/SDK fashion pushes embedding LangGraph, CrewAI Flow, MAF Workflow, LlamaIndex Workflow, PydanticAI Agent runtime as “the” loop — creating dual-stack debt and registry collisions.
mechanism: Map external Runner/graph/crew *roles* onto existing Orchestrator + Task IR / PDA; REJECT package-as-runtime. Adapt interrupt/checkpoint/reducer *ideas* only through our persistence/HITL contracts.
evidence:
  - label: OBSERVED
    claim: CROSS decision matrix — whole foreign runtime = REJECT; reject_embed lists 9 targets
    source: CROSS-SYSTEM-ANALYSIS.md §3; findings/_aggregate_decisions.json reject_embed
  - label: DOCUMENTED
    claim: DO-NOT-CHANGE row Orchestrator / Capability IR / Task Graph
    source: DO-NOT-CHANGE.md
  - label: INFERRED
    claim: Dual-stack (Crew+Flow, OH V0/V1, AutoGen→MAF) is an anti-pattern of two runtimes
    source: CROSS-INVESTIGATION-REVIEW.md §7.4
observed_in:
  - OFFICIAL_EXTERNAL: langgraph, crewai, microsoft-agent-framework, llamaindex, pydanticai, openhands (Canvas-as-core REJECT in adversarial)
  - LOCAL_CORPUS: agency-agents (prompt-only orchestration REJECT)
counterexamples:
  - Thin adapters that call an external service *outside* MegaBrain core (product/ops) — still DEFER/REJECT for core embed
trade_offs:
  - Gain: one control plane, one evidence/policy path
  - Cost: must re-express useful graph ideas (interrupt, channels) in MegaBrain terms — slower than “pip install workflow”
failure_modes:
  - Silent second loop beside orchestrator
  - Equating Crew Task / AgentWorkflow with Task IR (false ALREADY_PRESENT)
our_system: ALREADY_PRESENT — Orchestrator + Capability IR / PDA (baseline IMPLEMENTED_TESTED)
evaluation: Principle holds if no ADR adds a second execution kernel without Level-4 gap + experiment
confidence: HIGH
```

---

## PRINCIPLE-02 — Singular Capability Registry and Provider Registry

```yaml
id: PRINCIPLE-02
kind: Principle
principle: Side-effectful callables and model backends enter through Capability Registry and Provider Registry only — no parallel “agent/tool/persona registry”.
problem: SDKs and persona packs tempt a second registry (Agent[Deps], roster markdown, MCP-as-registry, middleware tool bags).
mechanism: Treat MCP Tools as *wire* into host; SDK function-tools as capability shapes; persona files as Skills/instructions — never as a competing SSOT for “what can run”.
evidence:
  - label: OBSERVED
    claim: Recurring REJECT of duplicate registries / second agent registry across dossiers
    source: CROSS-SYSTEM-ANALYSIS.md §3; DO-NOT-CHANGE.md
  - label: OBSERVED
    claim: Terminology — Tool ≠ Capability Registry; MCP Tools semantic overlap ≠ wire replacement
    source: CROSS-INVESTIGATION-REVIEW.md §2.3, §8
observed_in:
  - OFFICIAL_EXTERNAL: mcp, openai-agents-sdk, cursor, pydanticai, claude-code, crewai
  - LOCAL_CORPUS: agency-agents (REJECT bulk roster-as-runtime)
counterexamples:
  - Host-native IDE builtins that MegaBrain does not own (Cursor tools) — consume, don’t re-register as second MegaBrain registry
trade_offs:
  - Gain: policy/evidence can bind one inventory
  - Cost: mapping foreign schemas into Capability contracts is ongoing work
failure_modes:
  - MCP host tools treated as Capability Registry replacement
  - Persona roster installed as Agent Registry
our_system: ALREADY_PRESENT — both registries baseline IMPLEMENTED(_TESTED for Capability)
evaluation: Any proposal for “Agent Registry” of personas fails unless it proves NONE equivalence with Skills+PDA
confidence: HIGH
```

---

## PRINCIPLE-03 — Policy authorizes; hooks and middleware only adapt

```yaml
id: PRINCIPLE-03
kind: Principle
principle: Authorization and side-effect gating live in the Policy Engine; lifecycle hooks/middleware are deterministic adapters into Policy — not parallel engines or soft-prompt substitutes.
problem: Products mix approval UX, OS sandbox, tool ACL, LLM guardrails, and prose “Iron Laws” under one “permissions” word — inviting soft-policy-only failures.
mechanism: Route HITL/approval/guardrail *decisions* through Policy; use hooks (SessionStart, pre-tool) to *enforce* Policy outcomes. Prompt gates remain advisory unless backed by hard intercept.
evidence:
  - label: DOCUMENTED
    claim: DO-NOT-CHANGE — Policy Engine; hooks as adapters not replacements
    source: DO-NOT-CHANGE.md
  - label: OBSERVED
    claim: Claude/Cursor/Codex hooks ADAPT→policy pattern; superpowers adversarial — Iron Laws ≠ Policy Engine
    source: CROSS-SYSTEM-ANALYSIS.md §3; CROSS-INVESTIGATION-REVIEW.md §5.7
  - label: OBSERVED
    claim: False pattern — Guardrail (schema retry) ≠ OS permission profiles ≠ UX auto-approve
    source: CROSS-INVESTIGATION-REVIEW.md §6
observed_in:
  - OFFICIAL_EXTERNAL: claude-code, cursor, codex, cline, roo-code, openai-agents-sdk, pydanticai
  - LOCAL_CORPUS: superpowers (hard hooks PRESENT; prompt gates risk)
counterexamples:
  - Vendor LLM “guardrail” classifiers as *inputs* to Policy (adapter) — OK if Policy remains SSOT
trade_offs:
  - Gain: enforceable, auditable authorization
  - Cost: more wiring than paste-into-system-prompt
failure_modes:
  - Soft-policy-only (prose gates without intercept)
  - Middleware MAF equated to Policy Engine (false equivalence)
our_system: ALREADY_PRESENT — Policy Engine DOCUMENTED+IMPLEMENTED; Hooks PARTIAL
evaluation: Residual gap is adapter coverage / orthogonality with sandbox (Pattern P-009), not replacing Policy
confidence: HIGH
```

---

## PRINCIPLE-04 — Evidence proves; telemetry only observes

```yaml
id: PRINCIPLE-04
kind: Principle
principle: Step success is proven by Evidence Bus (structured gates/artifacts/verdicts). Tracing/OTel may export spans but must not become the completion SSOT.
problem: Systems equate “done” with prose, auto-memory, or span presence — weak fidelity for agentic coding and audits.
mechanism: Keep JSON/schema gates on disk (or equivalent contracts); ADAPT ledger/tri-verdict/verify-before-complete ideas into Evidence — do not add a parallel bus.
evidence:
  - label: OBSERVED
    claim: Evidence/validation gates recur; security-audit ledger/verdicts ADAPT; baseline Evidence Bus ALREADY_PRESENT
    source: CROSS-SYSTEM-ANALYSIS.md §2–§4; LOCAL security-audit-skill; DO-NOT-CHANGE.md
  - label: OBSERVED
    claim: Auto-memory / unified memory ≠ Evidence Bus (explicit REJECT/DEFER cluster)
    source: CROSS-INVESTIGATION-REVIEW.md §1.7, §8
observed_in:
  - LOCAL_CORPUS: security-audit-skill, superpowers (verify-before-done)
  - OFFICIAL_EXTERNAL: aider (lint/test reflect), crewai task guardrails, pydanticai validators, openai-agents structured final
counterexamples:
  - MEASURED SWE-bench scores — eval harness, not per-step Evidence SSOT
trade_offs:
  - Gain: deterministic “done” contracts
  - Cost: authoring gate schemas; latency of verify loops
failure_modes:
  - Replacing Evidence with OTel alone
  - Persona “Reality Checker” ethos mistaken for enforcement
our_system: ALREADY_PRESENT — Evidence Bus operational contract
evaluation: ADAPT external verdict/ledger *shapes* only if they strengthen existing gates
confidence: HIGH
```

---

## PRINCIPLE-05 — Separate Knowledge, Memory, and Checkpoint semantics

```yaml
id: PRINCIPLE-05
kind: Principle
principle: Grounding corpora (Knowledge/wiki/RAG), episodic continuity (Memory/session), and durable pause/resume (Checkpoint/RunState) solve different problems — do not merge labels or SSOTs.
problem: Vendor “memory” modules and graph checkpoints get proposed as replacements for GaabWiki grounding or Evidence; file-rollback “checkpoints” get confused with thread durability.
mechanism: Keep GaabWiki + Knowledge gate for grounding; episodic mem for continuity only; job/thread checkpoints for resume; REJECT Knowledge-as-SSOT from LlamaIndex/CrewAI packages; DEFER cross-thread auto-memory stores.
evidence:
  - label: OBSERVED
    claim: Terminology collisions Memory/Checkpoint/Knowledge across 21 dossiers
    source: CROSS-INVESTIGATION-REVIEW.md §2.4, §6
  - label: OBSERVED
    claim: LI-RAG-CORE / crewai Knowledge REJECT; LI-RAG-TOOL ADAPT; checkpoint decisions split ADAPT vs DEFER by subtype
    source: CROSS-INVESTIGATION-REVIEW.md §1.4, §1.7; DO-NOT-CHANGE.md
observed_in:
  - OFFICIAL_EXTERNAL: llamaindex, crewai, langgraph, claude-code (auto-memory), cursor (file ckpt), cline (shadow-git)
  - LOCAL_CORPUS: baseline gaabwiki-mem PARTIAL continuity
counterexamples:
  - Retrieval-*as-tool* that feeds Knowledge gate (ADAPT) — not a merged memory SSOT
  - Aider repomap — structural context map, not classic RAG (must not fuse)
trade_offs:
  - Gain: correct failure diagnosis (pollution vs stale ground vs lost resume)
  - Cost: three surfaces to maintain instead of one “memory” product feature
failure_modes:
  - Memory pollution from unified LLM-curated stores
  - Treating shadow-git as job checkpoint
our_system: Knowledge PARTIAL; Memory PARTIAL; Persistence PARTIAL — labels already separated in baseline
evaluation: Any ADR merging these three requires explicit problem statement per axis
confidence: HIGH
```

---

## PRINCIPLE-06 — Consume MCP (and similar protocols) at the host boundary

```yaml
id: PRINCIPLE-06
kind: Principle
principle: MCP transports/OAuth/host consent are adopted via the Cursor (or equivalent) host; MegaBrain must not reimplement protocol stacks in the orchestrator core.
problem: ADOPT noise in aggregates and “we need MCP” pressure push reimplementation or treating MCP Tools as Capability Registry.
mechanism: ADOPT host-level transport/consent; map allowed tools into Capability/Policy; REJECT reimplement transports inside orchestrator.
evidence:
  - label: OBSERVED
    claim: mcp dossier — ADOPT transports on host; REJECT reimplement; semantic ALREADY_PRESENT ≠ wire
    source: CROSS-INVESTIGATION-REVIEW.md §1.6; CROSS-SYSTEM-ANALYSIS.md §3; DO-NOT-CHANGE.md
  - label: INFERRED
    claim: Aggregate ADOPT:32 overstates clean YAML ADOPT (inflation warning)
    source: CROSS-INVESTIGATION-REVIEW.md meta-nota + §1.6
observed_in:
  - OFFICIAL_EXTERNAL: mcp, cursor, claude-code, codex, crewai, openai-agents-sdk, roo-code
counterexamples:
  - Non-Cursor hosts for MegaBrain (future) — still host-boundary, not core reimplement
trade_offs:
  - Gain: security/consent stays with host; less dual maintenance
  - Cost: dependency on host MCP quality; U-03 executor depth still UNKNOWN
failure_modes:
  - Extrapolating “ADOPT MCP” to “implement transports in MegaBrain”
  - Assuming host MCP executor depth without audit
our_system: ALREADY_PRESENT semantic consumption; ADOPT residual = host transports/OAuth as applicable
evaluation: Revisit only if MegaBrain leaves Cursor host — Principle still “host boundary”, not “core protocol”
confidence: HIGH
```

---

## PRINCIPLE-07 — Skill packages ≠ harness activation

```yaml
id: PRINCIPLE-07
kind: Principle
principle: SKILL.md progressive packages are content/contracts we already have; mandatory discovery, SessionStart bootstrap, and list budgets are harness mechanisms — improve invocation without rebranding Skills as a second Capability Registry.
problem: Investigators collide ALREADY_PRESENT (format) with ADAPT (bootstrap/mandatory invoke); soft skills stay “dead” without harness activation.
mechanism: Keep Agent Skills package shape; ADAPT progressive disclosure hygiene + hard bootstrap/hooks where evidence shows dead skills; separate MCP Prompts from Skills.
evidence:
  - label: OBSERVED
    claim: Package ALREADY_PRESENT across AAS/Claude/Cursor/mattpocock/crewai; harness ADAPT dominated by superpowers SessionStart / mandatory invoke
    source: CROSS-INVESTIGATION-REVIEW.md §1.5; CROSS-SYSTEM-ANALYSIS.md §2–§3
  - label: DOCUMENTED
    claim: DO-NOT-CHANGE — Skills as SKILL.md; improve invocation/disclosure rather than rebrand
    source: DO-NOT-CHANGE.md
observed_in:
  - LOCAL_CORPUS: superpowers, mattpocock-skills, brag (AUX)
  - OFFICIAL_EXTERNAL: anthropic-agent-skills, claude-code, cursor, codex, openhands, cline, crewai
counterexamples:
  - CrewAI “Skills” EQUIVALENT claims — format-ish only; do not treat as harness parity
trade_offs:
  - Gain: clearer residual work (harness) without format churn
  - Cost: hooks/bootstrap complexity; trust/authoring still open
failure_modes:
  - Closing “skills done” because SKILL.md exists while SessionStart absent
  - Collapsing Skills with MCP prompts
our_system: Skills IMPLEMENTED as packages; Hooks PARTIAL — residual = harness
evaluation: Pattern P-001 supports this Principle; budgets remain PROTOTYPE numbers
confidence: HIGH
```

---

## PRINCIPLE-08 — Distinguish handoff control subtypes before equating multi-agent

```yaml
id: PRINCIPLE-08
kind: Principle
principle: Multi-actor work is not one mechanism. At minimum distinguish (1) manager-retains / agents-as-tools, (2) peer ownership transfer, (3) summary-return handoff — and map each to PDA/Task contracts explicitly.
problem: ALREADY_PRESENT on “subagents” collides with ADAPT on handoff ACL; Boomerang summary ≠ transfer_to_* ≠ hierarchical AgentTools — false Level-3 collapse.
mechanism: Require subtype tag in any Pattern/ADR; tighten isolation + ACL (`can_handoff_to` / tool groups) as ADAPT on top of PDA — do not import persona rosters or hub-spoke IDE runtimes as architecture.
evidence:
  - label: OBSERVED
    claim: Investigator contradiction handoff “already have” vs “missing contract”; taxonomy of handoff senses
    source: CROSS-INVESTIGATION-REVIEW.md §1.1, §2.6
  - label: OBSERVED
    claim: OpenAI handoffs vs as_tool clarity; Roo Boomerang summary fidelity risk; agency-agents REJECT roster-as-runtime
    source: CROSS-SYSTEM-ANALYSIS.md §1, §3; LOCAL agency-agents
observed_in:
  - OFFICIAL_EXTERNAL: openai-agents-sdk, llamaindex, roo-code, crewai, cursor, claude-code, microsoft-agent-framework
  - LOCAL_CORPUS: superpowers SDD controller, agency-agents
counterexamples:
  - Pure documentation NEXUS templates (agency-agents) — not runtime handoff
trade_offs:
  - Gain: correct Policy/Evidence ownership across actors
  - Cost: more design work than “enable multi-agent”
failure_modes:
  - Context poisoning via fat parent context + lossy summary
  - Over-agentization / unbounded multi-agent chat
our_system: ALREADY_PRESENT PDA Task roles; residual ADAPT = isolation + handoff ACL contracts
evaluation: No Principle claiming “we have handoffs” without naming subtype
confidence: MEDIUM
```

---

## PRINCIPLE-09 — Prefer role contracts (PDA) over persona-roster architecture

```yaml
id: PRINCIPLE-09
kind: Principle
principle: Multi-agent specialization is expressed as PDA/Task role contracts (plan/exec/gate/explore/critic/librarian), not as bulk persona markdown runtimes or prompt-only “orchestrator modes”.
problem: LOCAL agency-agents and EXTERNAL crew/hub-spoke products push roster tourism and empty-tools orchestrator personas as architecture.
mechanism: REJECT persona roster bulk and prompt-only orchestrator as runtime; ADAPT critic/refute loops into existing PDA critic + Evidence; keep Modes/Rules as instruction channels ≠ Policy/Agent Registry.
evidence:
  - label: OBSERVED
    claim: agency-agents REJECT prompt-only orchestration; crew container / magentic DEFER/REJECT cluster
    source: DO-NOT-CHANGE.md; CROSS-SYSTEM-ANALYSIS.md §3; CROSS-INVESTIGATION-REVIEW.md §1.8
  - label: OBSERVED
    claim: False equivalence Architect/editor pairing ≠ PDA; Crew Task ≠ Task IR
    source: CROSS-INVESTIGATION-REVIEW.md §8
observed_in:
  - LOCAL_CORPUS: agency-agents
  - OFFICIAL_EXTERNAL: crewai, cline (hub-spoke DEFER), microsoft-agent-framework (Magentic DEFER), roo-code (orchestrator mode)
counterexamples:
  - Skill packs that teach a role (mattpocock/superpowers) — content, not roster runtime
trade_offs:
  - Gain: bounded roles with Evidence/Policy hooks
  - Cost: less “download 50 agents” DX theater
failure_modes:
  - Over-agentization; unnecessary orchestration
  - Equating Cursor/Claude subagent UX with dual-verdict ledger SDD
our_system: ALREADY_PRESENT PDA roles IMPLEMENTED
evaluation: Critic/refute ADAPT allowed; roster embed REJECT remains
confidence: HIGH
```

---

## Index

| ID | Title | Kind | Confidence | Our posture (compressed) |
|----|-------|------|------------|----------------------------|
| PRINCIPLE-01 | Single runtime | Principle | HIGH | ALREADY_PRESENT; REJECT embed |
| PRINCIPLE-02 | Singular registries | Principle | HIGH | ALREADY_PRESENT |
| PRINCIPLE-03 | Policy SSOT; hooks adapt | Principle | HIGH | ALREADY_PRESENT; ADAPT adapters |
| PRINCIPLE-04 | Evidence proves | Principle | HIGH | ALREADY_PRESENT; ADAPT shapes |
| PRINCIPLE-05 | Knowledge ≠ Memory ≠ Checkpoint | Principle | HIGH | Keep separation; REJECT vendor Knowledge SSOT |
| PRINCIPLE-06 | MCP at host boundary | Principle | HIGH | ADOPT host / REJECT reimplement |
| PRINCIPLE-07 | Skill package ≠ harness | Principle | HIGH | ALREADY_PRESENT package; ADAPT harness |
| PRINCIPLE-08 | Handoff subtypes | Principle | MEDIUM | ALREADY_PRESENT PDA; ADAPT contracts |
| PRINCIPLE-09 | PDA over persona rosters | Principle | HIGH | ALREADY_PRESENT; REJECT roster runtime |

**Supporting Patterns:** `research/patterns/P-001` … `P-012` (mechanism detail; not automatically Principles).

**Epistemic note:** Principle statements above are **INFERRED** consolidations from **OBSERVED/DOCUMENTED** dossier claims; confidence reflects recurrence + DO-NOT-CHANGE alignment, not runtime MEASURED on MegaBrain.
