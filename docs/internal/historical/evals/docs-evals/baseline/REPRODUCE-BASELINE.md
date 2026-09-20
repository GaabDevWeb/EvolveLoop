# Reproduce Baseline V1

**Baseline ID:** `baseline-v1-2026-09-18`  
**Tree:** `/home/gaab/Downloads/CursorSKILLS/orchestrator`  
**Immutable reference:** this directory `docs/evals/baseline/`

## Prerequisites

- Node.js compatible with measured env (baseline recorded **v24.15.0**)
- Dependencies already installed (`node_modules` present).  
  If missing, non-destructive: `npm ci` in `orchestrator/` (may refresh lock install; prefer matching existing lockfile).
- Do **not** modify source, tests, or tsconfig to “fix” results.

## Commands (official, as measured)

```bash
cd /home/gaab/Downloads/CursorSKILLS/orchestrator

# Full suite → expect 103/103
npm test

# Full-cycle → expect 5/5
npx vitest run tests/integration/full-cycle.test.ts

# Contracts → expect 7/7
npx vitest run tests/contracts/contract-prototype.test.ts

# Jobs resume + pickup → expect 5/5
npx vitest run tests/integration/job-resume.test.ts tests/unit/job-pickup.test.ts

# Build/typecheck → expect FAIL (pre-existing)
npm run build
```

## Expected outcomes (V1)

| Check | Expected |
|-------|----------|
| Tests | 103 passed / 0 failed |
| Full-cycle | 5 passed |
| Contracts | 7 passed |
| Jobs suites | 5 passed |
| Build | `tsc` errors (PolicyEngine duplicate, EventEnvelope readonly, EvidenceFinding severity, unused symbols, featureId readonly) |
| Runtime load | Succeeds under Vitest (jobs modules resolve) |

## Verify source identity

```bash
cd /home/gaab/Downloads/CursorSKILLS/orchestrator
# Compare critical fingerprints to docs/evals/baseline/CRITICAL-FINGERPRINTS.sha256
sha256sum src/engine/execution-engine.ts src/jobs/*.ts src/cli/run-jobs.ts package.json

# Recompute tree aggregate (must match SOURCE-REVISION.txt)
find src tests policies contracts schemas package.json package-lock.json vitest.config.ts tsconfig.json -type f \
  | sort | xargs sha256sum | sha256sum
# expect: 5600f9df2c99dde25771567faeaaa25d39c55575c046e36b55fb965149813795
```

## Integrity of baseline docs

```bash
cd /home/gaab/Downloads/CursorSKILLS/docs/evals/baseline
sha256sum -c BASELINE-CHECKSUMS.sha256
```

## What this does **not** include

- Live `run-engine` against production Cursor skills (optional; not part of V1 measured path)
- Experiments E-001…E-005
- Fixing `tsc`
- Installing new dependencies as part of “passing” baseline
