# E-001 — Skill Catalog Budget

## Baseline

`baseline-v1-2026-09-18` (immutable). Post-run invariants: 103/103, 7/7, 5/5 (see `raw/battery/invariant-*.log`).

## Hypothesis

Constraining the skill catalog prefix (`max_skills` / `max_description_tokens`) improves **activation_precision** / **activation_recall** and lowers **prefix_tokens** at similar **task_success**, versus injecting all eligible skill descriptions.

Source: `HYPOTHESIS.md` (unchanged).

## Experimental Design

```text
OFFLINE CONTROLLED
EXISTING CATALOG → seeded subset/truncation harness → same task corpus → observe
```

- Independent variable: catalog composition / size / description truncation  
- Task corpus: 176 prompts from skill `evals.json` + `trigger-eval-set.json`  
- Scorer: deterministic token-overlap ranker (not a live LLM)  
- Seed: `e001-v1-2026-09-18`  
- Mode: offline — **not** live Cursor/MegaBrain injection  

## Conditions

| ID | Type | catalog_size | max_description_tokens | fingerprint (prefix) |
|----|------|--------------|------------------------|----------------------|
| CONTROL | CONTROL | 23 | none | `a91e10d3…` |
| T_SKILLS_5 | TREATMENT | 5 | none | `8e3c06fd…` |
| T_SKILLS_10 | TREATMENT | 10 | none | `d7d55ac8…` |
| T_TOKENS_40 | TREATMENT | 23 | 40 | `aa662c3c…` |

Skill IDs verified against `conditions.yaml`. Catalog fingerprints matched.

## Control

Full catalog (23 skills), full descriptions. Reference condition only.

## Treatments

`T_SKILLS_5`, `T_SKILLS_10`, `T_TOKENS_40` as defined in `conditions.yaml`.

## Sample

```text
INITIAL EXPERIMENTAL SAMPLE
repetitions_per_condition = 5
total runs = 20 (4 conditions × 5)
n_tasks = 176 (identical input fingerprint across all runs)
```

Offline scorer is deterministic: precision/recall/token_estimate identical across the 5 reps per condition. Repetitions confirm stability; they do **not** add statistical variance for those metrics.

## Metrics

| Metric | Classification | Notes |
|--------|----------------|-------|
| catalog_size / skills_available | DIRECT | from materialized catalog |
| skills_activated_* | DIRECT | offline top-1 predictions; AVAILABLE ≠ ACTIVATED |
| activation_precision | DIRECT | offline overlap ranker |
| activation_recall | DIRECT | offline overlap ranker |
| wall_clock_duration | DIRECT | OBSERVED LATENCY only |
| token_estimate | PROXY | whitespace split; vendor tokenizer unavailable |
| task_success | NOT_MEASURED | live agent success unavailable |
| skills_loaded / skills_invoked | NOT_MEASURED | no host load/invoke |
| live catalog injection | NOT_MEASURED | ENVIRONMENT gap |

## Raw Results

`docs/evals/experiments/E-001/raw/battery/`

```text
raw/battery/
├── CONTROL/run-01.json … run-05.json + aggregate.json + catalog-manifest.json
├── T_SKILLS_5/…
├── T_SKILLS_10/…
├── T_TOKENS_40/…
├── battery-summary.json
├── all-runs.json
├── environment.json
├── task-set.json
└── pre-/post-skill-hashes.json
```

## Aggregated Results

Means over n=5 (values constant for non-latency metrics):

| Condition | activation_precision | activation_recall | token_estimate (PROXY) | wall_clock mean (s) |
|-----------|---------------------:|------------------:|-----------------------:|--------------------:|
| CONTROL | 0.3352 | 0.3352 | 1673 | ~0.068 |
| T_SKILLS_5 | 0.5114 | 0.5114 | 382 | ~0.018 |
| T_SKILLS_10 | 0.4205 | 0.4205 | 789 | ~0.034 |
| T_TOKENS_40 | 0.3409 | 0.3409 | 1010 | ~0.058 |

## Control vs Treatment

| Metric | Treatment | Control | Treatment | Δ | Rel |
|--------|-----------|--------:|----------:|--:|----:|
| activation_precision | T_SKILLS_5 | 0.3352 | 0.5114 | +0.1761 | +52.5% |
| activation_precision | T_SKILLS_10 | 0.3352 | 0.4205 | +0.0852 | +25.4% |
| activation_precision | T_TOKENS_40 | 0.3352 | 0.3409 | +0.0057 | +1.7% |
| token_estimate (PROXY) | T_SKILLS_5 | 1673 | 382 | −1291 | −77.2% |
| token_estimate (PROXY) | T_SKILLS_10 | 1673 | 789 | −884 | −52.8% |
| token_estimate (PROXY) | T_TOKENS_40 | 1673 | 1010 | −663 | −39.6% |

Δ is association under this offline design — not a live-host causal claim.

## Catalog Size Effects

Under the tested offline conditions, **smaller catalog sizes were associated with higher offline activation precision/recall and lower token estimates**, with T_SKILLS_5 strongest on both axes among size budgets.

Path observed:

```text
catalog_size ↓  →  token_estimate ↓  →  activation_precision ↑  (offline ranker)
```

Do not extrapolate to developer productivity or general agent intelligence.

## Token/Context Proxy

`token_estimate` is **PROXY** (whitespace). Directional pattern is clear; absolute counts are not vendor-token accurate.

**Clarification (Architecture Decision Review, 2026-09-19):** “~40%” applies **only** to `T_TOKENS_40` (1010 vs CONTROL 1673 = −39.6%). `T_SKILLS_5` (−77%) and `T_SKILLS_10` (−53%) are separate size-budget comparisons. See `docs/architecture/decision-review/E-001-TOKEN-RECONCILIATION.md`. Raw battery files were not rewritten.

## Task Success Limitation

```text
task_success: NOT_MEASURED
```

Activation match rate must **not** be reported as live task success. The hypothesis clause “at similar task_success” remains untested.

## Observed Patterns

1. Size budgets (5, 10) improve offline activation precision vs CONTROL.  
2. Size budgets sharply reduce token_estimate.  
3. Description truncation (40 tokens) reduces token_estimate (~40%) with only marginal precision change (+1.7%).  
4. Scorer determinism → zero variance on precision/recall/tokens across reps.

## Contradictory Results

None within the offline measurement scope. No treatment increased token_estimate or decreased precision relative to CONTROL.

## Conclusion

Under the tested **offline** conditions, catalog budgets were associated with improved offline activation precision/recall and lower whitespace token estimates versus CONTROL — consistent with the measurable parts of the E-001 hypothesis. Live host effect and live task_success remain unmeasured.

## Result Classification

**SUPPORTED** (scoped to offline harness observables)

## Confidence

**MEDIUM**

- Strengths: controlled catalogs, deterministic selection, verified fingerprints, isolation, baseline green  
- Weaknesses: offline ranker ≠ host LLM; INITIAL SAMPLE; token PROXY; task_success NOT_MEASURED; live injection NOT_MEASURED  

## Limitations

- Offline activation ≠ Cursor/MegaBrain skill selection  
- Live `task_success` not measured  
- Vendor tokenizer unavailable  
- Per-task distractor catalogs for `T_SKILLS_*` always include gold (by design)  
- Small initial sample; deterministic metrics do not gain power from reps  

## Reproduction

See `REPRODUCE.md`.
