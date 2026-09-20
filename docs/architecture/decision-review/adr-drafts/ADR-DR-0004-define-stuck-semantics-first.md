# ADR-DR-0004 — Define stuck semantics before StuckDetector

## Status

DRAFT

## Context

E-003 remains BLOCKED. Operational stop today is primarily `maxIterations` (and related bounds). Research hypothesized tool-signature thrash detection; no semantic StuckDetector exists.

## Observed Evidence

- No stuck experiment executed  
- Audit: semantic stuck NOT_IMPLEMENTED  

## Decision

**DEFER** StuckDetector implementation until an operational definition separates at least:

```text
iteration limit
timeout
retry exhaustion
tool repetition
state non-progress
semantic repetition
goal non-progress
```

**DEFINE SEMANTICS FIRST**, including false_stuck acceptance criteria.

## Scope

Definitional architecture gate — not detector code.

## What This Decision Does Not Claim

- That maxIterations is adequate forever  
- That any specific thrash heuristic is correct  

## Consequences

- No detector feature from this review  
- Future E-003 requires labeled fixtures after definition  

## Risks

- Premature heuristics that halt healthy exploration  

## Open Questions

- Which signals are observable in current Evidence/Telemetry without new SSOT?  

## Validation Requirements

- Explicit false_stuck_rate / thrash metrics before implementation ADR  

## Related Experiments

E-003 (BLOCKED); future E-003-STUCK-DEF

## Related Research

Stuck detector PROTOTYPE

## Implementation status

NOT IMPLEMENTED

## Implementation required

NO
