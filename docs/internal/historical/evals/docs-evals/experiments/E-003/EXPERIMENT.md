# E-003 — Stuck detector heuristic

## Hypothesis

Repeated tool-signature window + zero file/test delta detects thrash and halts earlier than max-turns alone, with acceptable false_stuck_rate.

## Research Origin

`docs/research/experiments/E-003-stuck-detector-heuristic.md`

## Baseline

Semantic stuck detection = **NOT_IMPLEMENTED**. Only `maxIterations=500` operational stop exists.

## Classification

**BLOCKED**

Limited observation of `maxIterations` is an **operational stop**, not semantic stuck detection. Reclassifying it as the detector would violate experiment rules.

## Observational note

`raw/stuck-search.txt` shows `maxIterations` only; no StuckDetector/thrash heuristic.

## Result Classification

**BLOCKED**
