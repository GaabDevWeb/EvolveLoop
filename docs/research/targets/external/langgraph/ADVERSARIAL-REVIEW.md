# ADVERSARIAL-REVIEW — LangGraph TARGET_RESEARCH

**Date:** 2026-09-18  
**Role:** Critic of the investigator’s own REPORT / MECHANISMS  
**Standard:** evidence.md + analysis-framework.md; decision vocab only

## Pass criteria checklist

| Check | Result |
|-------|--------|
| Epistemic labels on key claims | PASS |
| Sources cited for mechanisms | PASS |
| `UNKNOWN` used for closed/unrun parts | PASS |
| Decisions ∈ allowed set | PASS |
| No orchestrator/Agent System implementation | PASS |
| Popularity ≠ superiority | PASS (adoption table separated) |
| Anti-duplication (registries / Evidence Bus) | PASS — REJECT runtime embed; no second registry |
| What/Why/How/Cost/Fail/Alt covered or UNKNOWN | PASS with residual UNKNOWNS |

## Attacks on this investigation

### A1 — “You only read marketing”

**Attack:** Overview page is product-framed (Klarna, Uber, etc.).  
**Defense:** Mechanisms grounded in graph-api, checkpointers, interrupts, time-travel, streaming, subgraphs, functional-api + public package layout. Brand logos ignored as evidence.  
**Residual risk:** LOW–MEDIUM — still no local execution to falsify docs.

### A2 — “Docs ≠ code”

**Attack:** Documentation can lag or oversell durability.  
**Defense:** Marked Agent Server / managed paths `UNKNOWN`; durability crash windows partially admitted in docs (`async` risk). Version pinned to pyproject `1.2.11` on `main` (may move).  
**Residual risk:** MEDIUM — Pregel internals not line-audited.

### A3 — “ADAPT is soft ADOPT”

**Attack:** Multiple `ADAPT` decisions could smuggle LangGraph in later.  
**Defense:** Explicit `REJECT` for embedding LangGraph as MegaBrain runtime; ADAPT scoped to *ideas* (durability knobs, interrupt protocol, pending-writes, stream projections) mapped onto existing Orchestrator/Evidence/Policy.  
**Residual risk:** MEDIUM organizational — handoff must stay with agent-authoring + ADR.

### A4 — “False ALREADY_PRESENT on nodes”

**Attack:** Labeling LG-NODES as `ALREADY_PRESENT` overclaims equivalence.  
**Defense:** Residual gap called out (resume-from-start + task cache). Equivalence is *unit of work*, not Pregel. Could downgrade to `ADAPT` if reviewers prefer stricter bar.  
**Investigator note:** Acceptable tension; confidence MEDIUM.

### A5 — “PROTOTYPE reducers without MegaBrain audit”

**Attack:** Declaring NONE equivalence may be wrong if engine already merges.  
**Defense:** UNKNOWNS.md flags orchestrator audit GAP; PROTOTYPE not ADOPT.  
**Residual risk:** MEDIUM — next step is code audit, not design.

### A6 — “Ignored JS / Functional API depth”

**Attack:** Lens incomplete.  
**Defense:** Functional API summarized for resume/tasks; JS marked UNKNOWN for parity. Sufficient for Python-primary TARGET_RESEARCH; not a full multi-language dossier.  
**Residual risk:** LOW for stated scope.

### A7 — “Time travel DEFER undervalues debugging need”

**Attack:** Replay/fork may be high value.  
**Defense:** Depends on checkpoint lineage ADAPT first; without durable history, time travel is vapor. DEFER is sequencing, not rejection of concept.  
**Residual risk:** LOW.

### A8 — Ranking / copy pressure (skill eval adversarial)

**Attack:** “LangGraph is famous — copy graph state now.”  
**Response:** Refused. Fame is distribution factor only. Copying StateGraph into MegaBrain without contract fit → `REJECT` runtime; mechanisms extracted as ADAPT/PROTOTYPE/DEFER only.

## Overclaim scan

| Claim in REPORT | Verdict |
|-----------------|---------|
| Pregel-inspired super-steps | Supported DOCUMENTED |
| Node restarts from beginning on interrupt resume | Supported DOCUMENTED |
| Three durability modes | Supported DOCUMENTED |
| Pending writes skip successful nodes | Supported DOCUMENTED |
| Replay re-executes LLM/API | Supported DOCUMENTED |
| MegaBrain lacks durability modes | INFERRED from baseline PARTIAL + README — not full code proof → keep confidence honest |
| Store ≈ GaabWiki | Weak — DEFER correctly avoids forced mapping |

## Required downgrades if challenged

1. If orchestrator audit finds strong checkpoint lineage → raise LG-CHECKPOINT our_equivalence PARTIAL→SUBSTANTIAL; decision may become `ALREADY_PRESENT` + residual only.  
2. If SkillJobs already carry typed resume payloads mid-node → soften LG-INTERRUPT ADAPT urgency.  
3. If reducers already exist in IR merge → cancel PROTOTYPE.

## Final adversarial verdict

Investigation is **fit for handoff** as Level-1 TARGET_RESEARCH: mechanisms are problem-centered, decisions non-implementing, closed parts marked UNKNOWN. Main weakness is **docs-heavy / run-light** evidence and **incomplete MegaBrain code audit** for equivalence — explicitly tracked, not hidden.

**Do not:** implement LangGraph, rank frameworks, or open a parallel Agent Registry.
