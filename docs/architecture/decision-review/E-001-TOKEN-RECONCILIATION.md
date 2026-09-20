# E-001 Token Metric Reconciliation

**Date:** 2026-09-19  
**Purpose:** Resolve apparent inconsistency before any E-001 architectural decision.  
**Rule:** Raw battery evidence is immutable; this document clarifies interpretation only.

## Question

Do these figures contradict each other?

```text
CONTROL = 1673
T_SKILLS_5 = 382
T_SKILLS_10 = 789
"T_TOKENS_40 cut ~40% of tokens"
```

## Raw facts (DIRECT from battery)

| Condition | Axis varied | token_estimate (PROXY, whitespace) | Δ vs CONTROL | Relative vs CONTROL |
|-----------|-------------|-----------------------------------:|-------------:|--------------------:|
| CONTROL | full catalog | **1673** | 0 | 0% |
| T_SKILLS_5 | catalog_size=5 | **382** | −1291 | **−77.17%** |
| T_SKILLS_10 | catalog_size=10 | **789** | −884 | **−52.84%** |
| T_TOKENS_40 | max_description_tokens=40 | **1010** | −663 | **−39.63% ≈ ~40%** |

Sources: `raw/battery/battery-summary.json`, `E-001-RESULTS.yaml` comparisons.token_estimate.

## Resolution

1. **Comparable numbers:** All four are the same metric (`token_estimate` / whitespace prefix tokens) under the same task corpus and seed.  
2. **Condition mapping:** 1673=CONTROL; 382=T_SKILLS_5; 789=T_SKILLS_10; 1010=T_TOKENS_40.  
3. **Baseline for “~40%”:** Always **CONTROL (1673)**.  
4. **Is ~40% correct?** **YES** for `T_TOKENS_40` only: `(1673−1010)/1673 = 0.3963`.  
5. **Report error?** **No numeric error in raw/YAML.** Ambiguity risk exists if prose juxtaposes size-budget absolute values (382/789) with the “~40%” phrase without naming `T_TOKENS_40`.  
6. **Multiple metrics?** Two **treatment axes**, one **metric**:  
   - size budget → large relative cuts (−77% / −53%)  
   - description truncation → ~40% cut  
7. **Interpretation correction:** “~40%” must never be read as applying to T5/T10.

## Correct one-liner

```text
Size budgets cut token_estimate by ~77% (n=5) and ~53% (n=10).
Description truncation (T_TOKENS_40) cut token_estimate by ~40% vs CONTROL.
```

## Decision impact

E-001 token claims may proceed with this clarification. No raw rewrite. No ADR that treats PROXY whitespace counts as live vendor tokens.
