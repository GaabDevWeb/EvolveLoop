# P-010 — MCP as host-boundary tool protocol (not app registry)

**Pattern:** Expose third-party tools/resources via MCP Host/Client/Server with capability negotiation; enforce trust in the *host*; keep application Capability/Provider registries separate.

**Observed In:**
- EXTERNAL: mcp (spec mechanisms), cursor, claude-code, codex, cline, roo-code, openai-agents-sdk, crewai, microsoft-agent-framework, pydanticai toolsets
- LOCAL: agency-agents (MCP memory addon pattern only)

**Mechanism:** stdio / streamable HTTP transports; tools schema; optional resources/prompts; host-enforced auth and approvals.

**Problem Solved:** N×M custom tool adapters; extend agents without forking cores.

**Independent Implementations:** Nearly all modern coding harnesses as MCP hosts; SDK MCP clients (OpenAI, CrewAI, PAI).

**Benefits:** Ecosystem leverage; clear protocol evolution; multimodal content model.

**Costs:** Version churn; security if host trusts server annotations; tool explosion; duplicate registry temptation.

**Failure Modes:** Reimplement transports in orchestrator; replace Capability Registry with MCP; MCP outside sandbox; “tool everything” via MCP.

**Counterexamples:** Aider (no MCP in dossier inventory); SWE-agent tool bundles (different packaging).

**Evidence:** SPEC + multi-host OBSERVED/DOCUMENTED. Confidence HIGH.

**Our Architecture:** MCP via Cursor host — PRESENT; ADOPT transports/OAuth at host; REJECT reimplement / registry replace.

**Applicability:** ADOPT host consumption; ADAPT Policy mapping; PROTOTYPE Resources/Elicitation only if gap proven.

**Confidence:** HIGH
