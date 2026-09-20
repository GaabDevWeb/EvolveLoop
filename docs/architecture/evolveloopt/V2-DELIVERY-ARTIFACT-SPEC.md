# V2 Delivery Artifact Spec

**Status:** Spec  
**Date:** 2026-09-20

A completed engineering project artifact MUST be representable as:

```text
Project
Requirements
Architecture
TaskGraph
Assignments
Executions
Implementations
Tests
Reviews
Repairs
Replans
Validation
Evidence
Telemetry
Final Workspace
Warnings
Limitations
```

## Boundaries

| Claim | Allowed when |
|-------|----------------|
| Engineering Complete | Deterministic contracts + SE loop proven; delivery artifact produced |
| Production Delivery | **Out of scope V2** — needs deploy/CI/release/secrets/infra/sandbox |
| Live Backend Proven | Real credentials + observable run + objective validation |

## Traceability (existing contracts)

```text
Requirement → Architecture → Task → Assignment → AgentDecision
  → Implementation → Test → Review → Validation → Evidence → Delivery
```

Do not invent a parallel traceability system.
