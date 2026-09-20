# GAP-008 — Formal handoff / child ACL contracts

```text
EXTERNAL_MECHANISM   can_handoff_to ACL; tool-group maps; read-only subagents
PROBLEM_SOLVED       Least-privilege delegation; prevent authority creep
OUR_CURRENT_MECHANISM PDA roles PRESENT; edge ACL informal/PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Machine-checkable allowlists for who may spawn whom with which tools
TRADE_OFF            Rigidity vs safety
EVIDENCE             llamaindex LI-HANDOFF; roo RC-TOOL-GROUPS; cline M11; CROSS P-011
APPLICABILITY        Task tool / multi-agent MegaBrain
DECISION             ADAPT
```

**Provenance:** EXTERNAL llamaindex, roo, cline, openai-agents.
**Confidence:** MEDIUM–HIGH
