# ADR-DR-0004 — Define stuck semantics before StuckDetector

## Status

ACCEPTED

## Date

2026-09-19

## Context

E-003 remains BLOCKED. Operational stop today is primarily `maxIterations` (and related bounds). Research hypothesized tool-signature thrash detection; no semantic StuckDetector exists.

ADR Gate: VALID_WITH_LIMITATIONS → expand stuck semantics checklist.

## Problem

Whether a StuckDetector may be implemented before an operational definition of “stuck” and false-stuck acceptance criteria exist.

## Decision

**DEFER** StuckDetector implementation until an operational definition answers the questions below.

**DEFINE STUCK SEMANTICS FIRST**, including false_stuck acceptance criteria.

## Evidence

| Claim | Classification | Source |
|-------|----------------|--------|
| No stuck experiment executed | NOT_MEASURED | Triage E-003 |
| Semantic stuck NOT_IMPLEMENTED | DOCUMENTED_ONLY / audit | Audit + baseline |
| maxIterations bound exists | DIRECTLY_OBSERVED | Baseline / code |

## Evidence Scope

| Dimension | Value |
|-----------|--------|
| System | CursorSKILLS orchestrator |
| Runtime | Bound-only stop (`maxIterations`) |
| Workload | N/A |
| Experiment | E-003 BLOCKED |
| Sample | N/A |
| Environment | N/A |
| Metric | N/A |

## What This Decision Establishes

- No StuckDetector feature from this ADR.  
- Semantics must precede heuristics and implementation.

## What This Decision Does NOT Establish

- That maxIterations is adequate forever  
- That any specific thrash heuristic is correct  
- Answers to the semantic questions below (they remain open)

## Alternatives Considered

| Alternative | Why not chosen |
|-------------|----------------|
| Implement tool-signature window now | Semantics undefined; premature |
| Equate maxIterations with stuck detection | Category error |

## Consequences

- Future E-003 / E-003-STUCK-DEF requires labeled fixtures after definition  

## Risks

- Premature heuristics that halt healthy exploration  

## Reversibility

```yaml
reversibility:
  reversible: N/A
  rollback_concept: N/A — DEFER; no detector added
  compatibility_risk: none
  state_migration: none
  data_migration: none
  note: Future detector ADR requires REQUIRES_IMPLEMENTATION_PLAN
```

## Validation Requirements

- Explicit false_stuck_rate / thrash metrics before any implementation ADR  
- Prefer existing Evidence/Telemetry signals before new SSOT  

## Implementation Status

```text
IMPLEMENTATION_STATUS: NOT_IMPLEMENTED
```

## Open Questions — Stuck Semantics Checklist (pending)

1. What is **progress**?  
2. What is **no-progress**?  
3. What counts as **repetition**?  
4. What counts as **semantic repetition**?  
5. What counts as **goal non-advancement**?  
6. What are **false positives**?  
7. What are **false negatives**?  
8. What **actions** should happen after detection (stop / escalate / replan)?  
9. What is the **recovery boundary** after a stuck declaration?  
10. How do these relate to: iteration limit, timeout, retry exhaustion, tool loops, state non-progress?

## Related Experiments

E-003 (BLOCKED); future E-003-STUCK-DEF

## Related Research

Stuck detector PROTOTYPE

## Related Principles

Runtime orchestrates; Evidence proves; Telemetry observes — detector must not invent a parallel truth store without justification

## Related Anti-Patterns

Avoid soft “stuck” labels without measurable criteria (related to AP-002 spirit)
