# E-001 Enablement Report

## Objective

Move E-001 from `READY_AFTER_HARNESS` to **READY** for the Experiment Runner via a minimal offline catalog-budget harness — without `max_skills` in the engine.

## Original Hypothesis

Constrained catalog prefix (`max_skills` / `max_description_tokens`) improves activation precision/recall and lowers prefix tokens at similar task success.  
Source: `docs/research/experiments/E-001-skill-catalog-budget.md`.

## Current Runtime Support

| Capability | Status |
|------------|--------|
| Skills on disk | YES (23) |
| Skill discovery (orchestrator manifests) | YES (unrelated to catalog prefix budget) |
| `max_skills` API | NO (not required) |
| Host catalog injection control | NO (live ENV gap) |
| Skill eval prompts | YES (`evals.json`, `trigger-eval-set.json`) |

## Harness Design

Python offline harness: `harness/catalog_harness.py`

```text
load Skills (read-only)
 → seeded deterministic subset / truncation
 → materialize prefix string
 → estimate prefix_tokens
 → score offline activation on eval tasks
 → write structured JSON under raw/enablement/
```

## Control

`CONTROL` — all 23 skills, full descriptions.

## Treatments

`T_SKILLS_5`, `T_SKILLS_10`, `T_TOKENS_40` (see `conditions.yaml`).

## Metrics

| Metric | Ready? | Notes |
|--------|--------|-------|
| prefix_tokens | YES | whitespace estimate |
| activation_precision | YES (offline) | overlap ranker |
| activation_recall | YES (offline) | same |
| task_success | PROXY only | activation==gold; live success NOT measured |

## Catalog Selection

Deterministic seeded order; fingerprints recorded; integrity tests prove stability.

## Isolation

`integrity_test.py` proves `.cursor/skills/**/SKILL.md` hashes unchanged after dry-run.

## Reproducibility

Documented in `REPRODUCE.md`. Catalog composition reproducible; offline scores deterministic for fixed scorer.

## Baseline Validation

After enablement:

- tests **103/103**  
- contracts **7/7**  
- full-cycle **5/5**  
- baseline checksums OK  

## Remaining Gaps

1. Live Cursor/MegaBrain catalog injection (ENVIRONMENT)  
2. Live LLM `task_success`  
3. Vendor tokenizer parity  
4. Full experiment battery not run in this enablement step (by design)

## Final Readiness

**READY** for offline Experiment Runner execution of E-001 catalog-budget comparisons.

## Limitations

Offline activation is a proxy. Do not treat dry-run precision numbers as final experimental conclusions until the Experiment Runner executes and reports formally.
