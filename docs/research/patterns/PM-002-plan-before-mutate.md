# P-002 — Plan-before-mutate (Plan | Act)

**Pattern:** Separate a read-heavy / planning posture from a mutation-allowed posture, with tool allowlists or explicit user gates between them.

**Observed In:**
- EXTERNAL: cline (M04 Plan/Act), cursor (CUR-PLAN), openhands (M08), roo-code (modes + orchestrator), aider (architect→editor), codex (M17 plan tool)
- LOCAL: superpowers (brainstorming path router + approval; M-WORKFLOW-PIPE)

**Mechanism:** Mode or phase switches change which tools may run (e.g. no write/shell until plan accepted) or split models/roles (architect vs editor).

**Problem Solved:** Premature edits, unaligned large changes, and irreversible side effects before human or critic review.

**Independent Implementations:** Cline Plan vs Act product modes; Cursor Plan Mode; OpenHands planning-then-execute docs; Roo mode tool groups; Aider two-model split; LOCAL superpowers hard approval before implementation path.

**Benefits:** Reduces wasted mutations; improves reviewability; maps cleanly to PDA plan/exec.

**Costs:** Extra turns/latency; agents may “plan theater”; overly strict modes block legitimate small fixes.

**Failure Modes:** Plan mode that still allows writes; rubber-stamp approve; plan IR disconnected from execution evidence.

**Counterexamples:** SWE-agent in-prompt procedural plan without separate planner (still mutates in one loop); pure ReAct coding loops.

**Evidence:** DOCUMENTED/OBSERVED in cline/cursor/openhands/aider/superpowers reports. Confidence HIGH for recurrence.

**Our Architecture:** PDA plan/exec + Capability IR — ALREADY_PRESENT role split; residual ADAPT for explicit mutation tool whitelist by phase.

**Applicability:** ADAPT into Policy/IR gates; REJECT cloning vendor Plan UX.

**Confidence:** HIGH
