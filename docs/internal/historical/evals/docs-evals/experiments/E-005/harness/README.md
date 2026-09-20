# E-005 harness directory

| File | Role |
|------|------|
| `e005-duplicate-mutate.test.ts` | Canonical vitest harness (CONTROL + treatments) |
| `e005-metrics.test.ts` | Earlier resume/secrets harness (prior run) |
| `README.md` | This file |

**Run pattern:** copy `e005-duplicate-mutate.test.ts` → `orchestrator/tests/evals/_e005_dup_mutate.test.ts`, set `E005_RAW_DIR`, run vitest, **delete** temp file (preserves 103-test baseline suite).

Never commit the temp `_e005_*.test.ts` into the package suite.
