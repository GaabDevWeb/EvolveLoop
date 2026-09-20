# ADVERSARIAL-REVIEW — Anthropic Agent Skills

**Investigator self-critique before finish**  
**Date:** 2026-09-18  
**Mode:** TARGET_RESEARCH

---

## 1. Did we invent internals?

| Check | Result |
|-------|--------|
| Claimed a proprietary activation scoring formula? | No — marked UNKNOWN (U-02) |
| Claimed Cursor loads skills exactly like Anthropic? | No — PARTIAL / UNKNOWN (U-03) |
| Treated engineering “future” (agents create skills) as shipped mechanism? | No — U-09 |
| Inferred formal skill-composition graph from “compose capabilities”? | No — UNKNOWN (U-06); noted as emergent multi-activation INFERENCE only |

**Residual risk:** Client-guide recommendations (protect compaction, enum activate tool) could be misread as Anthropic-production guarantees. Mitigated by labeling them as **client-implementation guidance** (DOCUMENTED normative for implementers, not proven OBSERVED in Claude production).

---

## 2. Did we merge excluded corpus targets?

| Check | Result |
|-------|--------|
| Analyzed superpowers / mattpocock skill trees? | **No** — explicit exclusion |
| Used corpus examples as evidence for Anthropic mechanisms? | **No** |
| Compared only via OUR-SYSTEM-BASELINE + CursorSKILLS skill *pattern* existence? | **Yes** — allowed for MegaBrain equivalence, not as Anthropic source |

---

## 3. Popularity / ranking contamination?

| Check | Result |
|-------|--------|
| Ranked “best skill format”? | No |
| Numeric quality scores? | No |
| Adoption section separated from technical merit? | Yes (REPORT §5) |

**Attack we resisted:** “Open standard + Anthropic backing ⇒ must ADOPT wholesale into MegaBrain.”  
**Response:** Format already SUBSTANTIAL; harness progressive disclosure = ADAPT; CC-only fork = REJECT duplicate multi-agent.

---

## 4. Duplication vs MegaBrain?

| Temptation | Adversarial verdict |
|------------|---------------------|
| New “Skill Registry” kind | **REJECT** — Capability/Provider registries + existing `.cursor/skills` |
| New “Skill Fork Runtime” | **REJECT** — PDA Task roles already cover isolation |
| Parallel Evidence Bus for skills | **REJECT** — N/A / out of scope |
| Copy all Claude Code frontmatter into MegaBrain SSOT | **REJECT/DEFER** — breaks portable 6-field standard |

---

## 5. Evidence quality stress test

| Mechanism | Weakest link | Mitigation in artifacts |
|-----------|--------------|-------------------------|
| Progressive disclosure | Token numbers (~50–100, <5000) are **DOCUMENTED guidance**, not MEASURED here | No fake MEASURED labels |
| Scripts keep code out of context | True only if agent *executes* not *reads*; behavioral | Failure mode called out; PROTOTYPE |
| Composition | Marketing-adjacent wording in overview | U-06 UNKNOWN |
| Precedence | Sources conflict | CONFLICT blocks in UNKNOWNS |

---

## 6. Decision challenge

| Decision | Challenge | Hold / revise |
|----------|-----------|---------------|
| ALREADY_PRESENT on package format | Cursor skills may diverge from strict name/dir rules | **Hold** with residual ADAPT for validation |
| ADAPT progressive disclosure | Maybe Cursor already does tier-1 | **Hold** — U-03 forces audit before claiming EQUIVALENT |
| PROTOTYPE scripts | Maybe REJECT if sandbox too weak | **Hold** — baseline Sandbox UNKNOWN–PARTIAL supports PROTOTYPE not ADOPT |
| DEFER compaction protection | Maybe critical enough for PROTOTYPE now | **Hold DEFER** until compaction OBSERVED; H-03 recorded |
| REJECT skill-subagent | Under-rates CC `context:fork` | **Hold REJECT** as *new* system; PDA mapping allowed without copying frontmatter |

---

## 7. Anti-patterns watched

| Anti-pattern | Present in target? | Risk if copied blindly |
|--------------|--------------------|------------------------|
| Context explosion | Mitigated by design; defeated by fat SKILL.md | Authoring failure |
| Tool explosion | `allowed-tools` experimental grants | Over-permission |
| Over-agentization | Optional skill subagents | Duplicate PDA |
| Hidden state | Skill body persistence across turns | Stale instructions mid-session |
| Brittle prompts | Low-freedom scripts help; verbose prose hurts | Documented in best practices |
| Uncontrolled authority | Malicious skills | Trust/audit mandatory |

---

## 8. Completeness vs assigned lens

| Lens | Covered? |
|------|----------|
| Skill structure | Yes (AAS-01) |
| Metadata | Yes (AAS-03) |
| Progressive disclosure | Yes (AAS-02) |
| Filesystem model | Yes (AAS-04) |
| Resources | Yes (AAS-05) |
| Scripts | Yes (AAS-06) |
| On-demand loading | Yes (AAS-02/05) |
| Composition | Partial — benefit DOCUMENTED, protocol UNKNOWN |
| Context management | Yes (AAS-09/10) |
| Discovery | Yes (AAS-07/08/13) |
| Skill lifecycle | Yes (AAS-15 + CC lifecycle notes) |
| Instruction architecture | Yes (AAS-12) |

---

## 9. Final adversarial verdict

Investigation is **fit to hand off** with these caveats:

1. Strongest evidence is the **open package format + 3-tier disclosure contract**.  
2. Weakest evidence is **composition mechanics** and **MegaBrain harness equivalence**.  
3. Correct MegaBrain posture is **reuse existing skills + selectively ADAPT harness/authoring**, not clone Claude Code.  
4. No Agent System implementation was performed (skill DO NOT respected).

**Ship artifacts:** `REPORT.md`, `MECHANISMS.yaml`, `UNKNOWNS.md`, this review.
