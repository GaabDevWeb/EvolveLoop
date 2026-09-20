# P-006 — Checkpoint / durable pause-resume

```text
PATTERN
Observed in: langgraph checkpoint, openai-agents RunState, crewai persist, MAF checkpoints, openhands, claude-code session (EXTERNAL);
  cursor file checkpoint, cline shadow-git (different problem)
Differences:
  - Thread/graph durable state vs file-edit rollback vs git shadow vs job resume
Common mechanism: Persist enough state to pause (HITL/crash) and continue without full replay from zero
Why it appears repeatedly: Long agentic runs + human gates + crash recovery
Evidence: CROSS-INVESTIGATION-REVIEW §1.4, §6 false pattern table
Applicability: Baseline Persistence PARTIAL — PROTOTYPE interrupt/resume carefully; DEFER shadow-git-as-architecture; prefer single resume model
Decision: PROTOTYPE (thread/job) | DEFER (file/shadow conflation)
Confidence: MEDIUM
Supports Principle: PRINCIPLE-05 (do not call this Memory)
```
