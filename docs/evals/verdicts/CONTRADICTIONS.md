# Contradictions (Verdict Phase)

Search domains: experiment vs eval; eval vs tests; hypothesis vs observed behavior; claim vs claim boundaries.

## Result

```text
NONE_FOUND
```

for new contradictions in this synthesis phase.

---

## Checked pairs

| Pair | Finding |
|------|---------|
| E-001 metrics vs EV-007/EV-008 oracles | Aligned (offline precision; PROXY tokens; T40 ≈ −40%) |
| E-005 metrics vs EV-006 oracles | Aligned (resume_success; duplicate_mutate=false; OS kill NOT_MEASURED) |
| Eval battery vs regression invariants | Aligned (103/103, 7/7, 5/5) |
| H-001 “SUPPORTED offline” vs verdict WEAKENED | **Not a contradiction** — different scopes (scoped experiment result vs compound research hypothesis with NOT_MEASURED task_success) |
| H-005 “SUPPORTED job-path” vs verdict WEAKENED | **Not a contradiction** — scoped fixture result vs original process-restart wording |
| E-005 checkpoint vs H-004 compaction | No false equivalence asserted |

---

## Prior resolved issue (not reopened)

**CX-001** (token “~40%” language): resolved in results layer / `E-001-TOKEN-RECONCILIATION.md`. Verdict phase preserves that resolution; does not re-litigate numbers.

---

## Scope-language tension (documented, not contradiction)

Experimental reports correctly say **SUPPORTED (scoped)**.  
Verdicts for **original research hypotheses** say **WEAKENED** when major success criteria remain unmeasured.

Both statements can be true simultaneously if scopes are stated.
