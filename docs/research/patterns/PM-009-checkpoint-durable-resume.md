# P-009 — Checkpointed durable resume

**Pattern:** Persist execution progress at well-defined boundaries so crashes, HITL pauses, or restarts can resume without redoing completed side-effect-free work.

**Observed In:**
- EXTERNAL: langgraph (LG-CHECKPOINT, pending writes, durability modes), openai-agents-sdk (RunState), crewai (M16), microsoft-agent-framework (MAF-CKPT), openhands (M14), claude-code (CC-SESSION), cline (M08 shadow-git — related but product-different)
- LOCAL: superpowers (M-SDD-LEDGER plan-scoped progress)

**Mechanism:** Thread/job checkpoints; serialize wait state; durability sync/async trade-offs; ledgers that survive compaction.

**Problem Solved:** Long-running agent work is interruptible and recoverable.

**Independent Implementations:** LangGraph checkpointer; OpenAI RunState; CrewAI Flow persistence; Superpowers SDD ledger; OpenHands pause/resume.

**Benefits:** Reliability; HITL; time-travel/fork (optional).

**Costs:** Storage; consistency bugs; dual resume models; shadow-git ≠ graph checkpoint.

**Failure Modes:** Hidden agent state not in event log; pending writes lost on partial superstep failure; treating IDE file checkpoints as orchestrator durability.

**Counterexamples:** Stateless request modes (Codex ZDR notes); pure chat without jobs.

**Evidence:** OBSERVED/DOCUMENTED in LangGraph/OpenAI/CrewAI dossiers; LOCAL ledger OBSERVED intent. Confidence HIGH.

**Our Architecture:** jobs/checkpoints PARTIAL — ADAPT single resume model; PROTOTYPE HITL serialize.

**Applicability:** ADAPT ideas into orchestrator persistence; REJECT embedding LangGraph solely for checkpoints.

**Confidence:** HIGH
