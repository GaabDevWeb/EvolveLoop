# P-003 — MCP consumption via host

```text
PATTERN
Observed in: mcp (spec), cursor, claude-code, codex, openai-agents-sdk, crewai, roo-code, openhands (EXTERNAL)
Differences:
  - Semantic tool surface vs wire transport/OAuth/consent
  - Host-enforced Roots/annotations vs full OS sandbox
Common mechanism: Coding harness acts as MCP Host/Client; servers expose tools/resources/prompts over standard transports
Why it appears repeatedly: Interoperable tool ecosystem without each agent reinventing connectors
Evidence: CROSS-SYSTEM-ANALYSIS §3; CROSS-INVESTIGATION-REVIEW §1.6; DO-NOT-CHANGE MCP row
Applicability: ADOPT transports/consent at Cursor host; REJECT reimplement in MegaBrain orchestrator; Capabilities remain SSOT for “what may run”
Decision: ADOPT (host) | REJECT (reimplement) | ALREADY_PRESENT (semantic)
Confidence: HIGH
Supports Principle: PRINCIPLE-06, PRINCIPLE-02
```
