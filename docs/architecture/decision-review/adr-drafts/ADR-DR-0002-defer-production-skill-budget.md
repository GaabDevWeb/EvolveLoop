# ADR-DR-0002 — Defer production skill catalog budget; keep runtime unchanged

## Status

DRAFT

## Context

Research suggested ADAPT + PROTOTYPE for progressive disclosure / skill catalog budgets. E-001 executed an **offline** CONTROL/TREATMENT battery without adding `max_skills` to the engine.

Token figures reconciled: CONTROL 1673; T_SKILLS_5 382 (−77%); T_SKILLS_10 789 (−53%); T_TOKENS_40 1010 (**≈−40%**). The “~40%” claim applies **only** to T_TOKENS_40 vs CONTROL (see `E-001-TOKEN-RECONCILIATION.md`).

## Observed Evidence

| Claim | Class |
|-------|-------|
| Smaller catalogs → higher offline activation_precision | DIRECTLY_OBSERVED (offline ranker) |
| Treatments → lower token_estimate | PROXY (whitespace) |
| Live task_success | NOT_MEASURED |
| Live host catalog injection | NOT_MEASURED |
| Vendor tokenizer | NOT_MEASURED |

## Decision

1. **DEFER** production runtime skill budget (`max_skills`, budget governor, pruning engine, ranking subsystem).  
2. **KEEP** current orchestrator semantics (no catalog budget field).  
3. Optional later **ADAPT**: non-binding skill-authoring documentation only — not required by this ADR.  
4. Any budget **PROTOTYPE** in engine requires live experiment evidence first (`E-001-LIVE`).

## Scope

Decision about **whether to change Agent System architecture now**. Offline harness remains valid measurement tooling, not a product feature.

## What This Decision Does Not Claim

- That offline precision gains equal agent quality gains  
- That whitespace token cuts equal production cost savings  
- That “SUPPORTED” means “implement now”  
- That skill packages should be deleted or artificially padded  

## Consequences

- No `max_skills` in engine from this review  
- E-001 remains decision input, not an implementation mandate  
- Progressive-disclosure research stays PROTOTYPE/DEFER at production layer  

## Risks

- Premature optimization of catalog injection  
- Treating PROXY tokens as billing/context truth  

## Open Questions

- Live host effect size?  
- Interaction with Cursor skill discovery vs MegaBrain packages?  

## Validation Requirements

- Live experiment before any engine budget ADR moves beyond DRAFT/DEFER  
- Preserve DIRECT/PROXY/NOT_MEASURED classifications  

## Related Experiments

E-001 (offline COMPLETE); future E-001-LIVE

## Related Research

Progressive disclosure / skill budgets ADAPT+PROTOTYPE; DO-NOT-CHANGE Skills as SKILL.md packages

## Implementation status

NOT IMPLEMENTED

## Implementation required

NO (DEFER / KEEP)
