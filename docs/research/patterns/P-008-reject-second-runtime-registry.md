# P-008 — Reject second runtime / second registry

```text
PATTERN
Observed in: reject_embed cluster — agency-agents, mattpocock-skills (LOCAL); crewai, cursor, langgraph, mcp, microsoft-agent-framework, openhands, pydanticai (EXTERNAL)
Differences:
  - Reject embedding whole SDK vs reject persona roster vs reject MCP reimplement (related but distinct REJECT reasons)
Common mechanism: Keep one control plane and one callable inventory; treat foreign systems as adapters or content, not cores
Why it appears repeatedly: Dual-stack and duplicate SSOTs destroy Policy/Evidence coherence
Evidence: CROSS-SYSTEM-ANALYSIS §3; aggregate reject_embed (9); DO-NOT-CHANGE; CROSS §7.9 anti-duplication success
Applicability: Directly affirms MegaBrain core — fashion pressure is the threat model
Decision: REJECT
Confidence: HIGH
Supports Principle: PRINCIPLE-01, PRINCIPLE-02, PRINCIPLE-09
```
