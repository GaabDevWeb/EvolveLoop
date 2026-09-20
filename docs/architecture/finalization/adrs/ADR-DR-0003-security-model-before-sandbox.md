# ADR-DR-0003 — Define security model before sandbox or posture labels

## Status

ACCEPTED

## Date

2026-09-19

## Context

E-002 remains BLOCKED. Baseline: `sandbox = NOT_IMPLEMENTED`. Path confinement and CapabilityAuthority flags are **not** an OS sandbox. Research forbids fake posture labels when enforcement is undetectable.

ADR Gate: VALID_WITH_LIMITATIONS → expand security-model checklist.

## Problem

Whether sandbox or posture-enum productization can proceed without an explicit security model and enforceable attestation.

## Decision

**DEFER** sandbox implementation and posture-enum productization until a security model defines boundaries among:

```text
Policy (decision)
  vs
Authority (capability allow/deny/confirm)
  vs
Sandbox (OS/process/network/filesystem isolation)
  vs
Posture attestation (only when enforcement detectable)
```

**DEFINE SECURITY MODEL FIRST.** Refuse-unenforceable must be explicit.

**ARCHITECTURAL_DECISION_REQUIRED** before any sandbox implementation ADR.

## Evidence

| Claim | Classification | Source |
|-------|----------------|--------|
| No sandbox experiment executed | DOCUMENTED_ONLY / NOT_MEASURED | Triage E-002 |
| Path confinement ≠ OS sandbox | DIRECTLY_OBSERVED (code audit) | Audit |
| Authority flags on DeterministicProvider only | MEASURED / audit | Audit + baseline |
| Sandbox baseline status NOT_IMPLEMENTED | DOCUMENTED_ONLY | Baseline V1 |

## Evidence Scope

| Dimension | Value |
|-----------|--------|
| System | CursorSKILLS orchestrator + DeterministicProvider paths |
| Runtime | No OS isolation observed |
| Workload | N/A (no E-002 run) |
| Experiment | E-002 BLOCKED |
| Sample | N/A |
| Environment | N/A |
| Metric | N/A |

## What This Decision Establishes

- Sandbox/posture work is gated on an explicit security model.  
- Labels without detectable enforcement are forbidden as “security proof.”

## What This Decision Does NOT Establish

- Which sandbox technology to choose  
- That Authority flags already provide sandbox  
- That metadata labels improve safety without enforcement  
- A completed security model (checklist below is **pending**, not answered)

## Alternatives Considered

| Alternative | Why not chosen |
|-------------|----------------|
| Implement Docker/seccomp now | Implementation leakage; model undefined |
| Ship posture enum without enforcement | False assurance; research forbid |
| Treat path flags as sandbox | Category error |

## Consequences

- E-002 stays non-executable until model exists  
- No posture-only harness that would produce false assurance  

## Risks

- Security theater via labels  
- Conflating Policy with Sandbox  

## Reversibility

```yaml
reversibility:
  reversible: N/A
  rollback_concept: N/A — DEFER only; no implementation
  compatibility_risk: none
  state_migration: none
  data_migration: none
  note: Future sandbox ADR requires REQUIRES_IMPLEMENTATION_PLAN
```

## Validation Requirements

- Any future sandbox ADR must cite detectable enforcement tests  
- Security-model open decisions (below) must be answered first  

## Implementation Status

```text
IMPLEMENTATION_STATUS: NOT_IMPLEMENTED
```

## Open Questions — Security Model Checklist (pending)

These are **required architectural decisions**, not answers:

1. **Trust boundary** — what is inside vs outside the trusted computing base?  
2. **Execution identity** — who/what identity executes providers?  
3. **Filesystem boundary** — what write/read roots are enforceable?  
4. **Network boundary** — allow/deny/attest network?  
5. **Process isolation** — process/container/namespace requirements?  
6. **Secret exposure** — how secrets are prevented from evidence/checkpoints?  
7. **Provider execution** — which providers are covered by enforcement?  
8. **Policy enforcement** — how Policy decisions map to enforceable checks?  
9. **Escape/bypass** — what constitutes escape; refuse-unenforceable behavior?  

## Related Experiments

E-002 (BLOCKED); future E-002-SEC-MODEL (DEFERRED at experiment gate)

## Related Research

Sandbox PROTOTYPE; DO-NOT-CHANGE Policy Engine role

## Related Principles

Policy authorizes; Provider implements; Runtime orchestrates — Sandbox is enforcement substrate, not Policy itself

## Related Anti-Patterns

AP-002 soft policy — do not treat labels as enforcement
