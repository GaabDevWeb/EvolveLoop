# P-005 — Approval policy orthogonal to sandbox enforcement

**Pattern:** Treat *who must confirm* separately from *what the OS/runtime can physically do*; compose both; refuse “full access” postures that cannot be enforced.

**Observed In:**
- EXTERNAL: codex (M02+M03+M04), openhands (M01+M04), claude-code (CC-PERM+CC-SANDBOX), swe-agent (SWE-ReX + blocklists), openai-agents-sdk (SandboxAgent + guardrails)
- Contrast EXTERNAL mcp: host-enforced security (annotations untrusted alone)

**Mechanism:** Sandbox = enforcement plane (FS/net/process). Approval = decision plane (human/auto-review). Permission profiles name a combined posture.

**Problem Solved:** Collapsing “allowed” into a single soft flag; false sense of isolation from prompt rules.

**Independent Implementations:** Codex dual systems + named profiles (beta); OpenHands workspace isolation + confirmation analyzer; Claude sandbox Bash; SWE-ReX env abstraction.

**Benefits:** Clearer threat model; safer defaults; profile reuse.

**Costs:** UX complexity; dual systems can confuse (Codex AP03 warned); platform gaps → unenforceable claims.

**Failure Modes:** MCP outside host sandbox; “sandbox” that is only Unix user local; approve-all + weak jail.

**Counterexamples:** Policy-only IDEs without OS jail (PARTIAL isolation).

**Evidence:** OBSERVED/DOCUMENTED especially `targets/external/codex`, `openhands`. Confidence HIGH for pattern; MEDIUM for our enforceability.

**Our Architecture:** Policy PRESENT; OS sandbox UNKNOWN–PARTIAL → PROTOTYPE.

**Applicability:** PROTOTYPE then ADAPT into Policy; do not duplicate Policy Engine.

**Confidence:** HIGH (mechanism); MEDIUM (fit to Cursor host constraints).
