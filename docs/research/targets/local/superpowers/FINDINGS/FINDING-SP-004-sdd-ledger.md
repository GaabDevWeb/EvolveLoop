```yaml
id: FINDING-SP-004
title: "Plan-scoped SDD ledger + file handoff for compaction-safe multi-agent execution"
category: Multi-Agent Coordination / Recovery / Evidence / State

problem: >
  Long SDD runs lose controller place after compaction and re-dispatch
  completed tasks; pasted diffs permanently inflate expensive context;
  reviewers are coachable by controllers; two reviewers double cost.

mechanism: >
  Controller dispatches fresh implementer subagents; task text and diffs move
  as files (task-brief, review-package); one dual-verdict reviewer; named
  models; ban suppressing findings; durable plan-scoped workspace
  `.superpowers/sdd/<plan>/` with progress.md ledger (identity line, Task
  complete markers, Ruling records); fix loop capped then adjudicate;
  continuous execution except irreversible/security/external/guess stops.

observed_in:
  - superpowers

evidence:
  - claim: SDD skill mandates ledger over conversation memory for recovery
    label: OBSERVED
    source: skills/subagent-driven-development/SKILL.md
  - claim: sdd-workspace script defines plan-scoped directory
    label: OBSERVED
    source: skills/subagent-driven-development/scripts/sdd-workspace
  - claim: v6.0 rewrite motivations (cost, gaming, file handoff, ledger)
    label: DOCUMENTED
    source: RELEASE-NOTES.md
  - claim: Plan Interfaces/Global Constraints feed isolated implementers
    label: OBSERVED
    source: skills/writing-plans/SKILL.md

why_it_exists: >
  Temporal: review cost/gaming drove v6.0; compaction redo drove plan-scoped
  ledger (specs 2026-07-06). Skill text calls re-dispatch "single most
  expensive failure observed" [DOCUMENTED in skill — not independently measured here].

benefits:
  - Resume after compaction
  - Lower reviewer token cost
  - Harder-to-game quality gates
  - Neighbor contracts without shared chat history

costs:
  - Process complexity; many artifacts
  - Depends on subagent tool availability
  - Still soft-enforced by prompts

failure_modes:
  - Stale/cross-plan ledger if ownership broken (mitigations added)
  - Harness without subagents falls back to executing-plans
  - Controller still can ignore ledger (prompt-level)

alternatives:
  - Single-agent plan execution with human checkpoints
  - External workflow engine / queue
  - MegaBrain Evidence Bus + checkpoints (map target)

conditions: Multi-task plans with subagent support and long sessions

technical_factors: Git worktree isolation + filesystem artifacts as state
product_factors: Enables "hours of autonomy" marketing claim
adoption_factors: Map ledger onto Evidence Bus / jobs — do not duplicate registries

our_current_state: PDA multi-agent SUBSTANTIAL; persistence/checkpoints PARTIAL
equivalence: PARTIAL
gap: Plan-scoped durable ledger + anti-coaching + file review packages as defaults
applicability: High for long implementation runs

utility: USEFUL
decision: ADAPT
confidence: HIGH
```
