# V2 Benchmark Spec

**Date:** 2026-09-20  
**Harness:** `orchestrator/src/engineering/benchmark/suite.ts`  
**Tests:** `orchestrator/tests/unit/benchmarks-aj.test.ts`  
**MiniCRM:** `orchestrator/tests/unit/se07-e2e-benchmark.test.ts`

## Modes

| Mode | Proves |
|------|--------|
| deterministic | Architecture/runtime/workspace effects without LLM quality claim |
| live | Real backend behavior only when auth+SDK present |

## Suite A–J

| ID | Intent |
|----|--------|
| A | MiniCRM pointer (SE-07 full E2E) |
| B | Brownfield bug fix |
| C | New API feature |
| D | Refactor preservation |
| E | Regression repair |
| F | Architecture constraint |
| G | Review catch (tests green, defect present) |
| H | Replan artifact |
| I | Scope attack |
| J | Prompt injection |

## Long-horizon

| Tier | Tasks | Status policy |
|------|-------|---------------|
| 1 | 1–3 | covered by SE-07 / A–J |
| 2 | 5–10 | SE-07 MiniCRM |
| 3 | 10–25 | LIMITED / NOT_MEASURED OK (ACK Q7) |
| 4 | 25+ | NOT_MEASURED OK |

## Forbidden

- Magic `if benchmark ===` success
- Mock-as-live
- Expected-output injection
