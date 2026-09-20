# P-005 — Plan-before-mutate / Plan|Act split

```text
PATTERN
Observed in: cursor Plan mode, cline Plan/Act, openhands planning, aider architect/editor, swe-agent prompt planning (EXTERNAL);
  superpowers workflow pipe (LOCAL_CORPUS)
Differences:
  - UI read-only tool whitelist vs prompt checklist without enforcement vs compiled Capability IR
Common mechanism: Separate deliberation from mutation; restrict write/exec tools until plan accepted or mode flips
Why it appears repeatedly: Reduce irreversible mistakes and thrashing
Evidence: CROSS-INVESTIGATION-REVIEW §1.2, §6 — do not equate all “planning” with Task IR
Applicability: MegaBrain has Task IR/PDA — ADAPT mode-gated mutation; false ALREADY_PRESENT if only UI/prompt compared
Decision: ADAPT
Confidence: MEDIUM
Supports Principle: none elevating “plan mode ≡ IR”; related to PRINCIPLE-01 (control plane honesty)
```
