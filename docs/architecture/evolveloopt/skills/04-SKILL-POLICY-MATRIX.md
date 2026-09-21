# 04 — Skill × Policy Matrix

| Skill | Capability gate | Scope | Timeout | Budget | Confirmation | Evidence | Grounding |
|-------|-----------------|-------|---------|--------|--------------|----------|-----------|
| filesystem.* | CapabilityAuthority | workspaceRoot+realpath | Engine | B01 | write/shell | builders | N/A |
| shell.execute | allowShell | workspace cwd | Engine | B01 | confirm | builders | N/A |
| grill-me | PRE_EXECUTE artifact | workspace artifact | N/A | N/A | N/A | authority evidence | N/A |
| image-to-code | PRE_EXECUTE artifact | workspace | N/A | N/A | N/A | authority | N/A |
| wiki/grounding | gateContext status | N/A | N/A | N/A | N/A | weak | **caller status forgeable (FAILED)** |
| LLM skills | policy/agent | agent tools | vendor | vendor | HITL | agent files | policy |
