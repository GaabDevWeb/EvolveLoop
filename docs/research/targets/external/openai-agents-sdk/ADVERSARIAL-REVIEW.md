# ADVERSARIAL-REVIEW — OpenAI Agents SDK investigation

**Investigator:** sole TARGET_RESEARCH  
**Date:** 2026-09-18  
**Artifacts:** REPORT.md, MECHANISMS.yaml, UNKNOWNS.md  

## Self-critique checklist

| Check | Status | Notes |
|-------|--------|-------|
| Skill mode TARGET_RESEARCH followed | PASS | Level 1 target report produced |
| Primary sources preferred | PASS | Official docs + GitHub source/releases; Context7 on `/openai/openai-agents-python` |
| Marketing filtered | PASS | Adoption factors separated; no “best framework” |
| Epistemic labels used | PASS | DOCUMENTED / OBSERVED / INFERRED / UNKNOWN |
| Closed internals invented? | PASS | Marked UNKNOWN (hosted services, parity matrix) |
| Decisions ∈ allowed vocab | PASS | No ADOPT of full SDK runtime |
| Compared to OUR-SYSTEM-BASELINE | PASS | Per-mechanism blocks |
| Anti-duplication | PASS | ALREADY_PRESENT for Orchestrator/Capability/PDA/Policy roles |
| Implementation attempted? | PASS | None |
| Ranking produced? | PASS | None |
| Stars used as merit? | PASS | Distribution factor only (~29.5k★ OBSERVED) |

## Attack on own conclusions

1. **“ALREADY_PRESENT for agent loop” may under-weight a gap.**  
   MegaBrain orchestrates Capabilities, not an LLM tool-call loop isomorphic to `Runner`. Residual gap remains for LLM-native tool loops inside a Provider. Mitigation: decision note says role-equivalent, not API-equivalent; literal Runner = DEFER.

2. **PROTOTYPE Session/HITL may be premature.**  
   Without product requirement for multi-turn chat agents or durable approvals, prototypes waste effort. Mitigation: handoff requires explicit agent-authoring experiment gate.

3. **ADAPT Guardrails vs Policy conflation risk.**  
   Treating tripwires as Policy could corrupt authorize semantics. Mitigation: report states Policy ≠ I/O validation; adapt beside Policy/Evidence, not as replacement.

4. **Python-heavy evidence bias.**  
   TS SDK not deeply OBSERVED. Mitigation: UNKNOWNS U04; claims labeled docs-level for shared primitives.

5. **Sandbox PROTOTYPE vs DEFER tension.**  
   Beta churn could waste design. Mitigation: split — prototype *concept* of workspace isolation; DEFER SDK SandboxAgent dependency.

6. **Incomplete tools page depth.**  
   Tools doc is large (PTC, tool search, shell skills). Residual UNKNOWN on operational limits. Mitigation: MECHANISMS lists hosted/PTC as DEFER for core.

## Steelman alternative reading

A critic could say MegaBrain should **ADOPT** SDK as the execution engine under Orchestrator. Counter-evidence: MegaBrain lens (Capability/Provider/Policy/Evidence) conflicts with LLM-tool-first Runner as SSOT; SDK itself says use Responses directly when you own the loop — Orchestrator already “owns the loop” at a higher abstraction. Therefore ADOPT rejected; ADAPT/PROTOTYPE only.

## Residual bias register

| Bias | Mitigation |
|------|------------|
| Recency (v0.22.3 features) | Prefer stable primitives (Agent/Runner/Tools/Handoffs/Guardrails) over beta Sandbox |
| OpenAI ecosystem familiarity | Explicit lock-in section; DEFER hosted-only features |
| Confirmation (want HITL gap) | Marked our durable HITL as UNKNOWN until audit (U21) |

## Verdict on investigation quality

**Sufficient for Level 1 TARGET_RESEARCH** with declared UNKNOWNS. Not sufficient for PRINCIPLE_EXTRACTION or implementation ADRs without: (a) MegaBrain code audit for U20–U23, (b) optional OBSERVED smoke of Runner HITL/Session in an isolated env.

## Required follow-ups (non-implementing)

1. Audit CursorSKILLS orchestrator for DI context, MCP, durable pause → resolve U20–U22.  
2. If HITL prototype approved: write hypothesis/experiment artifacts under `research/hypotheses|experiments/` (separate mode).  
3. Cross-system later: compare HITL/guardrails with Claude Code / LangGraph investigators (CROSS_SYSTEM_ANALYSIS) — out of scope here.
