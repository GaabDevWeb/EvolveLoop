# ADVERSARIAL-REVIEW — OpenHands TARGET_RESEARCH

Date: 2026-09-18  
Role: sole investigator self-critique before handoff to Lead.

## Attack on this investigation

### 1. Dual-generation conflation risk — SEVERITY HIGH

The official corpus simultaneously documents **V1 Software Agent SDK + sandboxes + Agent Canvas** and **V0 Runtime + CodeAct + Action Execution Server**. It is easy to invent a single “OpenHands architecture” that never existed as one deployable stack.

**Mitigation applied:** Explicit dual map in REPORT; CONFLICTS in UNKNOWNS; decisions prefer V1 for “current” unless labeled legacy.  
**Residual risk:** Canvas may still call into transitional code paths not read here.

### 2. Docs-as-code without execution — SEVERITY HIGH

No install/run. Claims about stuck detection defaults, confirmation pauses, and Docker isolation are DOCUMENTED/OBSERVED-in-source, not MEASURED.

**Mitigation:** Epistemic labels; `run_executed: false` in MECHANISMS.yaml.  
**Residual risk:** Dead docs / examples drift from main.

### 3. Incomplete source sampling — SEVERITY MEDIUM

Only selected files pulled (stuck detector, confirmation policy, security `__init__`, planning preset, two examples). Security defense-in-depth, ToolShield, GraySwan, docker_runtime mediation, and agent-server auth middleware were **not** line-audited.

**Mitigation:** Marked UNKNOWN; did not invent analyzer algorithms beyond docs + exports.  
**Residual risk:** Under-count of security mechanisms → possible under-ADAPT.

### 4. MegaBrain equivalence overconfidence — SEVERITY MEDIUM

`ALREADY_PRESENT` for planning split and subagents rests on baseline PDA / Task IR rows, not a fresh CursorSKILLS code audit this turn.

**Mitigation:** Confidence MEDIUM; residual ADAPT noted for read-only planner tools.  
**Residual risk:** False ALREADY_PRESENT if MegaBrain planner can still mutate freely.

### 5. Popularity / badge leakage — SEVERITY LOW (watched)

Star counts and SWE-Bench badge appeared in raw metadata.  

**Mitigation:** Isolated under Adoption (Distribution) / UNKNOWNS; not used as mechanism merit.  
**Residual risk:** Reader still overweight stars — Lead should ignore for CROSS review.

### 6. Decision inflation — SEVERITY MEDIUM

Many ADAPT/PROTOTYPE items could collapse into “one sandbox+events theme”. Listing fine-grained IDs risks looking like a shopping list for duplication.

**Mitigation:** Explicit anti-duplication on Policy/Skills; REJECT Canvas as core; DEFER browser/MCP/eval.  
**Residual risk:** Authoring agent implements parallel registries anyway — handoff must say “extend Policy/Evidence, do not fork”.

### 7. Security narrative too rosy — SEVERITY MEDIUM

Official docs push defense-in-depth, but default `LLMSecurityAnalyzer` is **self-scored risk by the same model proposing the action** — a structural weakness.

**Mitigation:** Failure modes on M04; INFERRED anti-pattern AP02.  
**Residual risk:** Still easy to ADOPT LLM-only risk without ensemble rails.

### 8. Org rename / URL churn — SEVERITY LOW

`All-Hands-AI/OpenHands` redirects; docs still mention `all-hands.dev` hosts.  

**Mitigation:** Used current `OpenHands/*` repos.  
**Residual risk:** Stale links in secondary sources.

## What would falsify key decisions

| Decision | Falsifier |
|----------|-----------|
| ADAPT sandbox | MegaBrain already has equivalent Docker/remote workspace (baseline audit proves EQUIVALENT) |
| ADAPT security+confirm | Policy Engine already expresses risk-threshold HITL on every tool call with tests |
| PROTOTYPE stuck | Orchestrator already stops semantic repeat loops with tests |
| ALREADY_PRESENT plan/delegate | PDA/Task IR absent or non-operational in code |
| REJECT Canvas-as-core | Lead reframes MegaBrain as multi-ACP product shell (scope change) |

## Checklist (skill close)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives or UNKNOWN  
- [x] Epistemic labels on key claims  
- [x] OUR_CURRENT_MECHANISM compared per major mechanism  
- [x] No Agent System implementation  
- [x] No ranking / no “best agent”  
- [x] UNKNOWNS + CONFLICTS recorded  
- [ ] Full primary source coverage — **NO** (partial by design/limits)

## Verdict on report quality

**Usable Level-1 TARGET_RESEARCH** for cross-system mining, with **HIGH caution** on merging V0+V1 and on unevaluated defaults. Strongest transferable signals: **workspace/sandbox plane**, **event-sourced conversation + stuck detection**, **policy×analyzer confirmation** (adapted onto existing Policy — not cloned). Weakest: eval harness location, Canvas/ACP internals, MEASURED behavior.
