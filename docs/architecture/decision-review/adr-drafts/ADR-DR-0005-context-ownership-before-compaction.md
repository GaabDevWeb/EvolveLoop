# ADR-DR-0005 — Resolve context ownership before compaction/reinject

## Status

DRAFT

## Context

E-004 remains BLOCKED. Baseline principle: Knowledge ≠ Memory ≠ Checkpoint. No engine compaction/reinject pipeline exists.

## Observed Evidence

- Compaction NOT_IMPLEMENTED  
- No ownership experiment  
- E-005 uses Checkpoint distinctly from Memory/Knowledge — boundary still useful  

## Decision

**DEFER** compaction/reinject implementation until ownership answers:

```text
state ownership
context ownership
compaction boundary
reconstruction
reinjection
validation
information loss
```

**ARCHITECTURE FIRST.** Do not collapse Memory, Knowledge, and Checkpoint into one “context store.”

## Scope

Ownership/architecture prerequisite — not a summarizer feature.

## What This Decision Does Not Claim

- That compaction is unnecessary forever  
- That any vendor summarizer should be embedded as runtime  

## Consequences

- Protects against memory-as-SSOT pollution (AP-007)  
- Keeps Checkpoint job-path semantics distinct (E-005)  

## Risks

- Silent information loss if reinject is built without validation  

## Open Questions

- What must survive compaction for resume correctness?  

## Validation Requirements

- Ownership diagram + loss metrics before implementation  

## Related Experiments

E-004 (BLOCKED); future E-004-OWNERSHIP

## Related Research

Compaction PROTOTYPE; DO-NOT-CHANGE Knowledge/Memory separation

## Implementation status

NOT IMPLEMENTED

## Implementation required

NO
