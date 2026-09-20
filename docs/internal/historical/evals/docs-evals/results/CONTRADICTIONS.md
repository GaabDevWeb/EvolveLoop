# Contradictions

## Issue CX-001 — Ambiguous “~40%” token language vs size-budget absolutes

### Sources

- Human-readable summaries that juxtaposed CONTROL=1673, T5=382, T10=789 with “~40%”
- Raw / machine results: `E-001-RESULTS.yaml`, `raw/battery/battery-summary.json`
- Clarification: `docs/architecture/decision-review/E-001-TOKEN-RECONCILIATION.md`
- Clarifying note later added to `E-001-RESULT.md` (Token/Context Proxy section)

### Observed Difference

Raw numbers are internally consistent. Ambiguity arises only if “~40%” is read as applying to T5/T10.

| Condition | token_estimate | vs CONTROL |
|-----------|---------------:|-----------:|
| CONTROL | 1673 | — |
| T_SKILLS_5 | 382 | −77.17% |
| T_SKILLS_10 | 789 | −52.84% |
| T_TOKENS_40 | 1010 | **−39.63% ≈ ~40%** |

### Resolution

```text
CORRECTED_IN_CONSOLIDATION
```

Canonical rule: “~40%” ↔ **T_TOKENS_40 only**.  
Do **not** modify original raw battery files.

### Impact

Affects interpretation language only; does not change metric values or SUPPORTED classification scope.

### Status

RESOLVED_IN_RESULTS_LAYER

---

## Other issues

```text
NONE_FOUND
```

No contradiction found between E-005 raw `summary-metrics.json`, `execution-matrix.json`, and `E-005-RESULT.md` on resume_success, duplicate_mutate, or OS-kill NOT_MEASURED.
