# Reproduce V22-BENCH

## Pre-flight

```bash
cd docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness
python3 integrity_test.py
# expect: ALL_INTEGRITY_OK
```

## Battery

```bash
cd docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness
python3 bench_harness.py
```

Writes `../raw/battery/{environment,task-set,all-runs,battery-summary}.json` and per-scenario run files.

## Tokenizer

Optional (recommended): `pip install --user tiktoken` — harness records `tiktoken:cl100k_base` in `environment.json`.

## Validator (pack V2.2)

```bash
bash docs/architecture/v2.2/scripts/validate-v22-artifacts.sh
```
