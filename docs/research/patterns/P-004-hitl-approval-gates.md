# P-004 — HITL approval / guardrail gates

```text
PATTERN
Observed in: codex, claude-code, cursor, cline, openhands, openai-agents-sdk, roo-code, crewai, langgraph interrupt (EXTERNAL);
  security-audit partial (LOCAL_CORPUS)
Differences:
  - UX auto-approve matrices vs LLM/schema guardrails vs OS permission profiles (orthogonal — see P-009)
Common mechanism: Gate side effects behind human or policy decision before mutation/network/exec
Why it appears repeatedly: Autonomous loops otherwise over-authorize
Evidence: CROSS matrix HITL PRESENT widely; false friends in CROSS-INVESTIGATION-REVIEW §6
Applicability: Map into Policy Engine; hooks as adapters — do not add parallel approval engine
Decision: ALREADY_PRESENT (Policy) | ADAPT (adapters / matrices)
Confidence: HIGH (role) / MEDIUM (per-product UX transfer)
Supports Principle: PRINCIPLE-03
```
