# E-001 Fixture

## Purpose

Offline CONTROL/TREATMENT materialization of skill catalog prefixes for E-001 without modifying runtime or source Skills.

## Source Catalog

`.cursor/skills/**/SKILL.md` (23 packages with SKILL.md). Read-only.

## Selection Strategy

`seeded_sha256_order_then_prefix`:

1. Order skill IDs by `sha256(seed:skill_id)`  
2. Take prefix of length `catalog_size`  
3. Seed: `e001-v1-2026-09-18`  

For activation scoring on `T_SKILLS_*`, per-task catalogs **always include the gold skill** plus deterministic distractors (research: 1 correct among N).

## Conditions

| ID | catalog_size | max_description_tokens |
|----|--------------|------------------------|
| CONTROL | 23 (all) | none |
| T_SKILLS_5 | 5 | none |
| T_SKILLS_10 | 10 | none |
| T_TOKENS_40 | 23 | 40 |

See `conditions.yaml` / `conditions.json` for skill_ids + fingerprints.

Note: corpus descriptions are ≤108 whitespace tokens; **40** (not 200) is used so the token-budget treatment differs from CONTROL.

## Control

Full catalog, full descriptions — unconstrained injection analogue.

## Treatments

Size budgets (5, 10) and description-token budget (40).

## Metrics

| Metric | Source |
|--------|--------|
| prefix_tokens | whitespace estimate of materialized prefix |
| activation_precision / recall | offline overlap ranker vs eval/trigger prompts |
| task_success | **proxy** = activation matches gold (not live agent) |

## Isolation

- No writes to `.cursor/skills/**`  
- No `orchestrator/src` changes  
- Outputs only under `docs/evals/experiments/E-001/raw/`  

## Reproducibility

Same seed + source catalog → same skill_ids + fingerprint (proven by `harness/integrity_test.py`).

## Limitations

- Offline activation ≠ host LLM selection  
- Live catalog injection not controlled  
- Token estimate ≠ vendor tokenizer  
- Some `evals.json` files may be skipped if invalid JSON  
