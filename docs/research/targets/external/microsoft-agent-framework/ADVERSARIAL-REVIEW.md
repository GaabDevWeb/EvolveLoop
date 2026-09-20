# ADVERSARIAL-REVIEW — microsoft-agent-framework

**Role:** Self-critique before accepting TARGET_RESEARCH as evidence-grade.  
**Date:** 2026-09-18  
**Verdict:** **CONDITIONAL PASS** — naming lineage and high-level mechanisms are well-sourced; several comparisons and maturity claims must stay provisional.

---

## Attack 1 — “AutoGen ≈ Agent Framework”

**Risk:** Conflate products and import AutoGen Core semantics into MAF findings.

**Counter-evidence:** Official Overview + AutoGen README + Migration Guide state successor/maintenance split and orchestration model change (Team/event-driven → typed Workflow).

**Mitigation applied:** Dedicated naming section; separate AG-* vs MAF-* mechanism IDs.

**Residual:** Marketing phrases (“enterprise-ready successor”) could still bias readers — treated as DOCUMENTED positioning, not technical proof.

---

## Attack 2 — Docs as if OBSERVED runtime

**Risk:** Treat Learn pages as verified implementation behavior.

**Mitigation:** Epistemic labels mostly DOCUMENTED; U-SRC / U-RUNTIME-EXEC logged; no install/execution.

**Residual:** Samples and API docs can drift from shipped packages — version pin missing (U-VER).

---

## Attack 3 — Overclaim MegaBrain gaps

**Risk:** Invent ABSENT mechanisms in CursorSKILLS without audit.

**Mitigation:** Baseline used; tool-approval / termination / HITL marked UNKNOWN or PARTIAL where audit needed; decisions avoid ADOPT of SDK.

**Residual:** ALREADY_PRESENT on middleware/tools is **conceptual** equivalence — could be too generous if Policy lacks function-call interception fidelity.

---

## Attack 4 — Magentic as “must-have” multi-agent pattern

**Risk:** Recommend Magentic because of research pedigree.

**Counter-evidence:** Official Magentic page warns untested outside Magentic-One specialized design.

**Mitigation:** Decision DEFER; termination/HITL extracted separately.

---

## Attack 5 — Provider support table inconsistency

**Risk:** Assert Anthropic/Ollama support as fact.

**Mitigation:** CONFLICT C-PROVIDERS in UNKNOWNS; not used as firm mechanism claim.

---

## Attack 6 — Popularity / Microsoft gravity as quality

**Risk:** Azure/Foundry ecosystem implies architectural fit for MegaBrain.

**Mitigation:** Adoption factors separated; REJECT SDK adoption into Agent System; host mismatch explicit (Cursor vs in-process MAF).

---

## Attack 7 — Incomplete lens coverage

**Checklist vs requested lenses:**

| Lens | Covered? | Quality |
|------|----------|---------|
| Agent model | Yes | Strong DOCUMENTED |
| Multi-agent architecture | Yes | Strong |
| Message passing | Yes | Strong contrast GraphFlow/Core vs Workflow |
| Teams | Yes | Strong |
| Delegation | Yes | Handoff vs agent-as-tool |
| Termination | Yes | Strong |
| Tool use | Yes | Strong surface; depth of hosted tools light |
| State | Yes | Session |
| Memory | Yes | Context providers; FileMemory less deep |
| HITL | Yes | Strong |
| Runtime | Partial | Single-process focus DOCUMENTED; internals UNKNOWN |
| Workflow | Yes | Strong |
| Extensibility | Yes | Medium |
| Evolution from AutoGen | Yes | Strong |

**Missing deep dives (honest):** Durable Task extension, Foundry hosting security model, evals subsystem, DevUI, Agent Skills ADR contents.

---

## Attack 8 — Decision inflation

**Risk:** Too many ADAPT/PROTOTYPE without experiments.

**Mitigation:** No experiments authored (out of TARGET_RESEARCH minimum); PROTOTYPE limited to HITL/checkpoint; REJECT wholesale adoption.

**Residual:** ADAPT items still need PATTERN_MINING / GAP_ANALYSIS wave before agent-authoring.

---

## What would falsify this report

1. Official statement that AutoGen remains the supported multi-agent product for new Microsoft work (contradicts current README/Overview).
2. Source showing Workflow is still broadcast-control like GraphFlow (contradicts migration guide).
3. CursorSKILLS audit showing EQUIVALENT request/response + termination budgets → several PARTIAL→EQUIVALENT and PROTOTYPE→ALREADY_PRESENT.

---

## Checklist (skill close)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives or UNKNOWN
- [x] Epistemic labels on key claims
- [x] Comparison to OUR-SYSTEM-BASELINE
- [x] No implementation / no ranking
- [x] Conflicts recorded without fake consensus
- [ ] Source OBSERVED at pinned commit — **not done** (limitation)

**Final adversarial score (qualitative):** Suitable for corpus synthesis with caveats; **not** suitable as sole basis for Agent System implementation.
