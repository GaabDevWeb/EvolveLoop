# UNKNOWNS — Anthropic Agent Skills

**Target:** anthropic-agent-skills (OFFICIAL_EXTERNAL)  
**Date:** 2026-09-18  
**Rule:** lacunas sem fonte primária → `UNKNOWN` (não inventar).

---

## Access / observability

| ID | Unknown | Why it matters | How to resolve |
|----|---------|----------------|----------------|
| U-01 | Exact system-prompt template Anthropic uses for the skill catalog | Affects replication fidelity of disclosure | Capture redacted prompt dumps in controlled Claude Code/API sessions; compare to client-guide XML examples |
| U-02 | Activation “relevance” algorithm beyond model judgment | Needed if MegaBrain wants harness-side triggers | Treat model-driven as normative (client guide); measure false +/- empirically |
| U-03 | Cursor Agent / MegaBrain harness: whether tier-1 catalog injection matches Anthropic | Baseline says skills IMPLEMENTED; loading strategy not proven | Audit Cursor skill loading / `disable-model-invocation` behavior; OBSERVE sessions |
| U-04 | Whether MegaBrain/Cursor protects skill content under context compaction | AAS-09 applicability | Instrument long sessions; or read Cursor internals if/when public |
| U-05 | Token savings of progressive disclosure under realistic MegaBrain skill counts | Justifies ADAPT investment | Controlled A/B: all-bodies-always-on vs 3-tier (PROTOTYPE experiment) |

---

## Spec / product gaps

| ID | Unknown | Notes |
|----|---------|-------|
| U-06 | Formal composition protocol for “combine Skills” | Benefit stated; no skill-graph / dependency IR in open standard → composition mechanism = UNKNOWN beyond multi-activation |
| U-07 | Runtime semantics of `allowed-tools` across non–Claude-Code clients | Marked experimental in spec; support “may vary” |
| U-08 | How `metadata` keys are consumed by Anthropic products | Spec: arbitrary string map for clients; Claude Code “doesn't act on contents” |
| U-09 | Agent self-authoring of skills (future stated in engineering post) | Roadmap language — not a current mechanism claim |
| U-10 | ZDR / retention edge cases for Skills vs other features | Overview: Skills not ZDR-eligible; details beyond that not mined here |

---

## CONFLICTS (sources disagree)

```text
CONFLICT:
  claim: Precedence when the same skill name exists at user vs project scope
  source_a: Claude Code skills docs — enterprise > personal > project
  source_b: agentskills client-implementation guide — “universal convention: project-level overrides user-level”
  difference: Opposite project vs user priority
  resolution: UNRESOLVED — treat as product-specific; open standard does not mandate paths/precedence
```

```text
CONFLICT:
  claim: Whether frontmatter name and description are required
  source_a: agentskills.io specification — name and description required; name must match directory
  source_b: Claude Code docs — “All fields are optional. Only description is recommended”; name defaults to directory; description falls back to first markdown paragraph
  difference: Strict standard vs lenient product
  resolution: prefer_primary for portable skills (spec); document Claude Code as extension surface
```

```text
CONFLICT:
  claim: Reserved words / extra name constraints
  source_a: Anthropic overview — name cannot contain XML tags; reserved words “anthropic”, “claude”
  source_b: agentskills.io specification (fetched) — charset/length/dir-match rules; reserved words not listed in the same table
  difference: Product overview adds constraints not highlighted in open standard table
  resolution: UNRESOLVED for open standard; apply Anthropic constraints when publishing to Anthropic surfaces
```

```text
CONFLICT:
  claim: Where skill instructions are injected and how long they persist
  source_a: Anthropic overview / engineering — model reads SKILL.md via bash into context when triggered
  source_b: Claude Code — harness may inject on `/name`; “once a skill loads, its content stays in context across turns”
  difference: Activation path and persistence semantics differ by surface
  resolution: prefer_primary per surface; do not unify into one false universal
```

---

## Out of scope (explicit)

- Internals of **superpowers** / **mattpocock** / other corpus skill libs (separate targets).
- Proprietary Claude model weights or routing.
- Live Skills API billing nuances beyond “code execution required” (DOCUMENTED prerequisite).

---

## Hypotheses (not facts)

| ID | Hypothesis | Status |
|----|------------|--------|
| H-01 | Enforcing 3-tier loading in Cursor reduces tokens ≥X% at ≥N installed skills without hurting task success | HYPOTHESIS — needs experiment |
| H-02 | Preferring script execution over reading script source reduces tokens and variance on fragile ops | HYPOTHESIS — needs experiment |
| H-03 | Without compaction protection, long MegaBrain sessions silently lose skill constraints | HYPOTHESIS — needs observation |
