# P-001 — Progressive skill disclosure

```text
PATTERN
Observed in: anthropic-agent-skills, claude-code, cursor, codex, openhands, cline, crewai (EXTERNAL);
  superpowers, mattpocock-skills (LOCAL_CORPUS)
Differences:
  - Package format (SKILL.md + progressive load) vs harness mandatory invoke / SessionStart bootstrap
  - List/token budgets (numbers) vs qualitative disclosure tiers
Common mechanism: Load skill metadata first; expand body/refs on demand; avoid dumping all procedures into context
Why it appears repeatedly: Context cost + specialization without permanent prompt bloat
Evidence: CROSS-SYSTEM-ANALYSIS §2–§3; CROSS-INVESTIGATION-REVIEW §1.5 (package ALREADY_PRESENT vs harness ADAPT)
Applicability: MegaBrain Skills IMPLEMENTED as packages — ADAPT harness; PROTOTYPE budgets
Decision: ALREADY_PRESENT (package) | ADAPT (harness) | PROTOTYPE (budgets)
Confidence: HIGH (package) / MEDIUM (budgets)
Supports Principle: PRINCIPLE-07
```
