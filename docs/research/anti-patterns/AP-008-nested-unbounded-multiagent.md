# AP-008 — Nested unbounded multi-agent

```yaml
id: ANTI-008
title: Nested unbounded multi-agent
problem: Subtasks spawn subtasks or group chats without termination, ACL, or summary discipline.
anti_pattern: Deep Boomerang/team nesting; group chat without max_rounds/max_stall; broadcast nesting.
observed_in:
  - EXTERNAL/roo-code (AP-NESTED-SUBTASKS)
  - EXTERNAL/microsoft-agent-framework (AP-UNBOUNDED-GROUPCHAT, AP-NESTED-TEAM-BROADCAST)
  - EXTERNAL/openai-agents-sdk (AP-handoff-overuse)
evidence:
  - claim: Roo and MAF dossiers document nested/unbounded multi-agent failure modes.
    label: DOCUMENTED
    source: targets/external/{roo-code,microsoft-agent-framework,openai-agents-sdk}/MECHANISMS.yaml
why_it_happens: Recursive delegation is easy; termination conditions are not.
negative_effects:
  - Cost blowouts
  - Lost ownership
  - Context poison
failure_modes:
  - No max_iter (violates P-007)
  - Child mutates shared state
alternatives:
  - P-003 isolation + P-011 ACL + P-007 bounds
our_current_state: PDA PRESENT — need explicit nesting caps (PARTIAL)
applicability: Multi-agent features
decision: ADAPT bounds / REJECT unbounded groupchat patterns
confidence: HIGH
```
