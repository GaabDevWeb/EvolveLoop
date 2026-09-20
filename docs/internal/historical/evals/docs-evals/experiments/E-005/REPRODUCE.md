# Reproduce E-005 Duplicate-Mutate Fixture

**Baseline:** `baseline-v1-2026-09-18` (do not modify)  
**Harness source:** `harness/e005-duplicate-mutate.test.ts`

## Setup

```bash
export ORCH=/home/gaab/Downloads/CursorSKILLS/orchestrator
export EXP=/home/gaab/Downloads/CursorSKILLS/docs/evals/experiments/E-005
export RAW="$EXP/raw/dup-mutate"
mkdir -p "$RAW"
cp "$EXP/harness/e005-duplicate-mutate.test.ts" "$ORCH/tests/evals/_e005_dup_mutate.test.ts"
```

## Control + Treatment (single vitest file)

```bash
cd "$ORCH"
E005_RAW_DIR="$RAW" npx vitest run tests/evals/_e005_dup_mutate.test.ts
```

Expected: 4 tests passed; `$RAW/summary-metrics.json` with `duplicate_mutate_any: false`.

## Collection

Artifacts written under `$RAW`:

- `execution-matrix.json` (15 runs)
- `control-rep-*.json`, `treatment-*-rep-*.json`
- `summary-metrics.json`
- `vitest-stdout.log`

## Cleanup

```bash
rm -f "$ORCH/tests/evals/_e005_dup_mutate.test.ts"
```

## Validation (baseline invariants)

```bash
cd "$ORCH"
npm test                                          # expect 103/103
npx vitest run tests/contracts/contract-prototype.test.ts   # 7/7
npx vitest run tests/integration/full-cycle.test.ts         # 5/5
cd /home/gaab/Downloads/CursorSKILLS/docs/evals/baseline && sha256sum -c BASELINE-CHECKSUMS.sha256
```
