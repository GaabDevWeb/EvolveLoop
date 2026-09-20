# GAP-002 — Context compaction + skill/policy hygiene

```text
EXTERNAL_MECHANISM   Condenser / auto-compact / history processors + skill compaction protection
PROBLEM_SOLVED       Long runs fit context without silently deleting standing instructions
OUR_CURRENT_MECHANISM Host compaction (Cursor) + skills; exact behavior UNKNOWN; no dedicated hygiene contract in orchestrator
EQUIVALENCE          PARTIAL
GAP                  Need audit of what survives compaction; protect Evidence/Policy/active skill text
TRADE_OFF            Aggressive summary vs fidelity of constraints
EVIDENCE             openhands M06, cline M07, codex M08, claude CC-CTX, anthropic AAS-09; CROSS matrix PARTIAL/UNKNOWN
APPLICABILITY        All long MegaBrain jobs
DECISION             PROTOTYPE
```

**Provenance:** EXTERNAL (+ anthropic skill hygiene).
**Confidence:** HIGH gap; LOW on current Cursor internals (UNKNOWN).
