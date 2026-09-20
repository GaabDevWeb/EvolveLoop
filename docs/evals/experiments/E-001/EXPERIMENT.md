# E-001 — Skill catalog budget prototype

## Hypothesis

Configurable catalog prefix budgets (`max_skills` / `max_description_tokens`) improve activation precision/recall and lower prefix tokens at similar task success.

## Research Origin

`docs/research/experiments/E-001-skill-catalog-budget.md`

## Baseline

`baseline-v1-2026-09-18`

## Classification

**EXECUTED** — offline controlled battery complete (2026-09-19).

Result: **SUPPORTED** (scoped offline), confidence **MEDIUM**.  
Report: `E-001-RESULT.md` · Machine: `E-001-RESULTS.yaml` · Raw: `raw/battery/`

## Experimental Design

Offline harness varies catalog size / description truncation; scores activation against existing eval/trigger prompts; measures whitespace token_estimate (PROXY). Live host injection and live task_success remain NOT_MEASURED.

## Control / Treatment

Defined in `conditions.yaml`:

- CONTROL (23 skills) — P=0.3352, tok≈1673
- T_SKILLS_5 — P=0.5114, tok≈382
- T_SKILLS_10 — P=0.4205, tok≈789
- T_TOKENS_40 — P=0.3409, tok≈1010

## Metrics

| Metric | Status |
|--------|--------|
| prefix_tokens / token_estimate | PROXY (whitespace) |
| activation_precision/recall | DIRECT (offline) |
| task_success | NOT_MEASURED |

## Harness

`harness/catalog_harness.py` + `harness/integrity_test.py`

## Result Classification

**SUPPORTED** under offline conditions. Not an ADR. Not a live-host claim.
