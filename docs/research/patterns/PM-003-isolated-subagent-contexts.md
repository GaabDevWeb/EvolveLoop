# P-003 — Isolated subagent contexts with summary handoff

**Pattern:** Fan-out specialized work into child contexts that do not dump raw tool noise into the parent; return a bounded summary (and optional artifacts).

**Observed In:**
- EXTERNAL: claude-code (CC-SUBAGENT), cursor (CUR-SUBAGENT), cline (M11 read-only subagents), openhands (M09), openai-agents-sdk (agents-as-tools vs handoffs), roo-code (Boomerang/orchestrator), crewai (delegation tools), llamaindex (AgentWorkflow)
- LOCAL: superpowers (M-SDD-CONTROLLER fresh subagent), security-audit-skill (multi-agent waves with write isolation)

**Mechanism:** Parent retains control (manager/tools pattern) or transfers ownership (handoff). Isolation is contextual (message history) and sometimes capability-restricted (read-only explore).

**Problem Solved:** Context pollution from search/logs/browser; parallel exploration; specialty without growing one transcript forever.

**Independent Implementations:** Cursor/Claude Task tool; Cline read-only fan-out; OpenAI agents-as-tools; Roo subtask summary return; Superpowers SDD controller loop.

**Benefits:** Token locality; parallelization; clearer ownership of intermediate mess.

**Costs:** Handoff information loss; nested subagents; coordination overhead; inconsistent ACL.

**Failure Modes:** Nested unbounded teams; handoff overuse (AP in openai-agents); context poison if child writes into shared mutable state; prompt-only “orchestrator” without runtime.

**Counterexamples:** Single-thread Aider chat; classic SWE-agent one trajectory.

**Evidence:** OBSERVED/DOCUMENTED across coding harnesses + LOCAL SDD. Confidence HIGH.

**Our Architecture:** Task tool PDA roles — ALREADY_PRESENT; ADAPT isolation discipline + handoff contracts (see P-011).

**Applicability:** Strengthen contracts; REJECT persona-roster tourism as substitute.

**Confidence:** HIGH
