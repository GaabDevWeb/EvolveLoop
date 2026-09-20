# E-004 — Post-compaction constraint re-inject

## Hypothesis

On compact/clear events, re-injecting Policy + active skill pin raises constraint survival and compliance after compaction.

## Research Origin

`docs/research/experiments/E-004-compaction-reinject.md`

## Baseline / Readiness

Compaction pipeline **absent**. Audit: NOT_APPLICABLE until host compaction exists. After sync: **BLOCKED**.

## Classification

**BLOCKED** (also NOT_APPLICABLE until a compact hook exists)

A hit on the word “compact” in `execution-trace.ts` summary helper is **not** a context-compaction pipeline (`raw/compaction-search.txt`).

## Result Classification

**BLOCKED**
