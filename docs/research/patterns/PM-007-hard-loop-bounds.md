# P-007 — Hard loop / cost / iteration bounds

**Pattern:** Enforce numeric ceilings on tool iterations, turns, cost, or wall time; salvage or stop cleanly when hit.

**Observed In:**
- EXTERNAL: crewai (M12 max_iter), claude-code (CC-BUDGET), swe-agent (M12 cost/call limits + M11 autosubmit), llamaindex (LI-MAXITER), pydanticai (ModelRetry budgets), microsoft-agent-framework (termination_condition / max rounds), openhands (stuck-related stops)
- LOCAL: security-audit (budget reservation for critics)

**Mechanism:** Counters in the executor; optional salvage (submit partial patch); reserve budget for validation phases.

**Problem Solved:** Runaway ReAct/tool loops burning money and context.

**Independent Implementations:** CrewAI AgentExecutor max_iter; SWE-agent per-instance limits; PydanticAI retry budgets; security-audit profile budgets.

**Benefits:** Predictable cost; forces termination; enables eval fairness.

**Costs:** Premature stop; gaming via shorter loops; false “done”.

**Failure Modes:** Soft “please stop” in prompts; limits only on LLM calls but not shell; no salvage → lost work.

**Counterexamples:** Unbounded group-chat / Magentic-style loops without max_stall (anti-pattern cluster).

**Evidence:** DOCUMENTED/OBSERVED across SDKs + SWE-agent. Confidence HIGH.

**Our Architecture:** PARTIAL — ADAPT audit of CursorSKILLS/orchestrator caps; align with Evidence completion rules.

**Applicability:** ADAPT hard caps; REJECT unconstrained bash agency as default.

**Confidence:** HIGH
