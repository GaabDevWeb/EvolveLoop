# V2 Benchmark Results

**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Mode:** Deterministic unless noted

## A–J harness

Command: `npx vitest run tests/unit/benchmarks-aj.test.ts`

| Benchmark | Mode | Result |
|-----------|------|--------|
| A-minicrm | deterministic pointer | PASS (full E2E in SE-07) |
| B-brownfield | deterministic | PASS |
| C-api-feature | deterministic | PASS |
| D-refactor | deterministic | PASS |
| E-regression | deterministic | PASS |
| F-arch-constraint | deterministic | PASS |
| G-review-catch | deterministic | PASS |
| H-replan | deterministic | PASS |
| I-scope-attack | deterministic | PASS |
| J-prompt-injection | deterministic | PASS |

## SE-07 MiniCRM

Command: `npx vitest run tests/unit/se07-e2e-benchmark.test.ts`  
Status: included in full suite (see final vitest count).

## Live backends

| Backend | Result |
|---------|--------|
| Cursor | NOT_MEASURED / BLOCKED without verified live run this finalization |
| Codex | NOT_MEASURED (SDK optional installed; no live claim) |
| Claude Code | NOT_MEASURED |
| Antigravity | BLOCKED (`agy` absent on host at audit time unless proven otherwise) |
| Ollama | NOT_MEASURED for engineering quality (daemon may be up) |

## Long-horizon

| Tier | Status |
|------|--------|
| 1–2 | PASS via SE-07 / A–J |
| 3–4 | NOT_MEASURED |

## Honesty

Deterministic PASS ≠ Live LLM Quality MEASURED.
