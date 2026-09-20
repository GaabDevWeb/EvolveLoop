```yaml
id: FINDING-MCP-01
title: "Standardized host↔tool protocol (MCP) vs Capability Registry"
category: Protocols

problem: >
  Integrações tool/context fragmentadas por host; sem contrato partilhado
  entre LLM apps e servidores de contexto.

mechanism: >
  JSON-RPC 2.0 stateful com capability negotiation; servers expõem
  Resources, Prompts, Tools; hosts consentem invocações.

observed_in:
  - Model Context Protocol
  - CursorSKILLS mcp/ host config

evidence:
  - claim: "MCP uses JSON-RPC between Hosts, Clients, Servers"
    label: DOCUMENTED
    source: "https://modelcontextprotocol.io/specification/2025-03-26"
  - claim: "CursorSKILLS ships mcp.json with multiple servers"
    label: OBSERVED
    source: "mcp/README.md"

why_it_exists: "LSP-like standardization for AI tool/context ecosystem"

benefits:
  - Composable third-party servers
  - Shared client UX for auth/consent
costs:
  - Tools are arbitrary code execution
  - Protocol does not replace orchestration/evidence/policy of MegaBrain
failure_modes:
  - Untrusted tool descriptions
  - Over-permissioned servers
alternatives:
  - Proprietary host plugins only
  - Capability Registry cursor-skill providers only

conditions: "Host implements MCP client; user consent UX"

technical_factors: "Interoperability + negotiation"
product_factors: "One settings surface for many tools"
adoption_factors: "Ecosystem of npx servers; IDE adoption"

our_current_state: "MCP used at Cursor host layer; Capability Registry for IR workers/gates"
equivalence: PARTIAL
gap: "MCP tools are not automatically IR capabilities with evidence/DoD"
applicability: "Keep MCP for host tools; do not duplicate as Agent Registry"

utility: USEFUL
decision: ALREADY_PRESENT
confidence: HIGH
```
