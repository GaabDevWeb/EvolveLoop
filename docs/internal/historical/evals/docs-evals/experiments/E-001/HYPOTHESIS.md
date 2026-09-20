# E-001 — Skill Catalog Budget

## Hypothesis

Constraining the skill **catalog prefix** available to the agent (via `max_skills` and/or `max_description_tokens` budgets) improves **activation_precision** / **activation_recall** and lowers **prefix_tokens** at similar **task_success**, versus injecting all eligible skill descriptions.

## Independent Variable

Catalog budget as applied to the offline-injected prefix:

1. **`catalog_size` / max_skills** — number of Skills whose descriptions appear in the prefix  
2. **`max_description_tokens`** — per-skill description truncation in the prefix  

(Original research: both knobs; harness exposes both as separate treatment axes.)

## Dependent Variables

| Metric | Meaning (offline) |
|--------|-------------------|
| `prefix_tokens` | Estimated tokens of the materialized catalog prefix |
| `activation_precision` | Among tasks, fraction of predicted top-1 skills that match gold |
| `activation_recall` | Among gold skills that appear in catalog, fraction correctly activated |
| `task_success` | **Offline proxy only:** activation matches gold (not live agent success) |

## Control

**CONTROL** — full `.cursor/skills` catalog with full skill descriptions (current / unconstrained injection analogue).

## Treatments

| ID | Catalog budget |
|----|----------------|
| T_SKILLS_5 | `max_skills=5` (deterministic subset; full descriptions) |
| T_SKILLS_10 | `max_skills=10` |
| T_TOKENS_40 | all skills; each description truncated to 40 tokens |

Per-task distractor catalogs (for activation scoring): when evaluating a task with gold skill G, size-N catalogs **always include G** plus N−1 deterministic distractors (research: “1 correct among N distractors”).

## Metrics

As in research: `activation_precision`, `activation_recall`, `prefix_tokens`, `task_success` (offline proxy).

## Experimental Scope

- **Offline** catalog materialization + offline activation scoring against existing skill `evals.json` / `trigger-eval-set.json` prompts  
- Source Skills under `.cursor/skills/**` read-only  
- No orchestrator/`max_skills` feature  

## Non-Goals

- Live Cursor/MegaBrain catalog injection  
- Live LLM task execution / true `task_success`  
- New runtime Skill registry or selection engine  
- Modifying production Skills  

## Limitations

- Offline activation uses deterministic text-overlap ranking — **not** host model behavior  
- Live host control remains an ENVIRONMENT gap for full in-product E-001  
- Token estimate is whitespace-based (not a vendor tokenizer)  
