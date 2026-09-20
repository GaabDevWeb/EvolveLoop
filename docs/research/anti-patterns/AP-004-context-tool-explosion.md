# AP-004 — Context / tool explosion

```yaml
id: ANTI-004
title: Context and tool explosion
problem: Too many always-on tools, skills, rules, and MCP servers fill the window and dilute attention.
anti_pattern: "Tool everything" via MCP; advertise full skill bodies; unbounded tool lists.
observed_in:
  - EXTERNAL/mcp (AP-TOOL-EVERYTHING)
  - EXTERNAL/openai-agents-sdk (AP-context-explosion)
  - EXTERNAL/claude-code (context-explosion warning)
  - EXTERNAL/cline M06 / anthropic progressive disclosure (motivating countermeasure)
evidence:
  - claim: Multiple dossiers warn context explosion and MCP tool sprawl.
    label: DOCUMENTED
    source: targets/external/{mcp,openai-agents-sdk,claude-code}/MECHANISMS.yaml
why_it_happens: Extensibility without budgets; marketplace incentives.
negative_effects:
  - Degraded tool selection
  - Cost/latency
  - Compaction damage
failure_modes:
  - Catalog larger than task
  - Duplicate overlapping tools
alternatives:
  - Progressive disclosure (P-001)
  - Deferred toolsets (PydanticAI)
  - Skill list budgets (Codex notes)
our_current_state: Skills PRESENT; list budgets / deferred load PARTIAL → PROTOTYPE
applicability: Skill and MCP governance
decision: ADAPT limits / REJECT unbounded catalogs as default
confidence: HIGH
```
