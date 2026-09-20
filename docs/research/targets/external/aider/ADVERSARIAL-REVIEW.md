# ADVERSARIAL-REVIEW — Aider TARGET_RESEARCH

**Date:** 2026-09-18  
**Role:** Self-critique before handoff (skill evals / adversarial mindset)  
**Verdict:** Artifact set is **usable for Level-1 handoff** with HIGH confidence on the public coding loop; several MegaBrain equivalence claims remain **PARTIAL pending CursorSKILLS audit**.

---

## 1. What could be wrong in this investigation?

| Attack on our report | Severity | Response |
|----------------------|----------|----------|
| Over-read marketing / testimonials as architecture | HIGH if present | README testimonials treated as OPINION / ignored for decisions |
| Confuse docs “graph ranking” with a custom unpublished algorithm | MEDIUM | Code shows **networkx PageRank** — CONFLICT resolved prefer code |
| Treat architect/editor as novel multi-agent framework | MEDIUM | It is a **same-process Coder fork**, not a general agent runtime — equivalence to PDA is conceptual only |
| Claim fuzzy apply is “safe” | HIGH if claimed | We mark wrong-locus replace as **HYPOTHESIS** failure mode; PROTOTYPE not ADOPT |
| Import Aider `--no-verify` default into MegaBrain | HIGH | Explicit **REJECT** for default hook skip |
| Use leaderboard pass rates as proof for MegaBrain | MEDIUM | **REJECT** as SSOT; MEASURED only as “their harness” |
| Assert ABSENT repo-map in MegaBrain without full skill audit | MEDIUM | Flagged **U-16**; decision ADAPT still valid as gap hypothesis |
| Version skew (`main` vs `v0.86.0`) | LOW–MEDIUM | Noted; mechanisms appear stable across docs+main |
| No local execution → missed runtime-only behavior | MEDIUM | Accepted limitation; labeled OBSERVED=source read, not runtime |

---

## 2. Evidence quality audit

| Claim class | Quality | Notes |
|-------------|---------|-------|
| Coding loop sequence | HIGH | `base_coder.py` OBSERVED end-to-end post-send path |
| Repo map construction | HIGH | Docs + `repomap.py` PageRank |
| Edit formats | HIGH | Official edit-formats doc + coder modules |
| Fuzzy apply strategies | HIGH structure / LOW field rates | Code OBSERVED; production fail rates UNKNOWN |
| Git integration | HIGH | Docs + `repo.py` |
| Architect split | HIGH | `architect_coder.py` short and clear |
| Prompt cache packing | HIGH | `chat_chunks.py` + caching doc |
| History summary quality | MEDIUM | Existence OBSERVED; quality UNKNOWN |
| GUI/watch/voice | MEDIUM–LOW depth | Watch DOCUMENTED; others thin |

---

## 3. Decision pressure test

For each non-`ALREADY_PRESENT` decision, ask: *Would a critic force DEFER/REJECT?*

| Decision | Pressure | Hold? |
|----------|----------|-------|
| ADAPT repo map | “We have RAG” | **Hold ADAPT** — RAG ≠ AST symbol graph (different problem) |
| PROTOTYPE fuzzy apply | “Cursor applies edits natively” | **Hold** for non-Cursor/patch paths; scope narrow |
| ADAPT git commit fence | “User already uses git” | **Hold** as agent-owned convention, not user education |
| REJECT hook-skip default | “Aider needs it for UX” | **Hold REJECT** for MegaBrain defaults |
| DEFER watch mode | “Nice UX” | **Hold DEFER** — not architectural core |
| REJECT whole runtime | “Stars / community” | **Hold REJECT** — popularity separated |
| ALREADY_PRESENT architect≈PDA | “Different implementation” | **Hold** with residual ADAPT for model pairing only |

No mechanism earned bare **ADOPT** (copy verbatim into MegaBrain). That is intentional under anti-duplication / registry reuse rules.

---

## 4. Anti-patterns detected in *Aider* (not in us)

| Anti-pattern | Seen? | Evidence |
|--------------|-------|----------|
| Tool explosion | LOW | Slash commands many but curated, not open tool registry |
| Over-agentization | LOW | Mostly single agent; architect is 2-step not N-agent |
| Context explosion | MEDIUM risk | Mitigated by map budget + /drop; user can still over-/add |
| Autonomous loops without limit | Mitigated | `max_reflections=3` OBSERVED |
| Lack of validation | Mitigated if lint/test on | Optional; off by config → risk |
| Uncontrolled authority | MEDIUM | `--yes`, shell, hook skip — human/config dependent |
| Hidden state | LOW–MEDIUM | Chat history + map cache; mostly inspectable via /commands |
| Brittle prompts | Inherent | Edit format compliance is the central brittleness — hence fuzzy apply |

---

## 5. Anti-patterns risk if *we* copy blindly

1. **Second orchestration runtime** beside MegaBrain orchestrator → violates ALREADY_PRESENT / anti-duplication.  
2. **Soft confirm_ask instead of Policy Engine** → uncontrolled authority.  
3. **Skipping git hooks by default** → supply-chain / quality gate bypass.  
4. **Treating conventions.md as Policy** → soft guidance ≠ authorization.  
5. **Optimizing for Aider leaderboard formats** → eval overfitting.

---

## 6. Checklist (skill close)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives answered or UNKNOWN  
- [x] Epistemic labels on key claims  
- [x] OUR_CURRENT_MECHANISM compared per major mechanism  
- [x] No Agent System implementation  
- [x] No ranking-as-merit  
- [x] No second Capability Registry proposed  
- [x] UNKNOWNS.md populated  
- [x] Decisions ∈ allowed vocabulary  

---

## 7. Summary for Lead

**Aider’s distinctive engineering value** is not “chat with an LLM,” but the **closed mutation loop**: ranked **repo map** → **format-constrained edit generation** → **aggressive apply heuristics** → **git fencing** → **lint/test reflection** under a **hard reflection cap**.

**Transfer to MegaBrain:** ADAPT map + context packing + validation-reflect; PROTOTYPE fuzzy apply only where native editor apply is unavailable; treat plan/exec as ALREADY_PRESENT; REJECT product absorption and unsafe git defaults.

**Do not trust** without further audit: MegaBrain ABSENT claims for code-map (`U-16`), fuzzy-apply safety in production (`U-06`), and full model-default matrix (`U-03`).
