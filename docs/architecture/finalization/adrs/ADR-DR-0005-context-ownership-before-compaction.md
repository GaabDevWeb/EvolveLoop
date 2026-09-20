# ADR-DR-0005 — Resolve context ownership before compaction/reinject

## Status

ACCEPTED

## Date

2026-09-19

## Context

E-004 remains BLOCKED. Baseline principle: Knowledge ≠ Memory ≠ Checkpoint. No engine compaction/reinject pipeline exists. E-005 uses Checkpoint distinctly from Memory/Knowledge — boundary still useful.

ADR Gate: VALID_WITH_LIMITATIONS → state that answering ownership is out of scope of this ADR.

## Problem

Whether compaction/reinject may be implemented before ownership among context, Memory, Knowledge, Checkpoint, and validation of information loss is defined.

## Decision

**DEFER** compaction/reinject implementation until ownership is resolved in a **future ownership ADR**.

**ARCHITECTURE FIRST.** Do not collapse Memory, Knowledge, and Checkpoint into one “context store.”

**Answering ownership is out of scope of this ADR.** Listing unanswered questions is intentional. A future ownership ADR is required before E-004 experiments/prototypes.

## Evidence

| Claim | Classification | Source |
|-------|----------------|--------|
| Compaction NOT_IMPLEMENTED | DOCUMENTED_ONLY | Baseline / audit |
| No ownership experiment | NOT_MEASURED | Triage E-004 |
| Checkpoint distinct in E-005 job-path | DIRECTLY_OBSERVED (fixture use) | E-005 |
| Knowledge ≠ Memory ≠ Checkpoint principle | DOCUMENTED_ONLY | Architecture baseline |

## Evidence Scope

| Dimension | Value |
|-----------|--------|
| System | CursorSKILLS orchestrator stores + jobs checkpoint |
| Runtime | No compaction pipeline |
| Workload | N/A for compaction; E-005 only shows Checkpoint use |
| Experiment | E-004 BLOCKED |
| Sample | N/A |
| Environment | N/A |
| Metric | N/A |

## What This Decision Establishes

- Compaction/reinject is deferred.  
- Ownership questions must be answered elsewhere before prototypes.  
- Protects against memory-as-SSOT pollution and preserves Checkpoint semantics.

## What This Decision Does NOT Establish

- That compaction is unnecessary forever  
- That any vendor summarizer should be embedded  
- **Answers** to who owns compacted context (unanswered by design)

## Alternatives Considered

| Alternative | Why not chosen |
|-------------|----------------|
| Implement summarizer reinject now | Ownership undefined; information-loss risk |
| Merge Memory/Knowledge/Checkpoint | Violates baseline principle; AP-007 risk |

## Consequences

- E-004-OWNERSHIP experiment remains DEFERRED until ownership ADR  
- Job-path Checkpoint semantics remain distinct (aligned with ADR-DR-0001)  

## Risks

- Silent information loss if reinject is built without validation  

## Reversibility

```yaml
reversibility:
  reversible: N/A
  rollback_concept: N/A — DEFER; no compaction added
  compatibility_risk: none
  state_migration: none
  data_migration: none
  note: Future compaction ADR requires REQUIRES_IMPLEMENTATION_PLAN + ownership ADR
```

## Validation Requirements

- Future ownership ADR must answer the checklist below before compaction work  
- Ownership diagram + loss metrics required before implementation  

## Implementation Status

```text
IMPLEMENTATION_STATUS: NOT_IMPLEMENTED
```

## Open Questions — Ownership Checklist (out of scope to answer here)

1. Who owns **compacted context**?  
2. What is relation to **Memory**?  
3. What is relation to **Knowledge**?  
4. What is relation to **Checkpoint**?  
5. What is the **compaction boundary**?  
6. How is context **reconstructed**?  
7. How is **reinjection validated**?  
8. What **information loss** is acceptable and how measured?  
9. What must survive compaction for **resume correctness**?

## Related Experiments

E-004 (BLOCKED); future E-004-OWNERSHIP (DEFERRED)

## Related Research

Compaction PROTOTYPE; DO-NOT-CHANGE Knowledge/Memory separation

## Related Principles

Knowledge grounds; Memory stores episodic/local; Checkpoint recovers run; Evidence proves — do not conflate

## Related Anti-Patterns

AP-007 memory as SSOT pollution
