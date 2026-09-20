# ADVERSARIAL-REVIEW — LlamaIndex TARGET_RESEARCH

Date: 2026-09-18  
Role: Self-critique before Lead synthesis  
Skill evals aligned: no ranking, no invent-internals, no implement, no duplicate registry

## Attacks against this investigation

### A1 — “LlamaIndex is the RAG standard; adopt the stack”

**Attack:** Popularity / ecosystem size ⇒ we should depend on `llama-index`.  
**Defense:** Adoption analysis separates Ecosystem from Technical merit. Decision **REJECT** framework dependency; **ADAPT** only retrieval-as-capability + eval metrics. Popularity ≠ superiority (methodology).  
**Status:** Mitigated in REPORT §5–7.

### A2 — “Copy AgentWorkflow into orchestrator”

**Attack:** Famous multi-agent API; implement isomorphic Workflow class now.  
**Defense:** Multi-agent PDA **ALREADY_PRESENT**. Handoff ACL is **ADAPT** candidate, not a second agent runtime. Skill forbids implementation.  
**Status:** Mitigated; handoff to agent-authoring only.

### A3 — Invented internals

**Attack:** Pressure to explain proprietary LlamaCloud routing, exact timeout defaults, durable checkpoint bytes.  
**Defense:** Marked **UNKNOWN** (U-04, U-06, U-11). Claims on AgentWorkflow loop are **OBSERVED** from public source, not guessed.  
**Status:** Mitigated via UNKNOWNS.md.

### A4 — Duplicate Capability / Agent Registry

**Attack:** “LlamaIndex has agents+tools registry; add kind: Agent Registry.”  
**Defense:** Tools ≡ Capabilities **ALREADY_PRESENT**; **REJECT** parallel registry (eval adversarial-duplicate-registry).  
**Status:** Mitigated in MECHANISMS LI-TOOL-CTX / LI-FRAMEWORK.

### A5 — Overclaim OBSERVED

**Attack:** Treat all Context7 snippets as executed behaviour.  
**Defense:** Only GitHub raw `multi_agent_workflow.py` / `base_agent.py` labeled OBSERVED. Docs = DOCUMENTED. PyPI versions = MEASURED.  
**Status:** Check — residual risk: `main` tip may differ from 0.14.24 wheels (U-01). **Confidence capped MEDIUM** on version-exact behaviour.

### A6 — Boil the ocean

**Attack:** Exhaust every connector, index type, notebook.  
**Defense:** Lens constrained to Agents/Workflows/RAG mechanisms; connectors catalog explicitly out of scope.  
**Status:** Mitigated; residual: may miss a critical durable-workflow detail (U-06).

### A7 — Confuse Knowledge systems

**Attack:** Equate GaabWiki grounding with VectorStoreIndex.  
**Defense:** EQUIVALENCE **PARTIAL**; REJECT stack swap; ADAPT pattern only. Baseline RAG degraded BM25 acknowledged.  
**Status:** Mitigated.

### A8 — Ranking / scores

**Attack:** “Score LlamaIndex 9/10 vs LangGraph.”  
**Defense:** No numeric framework scores; decisions only in allowed vocabulary. Multi-agent pattern star table from docs treated as UX OPINION, not our ranking.  
**Status:** Mitigated.

## Weakest claims (honesty)

1. **ADAPT handoff ACL** — evidence of MegaBrain gap is INFERRED from baseline PDA description; needs Policy Engine audit before authoring.  
2. **PROTOTYPE HITL** — strong DOCUMENTED external mechanism; our ABSENCE is UNKNOWN until code audit (U-14).  
3. **Instrumentation ADAPT** — may be DEFER if MegaBrain intentionally keeps minimal traces; not proven necessary.

## What would falsify key decisions

| Decision | Falsifier |
|----------|-----------|
| REJECT framework | Evidence that MegaBrain must ship LlamaIndex indexes as SSOT Knowledge (product mandate) |
| ALREADY_PRESENT multi-agent | Audit shows PDA cannot express specialist handoffs at all |
| ADAPT QueryEngineTool pattern | Knowledge gate already exposes equivalent retrieval Capability with evals |
| PROTOTYPE HITL | Existing Cursor/MegaBrain human gate already isomorphic to wait_for_event |

## Checklist (skill close)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives or UNKNOWN  
- [x] Epistemic labels on claims  
- [x] OUR_CURRENT_MECHANISM compared  
- [x] No Agent System implementation  
- [x] No ranking / no second registry if ALREADY_PRESENT  
- [x] Artifacts: REPORT.md, MECHANISMS.yaml, UNKNOWNS.md, ADVERSARIAL-REVIEW.md  

## Verdict

Investigation is **fit for Lead synthesis** with caveats U-01/U-06/U-13/U-14. Highest-value extracts: **event-step runtime ideas**, **handoff-as-tool ACL**, **retrieval-as-tool**, **HITL wait_for_event**, **faithfulness evals** — not the LlamaIndex package itself.
