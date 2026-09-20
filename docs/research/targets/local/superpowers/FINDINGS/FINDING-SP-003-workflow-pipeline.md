```yaml
id: FINDING-SP-003
title: "Composed SDLC pipeline with path-scaled brainstorming gates"
category: Planning / Human-in-the-Loop / Workflow Methodology

problem: >
  Agents jump to code; ceremony is either skipped or applied uniformly,
  wasting time or causing unexamined implementation.

mechanism: >
  Mandatory composition: brainstorming (spike|bounded|architectural) with
  HARD-GATE human approval before implementation → worktrees → writing-plans
  → SDD or executing-plans → TDD/review/verify → finishing branch. Path
  scales artifacts; approval gate never scales away. Complexity ratchet
  upgrades mid-task only.

observed_in:
  - superpowers

evidence:
  - claim: README documents the basic workflow order and mandatory skill check
    label: DOCUMENTED
    source: README.md
  - claim: brainstorming HARD-GATE and three paths
    label: OBSERVED
    source: skills/brainstorming/SKILL.md
  - claim: writing-plans requires bite-sized tasks and points to SDD
    label: OBSERVED
    source: skills/writing-plans/SKILL.md

why_it_exists: >
  Product thesis: coding agents need process skills, not only coding skills;
  auto-trigger via bootstrap makes process default.

benefits:
  - Aligns design before code
  - Scales ceremony to task size
  - Clear handoffs between skills

costs:
  - Latency to first code
  - User friction if approval gates feel heavy
  - Risk of over-triggering brainstorming on trivial asks (mitigated by paths)

failure_modes:
  - Mis-classify bounded vs architectural
  - User overrides hierarchy to skip (allowed explicitly)
  - Skills conflict without priority rule (process skills first — using-superpowers)

alternatives:
  - Free-form agent autonomy
  - Orchestrator Task IR only without conversational brainstorming

conditions: Interactive feature/bug work with a human partner

technical_factors: Skill composition via prompts, not a central workflow engine binary
product_factors: Core Superpowers value proposition
adoption_factors: Overlaps MegaBrain brainstorming/writing-plans/orquestrar

our_current_state: Substantial methodology skills + orchestrator; weaker single path-router
equivalence: SUBSTANTIAL
gap: Explicit three-path classification + universal hard approval gate wording
applicability: High

utility: USEFUL
decision: ADAPT
confidence: HIGH
```
