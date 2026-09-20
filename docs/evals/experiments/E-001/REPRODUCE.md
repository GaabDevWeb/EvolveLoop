# Reproduce E-001 Experiment (Controlled Offline Battery)

## Environment

Recorded at run time in `raw/battery/environment.json` (OS, Python, Node, npm, seed). No secrets.

## Setup

```bash
cd /home/gaab/Downloads/CursorSKILLS
# baseline must remain immutable
# harness already present under docs/evals/experiments/E-001/harness/
```

## Pre-flight integrity

```bash
cd docs/evals/experiments/E-001/harness
python3 integrity_test.py
# expect: ALL_INTEGRITY_OK
```

## Condition selection

Use `docs/evals/experiments/E-001/conditions.yaml` (or `conditions.json`).  
Do not invent sizes/seeds. Seed: `e001-v1-2026-09-18`.

## Control + treatment execution

Battery uses existing `catalog_harness.evaluate_condition` (5 reps × 4 conditions):

```bash
cd docs/evals/experiments/E-001/harness
# Re-run the battery script that writes raw/battery/ (see agent transcript / battery-summary.json)
# Or re-evaluate each condition via:
python3 -c "
from catalog_harness import *
skills=load_catalog(); by={s['skill_id']:s for s in skills}; tasks=load_tasks()
for c in build_default_conditions(skills):
  r=evaluate_condition(c['id'], c['skill_ids'], by, tasks, c['max_description_tokens'], DEFAULT_SEED, c['id'].startswith('T_SKILLS_'))
  print(c['id'], r.activation_precision, r.prefix_tokens)
"
```

Full battery artifacts: `raw/battery/{CONTROL,T_SKILLS_5,T_SKILLS_10,T_TOKENS_40}/run-*.json`.

## Result collection

```text
raw/battery/battery-summary.json   # aggregates + comparisons
raw/battery/all-runs.json
E-001-RESULT.md
E-001-RESULTS.yaml
```

## Aggregation

Per-condition means/medians in `*/aggregate.json` and `E-001-RESULTS.yaml`.  
Note: offline metrics are deterministic across reps.

## Cleanup

No disposable workspaces left. Preserve `raw/battery/**`. Do not modify `.cursor/skills` or `orchestrator/src`.

## Baseline regression

```bash
cd /home/gaab/Downloads/CursorSKILLS/orchestrator
npm test
npx vitest run tests/contracts/contract-prototype.test.ts
npx vitest run tests/integration/full-cycle.test.ts
cd ../docs/evals/baseline && sha256sum -c BASELINE-CHECKSUMS.sha256
```
