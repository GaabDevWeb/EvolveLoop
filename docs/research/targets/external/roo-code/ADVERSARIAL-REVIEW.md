# ADVERSARIAL-REVIEW — Roo Code investigation

**Date:** 2026-09-18  
**Reviewer:** same SOLE investigator (self-critique before handoff)  
**Skill constraints:** no implementation; no rankings; no invented internals; epistemic labels.

## Attack 1 — “Just copy Modes into MegaBrain”

**Temptation:** Roo’s mode system is famous and clear → implement `kind: Mode` registry.

**Rebuttal:** MegaBrain already has PDA roles, skills, Capability/Provider registries, Policy. A parallel Mode registry is duplication (`REJECT` second registry). Correct move is `ADAPT`: encode specialization as skill/capability ACL packages, not port Roo YAML.

**Verdict:** Held — decisions use ADAPT/ALREADY_PRESENT/REJECT appropriately.

## Attack 2 — “Orchestrator with empty tools is clearly superior”

**Temptation:** Treat Boomerang as best-practice mandate.

**Rebuttal:** Evidence is `DOCUMENTED` design rationale (context poisoning), not measured win rates. MegaBrain already has an orchestrator role class. Summary-only handoffs may **lose** evidence fidelity vs Evidence Bus — trade-off, not free lunch. Nested subtasks have documented UX failure modes.

**Verdict:** Held — ADAPT handoff contract; not ADOPT wholesale.

## Attack 3 — Popularity / stars as quality

**Temptation:** ~24k stars ⇒ architecture to emulate.

**Rebuttal:** Product is **shutdown/archived**. Popularity ≠ merit; lifecycle `REJECT` as runtime dependency.

**Verdict:** Held — adoption section separates distribution from technical decisions.

## Attack 4 — Invented Cline fork details

**Temptation:** Narrate exact fork date, shared modules, “Roo is Cline + modes”.

**Rebuttal:** Only README origin statement + historical UI scraps are solid; API fork metadata conflicts. Deep lineage left `UNKNOWN` / CROSS.

**Verdict:** Held — explicit CONFLICT + UNKNOWNS U-10/U-11.

## Attack 5 — Over-claim from docs as OBSERVED runtime

**Temptation:** Label all doc claims OBSERVED.

**Rebuttal:** Without running the extension, behavioral claims stay `DOCUMENTED`; only public source/API snippets are `OBSERVED`.

**Verdict:** Mostly held — report distinguishes; residual risk that docs drift from v3.54.0 (U-02).

## Attack 6 — Marketing / free Gemini indexing as architecture truth

**Temptation:** Treat “completely free setup” banners as technical requirements.

**Rebuttal:** Indexing mechanism is real (`DOCUMENTED`); pricing/promo language discarded for decisions. DEFER code index for MegaBrain core.

**Verdict:** Held.

## Attack 7 — Missing failure modes

**Self-check:** Did we list costs?

Covered: auto-approve shell risk; context poisoning; nested task complexity; `.rooignore` not OS sandbox; orchestrator override adding `read` can undo design; mention bypass nuances for ignore files.

**Gap remaining:** No MEASURED latency/token costs for Boomerang vs single-mode — correctly `UNKNOWN`, not fabricated.

## Attack 8 — Skill process integrity

| Checklist item | Status |
|----------------|--------|
| TARGET_RESEARCH flow not inverted without note | OK |
| Epistemic labels on key claims | OK |
| Decisions ∈ allowed set | OK |
| No Agent System code changes | OK |
| No ranking scores | OK |
| Output artifacts complete | OK (REPORT, MECHANISMS, UNKNOWNS, this file) |
| Baseline comparison present | OK |
| Primary sources preferred | OK (docs + GitHub raw/API) |

## Residual investigator biases

1. **Docs-heavy bias:** less deep `src/core` reading than types packages — internals under-weighted.
2. **Post-mortem bias:** may undervalue mechanisms that only mattered with live Cloud.
3. **MegaBrain lens bias:** mapping may force Roo concepts into Capability/Policy vocabulary; residual differences called PARTIAL.

## Final adversarial score (qualitative only — not a ranking)

Investigation is **fit for CROSS wave intake** with caveats: Cline lineage incomplete; runtime unverified; product dead → mine **patterns**, do not resurrect dependency.

**Blockers before PRINCIPLE_EXTRACTION:** need recurrence across ≥2 systems (likely Cline + others) and preferably one MEASURED or multi-`OBSERVED` confirmation of Boomerang context benefit.
