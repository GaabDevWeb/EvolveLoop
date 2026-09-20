# P-002 — Isolated subagent / typed handoff

```text
PATTERN
Observed in: cursor, claude-code, openhands, cline, codex, openai-agents-sdk, llamaindex, roo-code, crewai (EXTERNAL);
  superpowers SDD (LOCAL_CORPUS)
Differences:
  - Manager-retains (agents-as-tools) vs peer ownership transfer (transfer_to_*) vs summary-return (Boomerang)
  - Context isolation strength vs parent-context poisoning risk
Common mechanism: Fan-out or transfer work to a bounded actor with restricted tools/context; return result under a contract
Why it appears repeatedly: Parallelism + blast-radius control for coding agents
Evidence: CROSS §1 terminology; CROSS-INVESTIGATION-REVIEW §1.1, §2.6 (subtype collision)
Applicability: PDA Task roles ALREADY_PRESENT — ADAPT isolation + handoff ACL; do not import persona rosters
Decision: ALREADY_PRESENT + ADAPT residual
Confidence: MEDIUM (until subtypes normalized in ADRs)
Supports Principle: PRINCIPLE-08, PRINCIPLE-09
```
