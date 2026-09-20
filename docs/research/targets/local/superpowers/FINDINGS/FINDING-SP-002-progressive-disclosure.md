```yaml
id: FINDING-SP-002
title: "Trigger-only skill descriptions prevent description-as-workflow shortcuts"
category: Skills / Progressive Disclosure / Prompt Structure

problem: >
  When a skill description summarizes the workflow, agents may follow the
  short text and skip loading/following the full skill body (e.g. one review
  instead of two-stage review).

mechanism: >
  Frontmatter description states ONLY triggering conditions ("Use when…");
  process lives in SKILL.md body loaded on demand; forbid @ force-load;
  keep frequently injected skills tiny; put heavy reference in sibling files.

observed_in:
  - superpowers

evidence:
  - claim: writing-skills documents measured failure where workflow-in-description caused single review
    label: OBSERVED
    source: skills/writing-skills/SKILL.md
  - claim: SDD description avoids workflow summary; body has full flowchart
    label: OBSERVED
    source: skills/subagent-driven-development/SKILL.md
  - claim: Token budgets for hot skills (<150–200 words guidance)
    label: OBSERVED
    source: skills/writing-skills/SKILL.md

why_it_exists: >
  Agents optimize for short instructions; description is always visible to
  the router, body is not.

benefits:
  - Correct procedure following after invoke
  - Lower ambient context
  - Clearer skill discovery semantics

costs:
  - Descriptions less “marketing informative”
  - Requires discipline in skill authoring reviews

failure_modes:
  - Authors sneak workflow into description again
  - Hosts that dump all skill bodies into context negate benefit

alternatives:
  - Always full-body in system prompt (expensive)
  - Programmatic workflow engine (different architecture)

conditions: Hosts that surface descriptions for selection and load bodies separately

technical_factors: Agent Skills frontmatter spec alignment
product_factors: skill-authoring standards
adoption_factors: Easy ADAPT into existing SKILL.md corpus

our_current_state: Skills with mixed description quality
equivalence: SUBSTANTIAL
gap: Uniform anti-pattern enforcement + eval that descriptions don't replace bodies
applicability: Direct

utility: USEFUL
decision: ADAPT
confidence: HIGH
```
