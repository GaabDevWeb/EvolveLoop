# P-011 — Restricted handoff / tool-group ACL

**Pattern:** Explicitly constrain which agent/mode may call which peer or tool group (ACL), distinguishing *manager keeps control* (agents-as-tools) from *peer owns remainder* (handoff).

**Observed In:**
- EXTERNAL: llamaindex (LI-HANDOFF can_handoff_to), openai-agents-sdk (M04 vs M05), roo-code (RC-TOOL-GROUPS + modes), microsoft-agent-framework (handoff mesh vs agent-as-tool), crewai (delegation tools), cline (read-only subagents)
- LOCAL: agency-agents (NEXUS doctrine — DOCUMENTED coordination), security-audit (dual mode / load≠authorize)

**Mechanism:** Allowlists on edges; mode→tool-group maps; read-only flags for explore children.

**Problem Solved:** Uncontrolled specialist graphs; authority creep; context and permission confusion.

**Independent Implementations:** LlamaIndex handoff ACL; Roo tool groups; OpenAI dual delegation patterns; Cline read-only subagents.

**Benefits:** Least privilege; clearer topology; fewer nested disasters.

**Costs:** Config burden; overly tight ACL blocks useful routing.

**Failure Modes:** Handoff overuse; nested team broadcast (MAF/AutoGen warnings); modes as fake Agent Registry.

**Counterexamples:** Fully open Crew hierarchical manager without edge ACL; unbounded GroupChat.

**Evidence:** DOCUMENTED in LlamaIndex/OpenAI/Roo/MAF reports. Confidence MEDIUM–HIGH.

**Our Architecture:** PDA roles PARTIAL ACL formalization — ADAPT; REJECT second agent registry for modes/personas.

**Applicability:** ADAPT into Policy + Task contracts.

**Confidence:** MEDIUM–HIGH
