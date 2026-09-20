# ADVERSARIAL-REVIEW — SWE-agent

Investigator self-critique · 2026-09-18 · TARGET_RESEARCH

## Purpose

Attack this investigation’s conclusions before handoff. Prefer **over-refusal of confidence** to silent invention.

---

## Attacks on evidence quality

| Attack | Severity | Response |
|--------|----------|----------|
| Relied on docs + selective source files, not full repo audit | Medium | Accepted — key loops/env/tools OBSERVED; peripheral modules (inspector UI, all hooks) under-sampled → listed in UNKNOWNS |
| Paper numbers are 2024 / GPT-4 Turbo; product moved to 1.x + new models | High | Separated MEASURED (paper) vs DOCUMENTED (news/SoTA). Did not project paper % onto Claude 3.7 |
| Docs still advertise 12.29% and “SOTA among open-source” while recommending mini | Medium | Flagged CONFLICT + lifecycle maintenance-only; popularity/marketing separated |
| Ablations are on Lite (300), not full 2294 | Medium | Reported as Lite MEASURED; do not over-generalize effect sizes to full set without paper caveats |
| Default.yaml ACI ≠ paper ACI | High | Explicit UNKNOWN on whether lint/search ablations still apply to current default bundles; decisions target **principles**, not “copy default.yaml” |
| mini-swe-agent FAQ argues bash-only matches performance → undermines “need ACI” | High | Treat as **HYPOTHESIS from maintainers**: stronger models may reduce ACI value; paper MEASURED ACI gains under GPT-4 Turbo era. Decision ADAPT principles with DEFER on heavy custom viewers |
| No independent leaderboard scrape for current ranks | Medium | Exact modern rankings UNKNOWN; refuse MEASURED SoTA |

---

## Attacks on MegaBrain decisions

| Decision challenged | Counter-argument | Resolution |
|---------------------|------------------|------------|
| ADAPT ACI principles | MegaBrain already has IDE tools; duplicating windowed viewer is waste | Keep ADAPT on **feedback design principles**; DEFER M08 reimplementation |
| PROTOTYPE SWE-ReX-like sandbox | Cursor sandbox / host tools may suffice; SWE-ReX adds ops burden | Keep PROTOTYPE with security review gate; not ADOPT |
| ADAPT autosubmit | Salvaging bad patches pollutes evidence | ADAPT only with explicit `exit_status` + quality flags (inspired by SWE `submitted (exit_cost)` pattern) |
| ALREADY_PRESENT blocklist/planning | May over-claim equivalence | Softened with residual_gap notes; confidence MEDIUM |
| REJECT unconstrained loop | SWE-bench success seemingly needs agency | Reject as **default policy**; agency can exist inside Policy-authorized Capability |

---

## Anti-patterns observed in target (for mining, not shaming)

1. **Autonomous loop without evidence gates** — success = model belief + optional harness later.
2. **Benchmark-coupled design** — prompts forbid test edits to match SWE-bench conventions; harmful if cargo-culted to general SE.
3. **Marketing/docs drift** — stale % and SoTA language vs maintenance-only reality.
4. **Scaffold complexity** — union-type CLI errors; motivation for mini (DOCUMENTED).
5. **Stateful shell fragility** — acknowledged by authors via mini’s subprocess model.

---

## Checklist (skill evals spirit)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives addressed or UNKNOWN
- [x] Epistemic labels on benchmark claims
- [x] OUR_CURRENT_MECHANISM compared via baseline
- [x] No Agent System implementation
- [x] No rankings-as-merit
- [x] CONFLICT blocks explicit
- [ ] Full principle extraction to `AGENT_ARCHITECTURE_PRINCIPLES.md` — **not done** (needs cross-system corroboration; single-target insufficient alone)

---

## Verdict

Investigation is **usable for handoff** at Level 1 with **HIGH confidence** on: architecture map, agent loop, env split, patch/autosubmit, paper-era ACI ablations, lifecycle supersession.

**LOW confidence** on: current competitive resolve rates, transfer of paper ACI to default 1.1 tool bundles, reviewer-loop value.

Primary transferable finding survives adversarial pressure: **shape tool observations and edit guardrails for LMs**; do not equate that with adopting the SWE-agent product tree.
