# ADVERSARIAL-REVIEW — agency-agents

Date: 2026-09-18  
Investigator: sole TARGET_RESEARCH pass  
Purpose: attack own conclusions before handoff

---

## 1. Strongest claim under fire

**Claim:** This corpus is a **persona roster + distribution adapters + coordination docs**, not an executable multi-agent runtime.

**Attack:** NEXUS + Agents Orchestrator + Hermes `delegate` + host “subagents” could constitute a real multi-agent system in practice.

**Defense:**
- `SECURITY.md` explicitly classifies agent files as non-executable prompt definitions and the repo as definitions + install/convert scripts (`DOCUMENTED`).
- No in-tree scheduler, message bus, agent process manager, or `package.json`/app runtime (`OBSERVED`).
- `agents-orchestrator` itself is a Markdown persona whose “spawn” steps are natural-language instructions to the host (`OBSERVED`).
- Hermes router is an **adapter** whose generated artifact is gitignored; even then it composes prompts/tools for Hermes — host still owns execution (`DOCUMENTED` / `OBSERVED` absence).

**Residual risk:** Hosts may implement true subagent runtimes. That would be **host architecture**, not Agency’s. Marked `U-AA-06`. Claim stands for **this LOCAL_CORPUS**.

**Verdict:** Claim **holds** for target as defined.

---

## 2. Where I might have over-fitted MegaBrain

| Risk | Mitigation |
|------|------------|
| Rejecting Orchestrator persona because MegaBrain already has orchestrator | Rejection is about **mechanism class** (prompt theatre vs runtime), not NIH |
| Calling Evidence Bus “equivalent” to Reality Checker | Softened to ethos ALREADY_PRESENT; enforcement is stronger in MegaBrain |
| PROTOTYPE on Hermes router without running convert | Confidence MEDIUM; U-AA-05 open |

---

## 3. Evidence quality gaps

| Gap | Impact |
|-----|--------|
| Scripts not executed | Install/convert behaviour is structural inference from source, not MEASURED |
| App not in corpus | Product UX / auto-update path UNKNOWN |
| No MEASURED evals of persona quality | “Production-ready / battle-tested” remains marketing |
| Sampled personas (not all 279 read end-to-end) | Schema claims from CONTRIBUTING+lint+samples; content quality variance UNKNOWN |
| NEXUS matrix may drift from roster | U-AA-09 |

---

## 4. Alternative interpretations considered

1. **“Skill marketplace for coding agents”** — fair product description; still not MegaBrain-style Agent System.
2. **“Multi-agent framework that ships as prompts”** — rejected; frameworks imply enforceable lifecycle.
3. **“Documentation-only”** — too weak; convert/install/CI are real engineering, just packaging.

Chosen: **SYSTEM_PROMPT_CORPUS + catalog + packaging** with optional **doctrine** for human/host orchestration.

---

## 5. Anti-patterns I almost missed

- **False-friend `testing/`** — would poison eval inventory if treated as harness tests.
- **Counting Markdown files as agents-in-runtime** — primary investigator lens hazard; countered explicitly.
- **Treating NEXUS as implemented pipeline** — doctrine ≠ code.

---

## 6. Decision pressure-test

| Decision | Could flip if… | Flip to |
|----------|----------------|---------|
| REJECT bulk roster | MegaBrain product wanted public domain specialist packs | ADAPT curated subset |
| REJECT prompt orchestrator | Evaluation showed host spawn API + evidence gates | PROTOTYPE thin playbook only |
| PROTOTYPE lazy router | Skill count stays small | DEFER |
| DEFER multi-host convert | Shipping skills to Claude/Codex becomes a goal | ADAPT tools.json-like manifest |

---

## 7. Consistency with corpus audit

- Aligns with `TARGET-INVENTORY` primary_type `SYSTEM_PROMPT_CORPUS` and `testing/` note.
- Tightens secondary_type caution: audit listed `MULTI_AGENT_SYSTEM` as secondary — this report treats that as **narrative/doctrine risk**, not confirmed runtime type.
- Closes U-AA-04 for this checkout; leaves U-AA-01/02/05/06 open.

---

## 8. What I would not defend in court

- Any claim that Agency **runs** Dev↔QA loops autonomously.
- Any quality ranking of individual personas.
- Exact behaviour of `agency_agents_delegate` without generated plugin + Hermes version.

---

## 9. Final self-score (non-numeric)

- Epistemic hygiene: **adequate** (labels + UNKNOWN file)
- Runtime vs roster distinction: **explicit**
- MegaBrain comparison: **present**, not over-proposed
- Remaining blind spot: **host-side multi-agent APIs** (out of corpus)

**Ship artifacts:** yes, with UNKNOWNS attached.
