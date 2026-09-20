# AP-003 — Over-agentization / roster tourism

```yaml
id: ANTI-003
title: Over-agentization
problem: Sprawl of persona agents and prompt-only orchestrators without runtime contracts.
anti_pattern: Bulk-import specialist rosters or "orchestrator personas" that claim end-to-end pipelines in prose.
observed_in:
  - LOCAL/agency-agents (REJECT roster bulk; REJECT prompt orchestrator)
  - EXTERNAL/crewai (AP04_over_agentization_risk; REJECT Role Agent library as MegaBrain runtime)
  - EXTERNAL/microsoft-agent-framework (AP-UNBOUNDED-GROUPCHAT)
evidence:
  - claim: agency-agents decisions REJECT bulk roster and prompt-only orchestrator as architecture.
    label: DOCUMENTED
    source: targets/local/agency-agents/REPORT.md §7
why_it_happens: Role-play feels like architecture; demos scale personas cheaper than contracts.
negative_effects:
  - Context blow-up advertising hundreds of skills
  - Conflicting specialists
  - No evidence gates
failure_modes:
  - Nested group chat without termination
  - Orchestrator markdown replacing Runtime
alternatives:
  - PDA roles + Capability IR
  - Lazy router over large catalogs (PROTOTYPE in agency-agents)
our_current_state: PDA multi-agent PRESENT — protect from roster imports
applicability: Multi-agent design reviews
decision: REJECT
confidence: HIGH
```
