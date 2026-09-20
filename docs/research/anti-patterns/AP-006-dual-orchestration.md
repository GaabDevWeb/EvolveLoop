# AP-006 — Dual orchestration stacks

```yaml
id: ANTI-006
title: Dual orchestration
problem: Two control planes (e.g. Crew + Flow, or Orchestrator + embedded graph library) both own control flow.
anti_pattern: Run MegaBrain Orchestrator alongside an embedded LangGraph/CrewAI/LlamaIndex runtime for the same jobs.
observed_in:
  - EXTERNAL/crewai (AP01_dual_orchestration)
  - EXTERNAL REJECT-embed cluster (langgraph, llamaindex, maf, pydanticai, crewai)
evidence:
  - claim: CrewAI dossier flags dual orchestration; cross-dossier REJECT embed foreign runtime.
    label: DOCUMENTED
    source: targets/external/crewai/MECHANISMS.yaml; CROSS-SYSTEM-ANALYSIS decision matrix
why_it_happens: Feature envy; "use the popular graph lib" without role mapping.
negative_effects:
  - Split checkpoints
  - Unclear Policy ownership
  - Debugging nightmares
failure_modes:
  - Two resume models
  - Duplicate agent loops
alternatives:
  - Single Orchestrator; ADAPT graph ideas only
our_current_state: Orchestrator PRESENT — protect
applicability: Framework adoption debates
decision: REJECT
confidence: HIGH
```
