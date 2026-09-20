# AP-001 — Duplicate capability / agent registries

```yaml
id: ANTI-001
title: Duplicate capability / agent / tool registries
problem: Multiple overlapping registries for the same semantic role (tools, agents, skills) drift and fight for authority.
anti_pattern: Invent a second Agent Registry or replace Capability/Provider registries with MCP/vendor agent catalogs.
observed_in:
  - EXTERNAL/mcp (AP-DUPLICATE-REGISTRY)
  - EXTERNAL/codex (REJECT second Tool/Agent registry)
  - EXTERNAL/roo-code (REJECT modes as Agent Registry)
  - EXTERNAL/crewai / microsoft-agent-framework / pydanticai (REJECT embed + registry temptation)
evidence:
  - claim: Dossiers repeatedly mark second registries as REJECT vs MegaBrain baseline.
    label: DOCUMENTED
    source: research/targets/external/{mcp,codex,roo-code,crewai}/REPORT.md; research/DO-NOT-CHANGE.md
why_it_happens: Vendor vocab uses "Agent" and "Tool" for packaging; teams mirror names 1:1 into architecture.
negative_effects:
  - Dual sources of truth
  - Policy holes (one registry gated, the other not)
  - Migration thrash
failure_modes:
  - MCP tools bypass Capability Policy
  - Persona markdown libraries treated as runtime agents
alternatives:
  - Map external surfaces into Capability/Provider + Skills + Policy
  - Host MCP at boundary only
our_current_state: Capability + Provider registries PRESENT (DO-NOT-CHANGE)
applicability: Always relevant when integrating SDKs
decision: REJECT
confidence: HIGH
```
