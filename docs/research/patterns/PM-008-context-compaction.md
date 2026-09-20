# P-008 — Context compaction / condensation with recovery

**Pattern:** When history+tools approach the window, summarize/condense older turns and recover from overflow errors mid-run.

**Observed In:**
- EXTERNAL: openhands (M06 Condenser), cline (M07), codex (M08), claude-code (CC-CTX), cursor (CUR-CTX), aider (history summary), swe-agent (history processors)
- Related: anthropic-agent-skills AAS-09 compaction hygiene (skill instructions stripped)

**Mechanism:** Automatic or API compaction; history processors; overflow retry/recovery paths.

**Problem Solved:** Long tool-heavy sessions exhaust context; need continuity of critical constraints.

**Independent Implementations:** OpenHands condenser; Cline overflow recovery; Codex auto+/compact API; Aider ChatSummary; SWE-agent HistoryProcessor pipeline.

**Benefits:** Longer tasks; lower cost than full replay; session continuity.

**Costs:** Lossy summaries; silent deletion of skill/policy text; cache breaks; provider-specific APIs.

**Failure Modes:** Compaction drops standing rules; mid-conversation cache-break (Codex AP02); summarizing away evidence.

**Counterexamples:** Stateless ZDR / short tasks; systems that just fail on overflow.

**Evidence:** DOCUMENTED widely; our exact Cursor compaction behavior UNKNOWN. Confidence HIGH (pattern), MEDIUM (our gap detail).

**Our Architecture:** PARTIAL telemetry/persistence; compaction strategy UNKNOWN → PROTOTYPE.

**Applicability:** PROTOTYPE skill-hygiene + summarize-only fallbacks; DEFER provider-tied compact APIs as core.

**Confidence:** HIGH
