# ADR-DR-0002 — Defer production skill catalog budget; keep runtime unchanged

## Status

ACCEPTED

## Date

2026-09-19

## Context

Research suggested ADAPT + PROTOTYPE for progressive disclosure / skill catalog budgets. E-001 executed an **offline** CONTROL/TREATMENT battery without adding `max_skills` to the engine.

Token reconciliation (decision-review): CONTROL 1673; T_SKILLS_5 382 (−77%); T_SKILLS_10 789 (−53%); T_TOKENS_40 1010 (**≈−40%**). The “~40%” claim applies **only** to T_TOKENS_40 vs CONTROL.

ADR Gate: VALID_WITH_LIMITATIONS → add reversibility; mark optional docs ADAPT out of scope of this ADR.

## Problem

Whether offline E-001 associations justify a production runtime skill-budget feature (`max_skills`, governor, pruning, ranking).

## Decision

1. **DEFER** production runtime skill budget (`max_skills`, budget governor, pruning engine, ranking subsystem).  
2. **KEEP** current orchestrator semantics (no catalog budget field).  
3. **Out of scope of this ADR:** optional non-binding skill-authoring documentation (requires a separate docs ADR if pursued).  
4. Any engine budget **PROTOTYPE** requires live experiment evidence first (`E-001-LIVE` / hardened PT-001), then a future Prototype Gate — not this ADR.

## Evidence

| Claim | Classification | Source |
|-------|----------------|--------|
| Smaller catalogs → higher offline activation_precision | DIRECTLY_OBSERVED (offline ranker) | E-001 |
| Treatments → lower token_estimate | PROXY (whitespace) | E-001 |
| T_TOKENS_40 ≈ −39.6% vs CONTROL | PROXY | E-001 + token reconciliation |
| Live task_success | NOT_MEASURED | E-001 |
| Live host catalog injection | NOT_MEASURED | E-001 |
| Vendor tokenizer | NOT_MEASURED | E-001 |

## Evidence Scope

| Dimension | Value |
|-----------|--------|
| System | CursorSKILLS `.cursor/skills` catalog + offline harness |
| Runtime | **Not** live Cursor/MegaBrain injection; harness only |
| Workload | 176 eval/trigger prompts |
| Experiment | E-001 offline battery |
| Sample | 4 conditions × 5 reps (deterministic scorer) |
| Environment | Offline Python harness |
| Metric | activation_precision/recall (DIRECT offline); token_estimate (PROXY) |

## What This Decision Establishes

- Offline associations are real under harness conditions and are **decision input only**.  
- Production runtime must **not** gain `max_skills` / budget APIs from E-001 alone.  
- Progressive-disclosure research remains PROTOTYPE/DEFER at the production layer.

## What This Decision Does NOT Establish

- Live agent quality improvement  
- Production token/cost reduction (vendor tokenizer unavailable)  
- That “SUPPORTED” means “implement now”  
- That skill packages should be deleted or artificially padded  
- Adoption of any catalog ranking/pruning engine  

## Alternatives Considered

| Alternative | Why not chosen |
|-------------|----------------|
| Implement max_skills now | task_success + live injection NOT_MEASURED |
| REJECT progressive disclosure forever | Offline signal exists; live still unknown |
| Mandate docs-only ADAPT in this ADR | Underspecified; separate ADR required |

## Consequences

- PT-001 / E-001-LIVE may proceed as **measurement** prototypes, not feature delivery.  
- Engine remains without catalog budget field.

## Risks

- Premature optimization of catalog injection  
- Treating PROXY whitespace tokens as billing/context truth  

## Reversibility

```yaml
reversibility:
  reversible: N/A
  rollback_concept: N/A — KEEP/DEFER; no production change applied
  compatibility_risk: none from this ADR
  state_migration: none
  data_migration: none
  note: Future IMPLEMENT budget ADR would require REQUIRES_IMPLEMENTATION_PLAN
```

## Validation Requirements

- Preserve DIRECT / PROXY / NOT_MEASURED classifications  
- Live experiment before any engine budget ADR beyond DEFER  
- Token axes must not be conflated (size vs truncation)  

## Implementation Status

```text
IMPLEMENTATION_STATUS: NOT_IMPLEMENTED
```

## Open Questions

- Live host effect size?  
- Interaction of host skill discovery vs MegaBrain packages?  

## Related Experiments

E-001 (offline COMPLETE); future E-001-LIVE; PT-001

## Related Research

Progressive disclosure / skill budgets ADAPT+PROTOTYPE; DO-NOT-CHANGE Skills as SKILL.md packages

## Related Principles

Evals measure; Runtime orchestrates; Skills packages ≠ Capability IR

## Related Anti-Patterns

AP-004 context/tool explosion — offline awareness only; not proof of production fix
