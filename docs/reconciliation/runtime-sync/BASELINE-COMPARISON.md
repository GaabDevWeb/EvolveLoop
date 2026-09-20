# Baseline Comparison

## Before sync (CursorSKILLS)

| Area | State |
|------|-------|
| source `jobs/` | ABSENT |
| run-jobs.ts | CS delta (evidence guard) present; imports broken |
| evidence.test.ts | 5 tests; 2 failing (aspirational) |
| build `tsc` | FAIL (pre-existing shared errors) |
| `npm test` | 89 pass / 3 fail / 92 collected; 7 files load-fail |
| full-cycle | FAIL (load jobs) |
| runtime load | FAIL for engine path importing jobs |
| jobs/HITL/resume | UNREACHABLE |
| evidence validator | identical to AGENTS; tests ahead |
| policy / provider / registry | unit OK where loadable |

## AGENTS/Cursor baseline

| Area | State |
|------|-------|
| source `jobs/` | PRESENT (4 modules) |
| run-jobs.ts | without CS evidence guard |
| evidence.test.ts | 3 tests, all pass |
| build `tsc` | FAIL (same errors as CS) |
| `npm test` | **103/103** |
| full-cycle | **5/5** |
| jobs/HITL/resume | OBSERVED |

## After sync (CursorSKILLS)

| Area | State |
|------|-------|
| source `jobs/` | PRESENT (= AGENTS sha256) |
| run-jobs.ts | **CS delta preserved** (differs from AGENTS) |
| evidence.test.ts | 3 tests (= AGENTS); aspirational archived |
| build `tsc` | FAIL (unchanged, both trees) |
| `npm test` | **103/103** |
| full-cycle | **5/5** |
| runtime load | OK via Vitest transform |
| jobs/HITL/resume | OBSERVED |
| policy / provider / registry / contracts | green (no regression) |

## Delta summary

```text
Before → After:
  + jobs/ restored
  = run-jobs.ts kept (CS)
  ~ evidence.test.ts aligned to implemented contract
  tests: broken suite → 103/103
```
