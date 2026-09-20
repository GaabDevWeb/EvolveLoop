# EXECUTIVE-FINDINGS — agent-architecture-mining Lead synthesis

**Date:** 2026-09-18  
**Inputs:** 21 target dossiers · `CROSS-INVESTIGATION-REVIEW.md` · `CROSS-SYSTEM-ANALYSIS.md` · `OUR-SYSTEM-BASELINE.md` · `DO-NOT-CHANGE.md` · `FUTURE-RESEARCH-TARGETS.md` · `findings/_aggregate_decisions.json`  
**Corpus:** not modified · **no Agent System implementation**  
**Provenance:** claims cite **LOCAL_CORPUS** vs **OFFICIAL_EXTERNAL**; consolidations marked **INFERRED** where interpretive

---

## Aggregate inflation warning (read first)

| Signal | Value | How to read |
|--------|-------|-------------|
| `_aggregate_decisions.json` decision_totals | **1211** rows | **INFERRED inflation** — secondary decisions, REPORT tables, dual-tags (`ALREADY_PRESENT`+`ADAPT` on same mechanism). ≠ “1211 mechanisms”. |
| ADOPT total in JSON | **32** | Overstates clean primary `decision: ADOPT` in machine-readable YAMLs (CROSS review: few clean ADOPTs; MCP host is the clear ADOPT cluster). |
| `theme_presence_in_reports` (skills/handoff/evidence/… = 21/21) | Coverage of **investigator lens** | **Not** 21 independent mechanism discoveries. |
| Parseable `MECHANISMS.yaml` | ~340 primary decisions | Prefer this scale over 1211 for volume talk. |

**Rule:** use CROSS matrices + DO-NOT-CHANGE + Principles for decisions; use aggregate only as a rough heat-map.

---

## What did we learn?

1. **Convergence (harness world):** progressive Skills, MCP-as-host-tools, subagent/Task isolation, HITL/approval, and verify/reflect loops recur across **OFFICIAL_EXTERNAL** coding agents and **LOCAL_CORPUS** process packs — but **names collide** (Agent/Skill/Tool/Memory/Workflow/Handoff/Checkpoint are not interchangeable).
2. **MegaBrain’s core bet is validated, not obsolete:** Capability + Provider registries, Orchestrator + IR/PDA, Policy Engine, Evidence Bus, Skills packages, GaabWiki grounding — map cleanly to external *roles* without embedding foreign runtimes (**REJECT embed** cluster, 9 targets listed in aggregate).
3. **Real residuals are contracts and enforcement depth**, not missing fashion frameworks: handoff *subtypes*, plan/act *vs* Task IR, approval⊕sandbox⊕ACL orthogonality, harness bootstrap for Skills, OS sandbox UNKNOWN–PARTIAL, stuck/compaction prototypes.
4. **Anti-duplication worked:** dossiers consistently refuse second orchestrator / RAG-framework-as-Knowledge-SSOT / persona-roster-as-runtime / leaderboard-as-architecture.
5. **Epistemic hygiene is uneven but usable:** no absolute FAIL on methodology; many OFFICIAL closed products are DOCUMENTED-heavy — do not promote DOCUMENTED_ONLY single-target claims to Principles.

---

## Which mechanisms recur?

(Recurrence = Pattern candidates; frequency ≠ quality.)

| Recurring mechanism cluster | Provenance mix | Notes |
|----------------------------|----------------|-------|
| Progressive skill packages | LOCAL + EXTERNAL | Package vs harness must split |
| Subagent / Task delegation | LOCAL + EXTERNAL | PDA covers role; isolation residual |
| MCP host consumption | EXTERNAL (+ semantic LOCAL n/a) | ADOPT host / REJECT reimplement |
| HITL / approval / guardrails | EXTERNAL + LOCAL | Orthogonal to OS sandbox |
| Plan-before-mutate / Plan\|Act | EXTERNAL + LOCAL | ≠ compiled Task IR |
| Checkpoint / durable resume | EXTERNAL | File ckpt ≠ thread ckpt ≠ shadow-git |
| Evidence / verify / validators | LOCAL strong + EXTERNAL | Align to Evidence Bus |
| Reject second registry/runtime | EXTERNAL + LOCAL | Positive methodological finding |
| Compaction / condenser | EXTERNAL | Our compaction UNKNOWN |
| Hard iter/cost/turn caps | EXTERNAL | ADAPT bounds |
| Repo structural map | EXTERNAL (aider/swe) | ≠ classic RAG |
| Lifecycle hard hooks | EXTERNAL + LOCAL superpowers | Soft prompt ≠ hook |

Canonical Pattern files: `research/patterns/P-001` … `P-012`.

---

## Which appear contextually useful (to MegaBrain)?

| Useful *now* as idea | Decision posture | Why contextual |
|---------------------|------------------|----------------|
| Skill harness bootstrap / progressive budgets | ADAPT + PROTOTYPE (numbers) | Packages already present |
| Handoff ACL + isolation contracts (subtyped) | ADAPT | PDA exists; semantics incomplete |
| Hooks → Policy adapters | ADAPT | Soft gates fail (LOCAL adversarial) |
| Hard loop/cost caps | ADAPT | Runaway risk shared |
| Critic / independent refute | ADAPT | PDA critic + security-audit |
| Repo map / summarized ACI search | ADAPT | Coding context efficiency |
| Prompt-cache-safe history discipline | ADAPT | Cost; ours UNKNOWN |
| OS sandbox + refuse-if-unenforceable | PROTOTYPE | Baseline UNKNOWN–PARTIAL; safety leverage |
| Permission profiles (named posture) | PROTOTYPE | Compose with Policy (Codex) |
| Stuck detector | PROTOTYPE | Sparse but high leverage (OpenHands) |
| HITL interrupt + durable RunState | PROTOTYPE | Jobs PARTIAL |
| Context compaction hygiene | PROTOTYPE | Widely present externally |
| MCP via host transports/OAuth | ADOPT (host only) | Protocol boundary |

---

## Strong evidence vs hypotheses?

### Stronger (OBSERVED across multiple dossiers / source-read, or LOCAL corpus)

- REJECT embed foreign orchestrator/runtime  
- Singular Capability/Provider registries  
- Skills `SKILL.md` package shape already ours  
- Evidence-first / verify-before-done alignment with Evidence Bus  
- MCP reimplement REJECT; host consume ADOPT  
- Terminology false friends (handoff/plan/checkpoint/memory) — CROSS §6  
- Persona roster / prompt-only orchestrator as architecture — REJECT  

### Weaker / DOCUMENTED_ONLY / thin OBSERVED — treat as **hypotheses** until audit

- Claude Code / MAF / AAS production behavior (docs-heavy)  
- Codex multi-agent thin OBSERVED; App ≠ CLI  
- OpenHands stuck defaults without `run_executed`  
- Superpowers vendor MEASURED token claims (not re-measured)  
- Compaction/list budget *numbers*  
- Sticky model-per-mode (Roo) as routing idea  
- State channel reducers as MegaBrain durability model  
- Fuzzy edit apply (Aider) transfer to our apply path  

---

## Which repeatedly fail / anti-patterns?

| Anti-pattern | Why it fails | Decision |
|--------------|--------------|----------|
| Second orchestrator / dual-stack runtime | Control + evidence split; lineage debt | REJECT embed |
| Duplicate registries (tools/agents/personas) | Policy/Evidence cannot bind one inventory | REJECT |
| Soft-policy-only (prose Iron Laws) | Not enforceable | ADAPT hooks→Policy; don’t replace Policy |
| Equating tracing/auto-memory with Evidence | False “done” | REJECT as SSOT |
| Collapsing handoff subtypes | Wrong ownership/fidelity | Normalize before ADR |
| Collapsing plan UI / prompt plan / Task IR | False ALREADY_PRESENT | Keep distinct |
| Vendor RAG/Knowledge package as Knowledge SSOT | Pollution / bypass wiki gate | REJECT |
| Over-agentization / unbounded multi-agent chat | Cost, stall, context poison | REJECT/DEFER product shells |
| Popularity/stars/leaderboards as architecture SSOT | Non-causal | REJECT |
| Equating MegaBrain ≡ Cursor product | Identity error | REJECT |
| Offensive CTF / EnIGMA-class tooling in Agent System | Out of scope / harmful | REJECT |

(Detailed AP files may land later; themes above are **OBSERVED** in CROSS anti-pattern cluster §4–§6.)

---

## What our architecture already solves?

From baseline + ALREADY_PRESENT consensus (with residual honesty):

| Mechanism | Baseline status | Research residual |
|-----------|-----------------|-------------------|
| Capability + Provider registries | IMPLEMENTED(_TESTED) | Mapping foreign schemas |
| Orchestrator + Task IR / PDA roles | IMPLEMENTED(_TESTED) | Handoff subtype contracts |
| Policy Engine | DOCUMENTED + IMPLEMENTED | Hook adapter coverage |
| Evidence Bus | Operational contract | Ledger/verdict shape ADAPT |
| Skills as SKILL.md | IMPLEMENTED | Harness bootstrap ADAPT |
| MCP semantic consumption | PRESENT via host | Transport/OAuth ADOPT host; executor depth UNKNOWN |
| GaabWiki Knowledge gate | DOCUMENTED + PARTIAL | Don’t replace with vendor memory |
| Multi-agent via PDA Task | IMPLEMENTED | Isolation/summary fidelity |

---

## Actual gaps?

| Gap | Baseline | Research signal | Blocker |
|-----|----------|-----------------|---------|
| OS / workspace sandbox owned by orchestrator | UNKNOWN–PARTIAL | Strong EXTERNAL PROTOTYPE pressure | Re-audit CursorSKILLS sandbox before Principle |
| Hard hooks coverage / SessionStart skill activation | Hooks PARTIAL | LOCAL superpowers ADAPT | — |
| Job/thread durable interrupt-resume model | Persistence PARTIAL | LangGraph/OAI/MAF PROTOTYPE | Subtype file vs thread vs git |
| Stuck / unproductive-loop detector | ABSENT–UNKNOWN | OpenHands PROTOTYPE | Sparse recurrence |
| Context compaction discipline | PARTIAL/UNKNOWN | EXTERNAL PROTOTYPE | Numbers need experiment |
| Handoff ACL formalization | PARTIAL | EXTERNAL ADAPT | Subtype taxonomy |
| Repo structural map | PARTIAL | Aider/SWE ADAPT | Don’t invent Knowledge ABSENT |
| Prompt-cache-safe packing | UNKNOWN | Codex/Aider ADAPT | Audit packing |
| Telemetry/evals depth | PARTIAL | OTel ADAPT as export only | — |
| Fragile ALREADY_PRESENT | — | Many cite baseline without fresh orchestrator audit | Re-audit (CROSS §10) |

---

## Which justify prototypes?

| Candidate | Why prototype | Evidence quality |
|-----------|---------------|------------------|
| OS sandbox + refuse-if-unenforceable | Safety; baseline UNKNOWN | EXTERNAL OBSERVED/DOCUMENTED mix — **prototype after audit** |
| Permission profiles composed with Policy | Named postures (Codex) | MEDIUM |
| Stuck / stall detector | High leverage, sparse | MEDIUM–LOW recurrence |
| Compaction + skill list budgets | Near-universal externally | Numbers = experiment |
| HITL RunState interrupt/resume | Jobs PARTIAL | MEDIUM |
| State reducers / durability modes | Crash edges | LangGraph-specific — careful transfer |
| Fuzzy edit + reflect | Coding resilience | Aider-specific |
| Scripts-as-deterministic tools in skills | AAS-06 | DOCUMENTED-heavy |
| Sticky model per mode | Routing idea only | LOW–MEDIUM; Roo |

---

## Which reject?

| Reject target | Reason |
|---------------|--------|
| Embed LangGraph / CrewAI Flow / MAF Workflow / LlamaIndex Workflow / PydanticAI runtime as MegaBrain core | Dual runtime; DO-NOT-CHANGE |
| Second Agent/Tool/Persona registry | Duplicate SSOT |
| LlamaIndex/CrewAI Knowledge/RAG stack as Knowledge SSOT | Gate bypass / pollution |
| Unified LLM-curated long-term memory as Evidence/Knowledge | Pollution; DEFER stores |
| Persona roster bulk as architecture | Over-agentization |
| Prompt-only orchestrator mode as Runtime | Empty control |
| Reimplement MCP transports in orchestrator | Host boundary Principle |
| MegaBrain ≡ Cursor product | Identity |
| Leaderboards/stars as architecture requirements | Non-causal |
| EnIGMA / offensive CTF tooling in Agent System | Scope/harm |
| Hyperframes / enterprise remote-config into core | Fashion / AUX |

---

## Principles sufficiently supported?

**Yes — nine Principles** in `AGENT-ARCHITECTURE-PRINCIPLES.md` (8 HIGH, 1 MEDIUM), each tied to DO-NOT-CHANGE and multi-target evidence.

**Not yet Principles (remain Patterns / PROTOTYPE):** OS sandbox consolidation, stuck detection, compaction budgets, sticky models, LangGraph reducer fidelity — per CROSS review hygiene (§1.3, §7, §10).

---

## What should NOT be changed?

See **`DO-NOT-CHANGE.md`** (authoritative short list). Compressed:

- Capability Registry + Provider Registry  
- Orchestrator / Runtime + Capability IR / Task Graph  
- Policy Engine (hooks adapt, don’t replace)  
- Evidence Bus (tracing ≠ SSOT)  
- PDA roles  
- GaabWiki grounding + Knowledge gate  
- Skills as `SKILL.md` packages  
- MCP via host, not reimplemented  
- Separation MegaBrain ≠ Cursor product  

Any ADR touching these rows requires Level-4 gap + experiment metrics first.

---

## What requires further research?

| Item | Why | Source |
|------|-----|--------|
| Fresh audit of orchestrator sandbox, MCP executor depth, code-map, hooks bootstrap | Unlocks fragile ALREADY_PRESENT | CROSS §5, §10 |
| Handoff×3 / Checkpoint×3 / Sandbox×OS vs UX normalization pass | Prevent false Patterns | CROSS §1, §10 |
| Filter aggregate by epistemic label before counting | Inflation | CROSS meta-nota |
| Targets in `FUTURE-RESEARCH-TARGETS.md` | Out of mandatory 21; register only | FUTURE-RESEARCH-TARGETS.md |
| Pin versions / App vs CLI / V0 vs V1 dual stacks | Extrapolation risk | CROSS §5 |
| Fix `superpowers/MECHANISMS.yaml` dangling `)` if re-aggregating | Tooling skip risk | CROSS §1.9 |
| Experiments E-NNN for PROTOTYPE rows | Numbers/safety | `research/experiments/E-001`…`E-005` (design only) |

---

## Decision summary table

| Cluster | Decision | Confidence | Provenance | Principle / Pattern |
|---------|----------|------------|------------|---------------------|
| Foreign runtime embed | REJECT | HIGH | OFFICIAL + LOCAL | PRINCIPLE-01 |
| Duplicate registries / persona registry | REJECT | HIGH | OFFICIAL + LOCAL | PRINCIPLE-02, -09 |
| Policy Engine SSOT | ALREADY_PRESENT | HIGH | baseline + EXTERNAL ADAPT hooks | PRINCIPLE-03 |
| Evidence Bus SSOT | ALREADY_PRESENT | HIGH | LOCAL + baseline | PRINCIPLE-04 |
| Knowledge ≠ Memory ≠ Checkpoint | Keep split; REJECT vendor Knowledge SSOT | HIGH | OFFICIAL + LOCAL | PRINCIPLE-05 |
| MCP host transports | ADOPT host / REJECT reimplement | HIGH | OFFICIAL mcp | PRINCIPLE-06 |
| Skill packages | ALREADY_PRESENT | HIGH | LOCAL + OFFICIAL | PRINCIPLE-07 |
| Skill harness bootstrap / budgets | ADAPT / PROTOTYPE | MEDIUM–HIGH | LOCAL superpowers + OFFICIAL | P-001 |
| PDA multi-agent | ALREADY_PRESENT | HIGH | baseline | PRINCIPLE-08/09 |
| Handoff ACL + isolation | ADAPT | MEDIUM | OFFICIAL + LOCAL | PRINCIPLE-08, P-002 |
| Plan\|Act tool whitelist | ADAPT | MEDIUM | OFFICIAL | P-005 |
| Hard iter/cost caps | ADAPT | MEDIUM | OFFICIAL | P-010 |
| Repo map | ADAPT | MEDIUM | OFFICIAL aider/swe | P-012 |
| OS sandbox / profiles | PROTOTYPE | MEDIUM (gap HIGH) | OFFICIAL | P-009 — not Principle yet |
| Stuck detector | PROTOTYPE | LOW–MEDIUM | OFFICIAL openhands | gap |
| Compaction | PROTOTYPE | MEDIUM | OFFICIAL | gap |
| HITL durable RunState | PROTOTYPE | MEDIUM | OFFICIAL | P-006 subtype |
| Cross-thread auto-memory SSOT | DEFER | MEDIUM | OFFICIAL | PRINCIPLE-05 |
| Cloud/hub-spoke product shells | DEFER | MEDIUM | OFFICIAL | — |
| MegaBrain ≡ Cursor | REJECT | HIGH | OFFICIAL cursor | DO-NOT-CHANGE |

---

## Artefact handoff

| Artefact | Path | Status |
|----------|------|--------|
| Principles | `research/AGENT-ARCHITECTURE-PRINCIPLES.md` | Written (9) |
| This executive | `research/EXECUTIVE-FINDINGS.md` | Written |
| Patterns | `research/patterns/` | Lead set `P-001`…`P-012`; parallel-miner set renamed `PM-*` (see patterns/README) |
| Anti-patterns | `research/anti-patterns/AP-001`…`AP-008` | Landed (parallel miner) |
| Architecture gaps | `research/architecture-gaps/GAP-001`…`GAP-008` | Landed (parallel miner) |
| Hypotheses / experiments | `H-001`…`H-005` / `E-001`…`E-005` | Landed (parallel miner) |
| DO-NOT-CHANGE | `research/DO-NOT-CHANGE.md` | Prior / authoritative |
| Future targets | `research/FUTURE-RESEARCH-TARGETS.md` | Prior / register-only |

**Implementation decisions:** none.  
**Wiki:** n/a (research synthesis only; no mapped Gaab project code edit).
