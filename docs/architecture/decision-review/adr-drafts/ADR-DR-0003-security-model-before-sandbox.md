# ADR-DR-0003 — Define security model before sandbox or posture labels

## Status

DRAFT

## Context

E-002 remains BLOCKED. Baseline: `sandbox = NOT_IMPLEMENTED`. Path confinement and CapabilityAuthority flags are **not** an OS sandbox. Research forbids fake posture labels when enforcement is undetectable.

## Observed Evidence

- No sandbox experiment executed  
- Audit: path escape checks ≠ process/network isolation  
- Authority flags observed on DeterministicProvider path only  

## Decision

**DEFER** sandbox implementation and posture-enum productization until a security model defines:

```text
Policy (decision)
  vs
Authority (capability allow/deny/confirm)
  vs
Sandbox (OS/process/network isolation)
  vs
Posture attestation (only when enforcement detectable)
```

**DEFINE SECURITY MODEL FIRST.** Refuse-unenforceable must be explicit.

## Scope

Architectural prerequisite decision — not an implementation plan for seatbelt/docker/etc.

## What This Decision Does Not Claim

- Which sandbox technology to choose  
- That Authority flags already provide sandbox  
- That metadata labels improve safety without enforcement  

## Consequences

- E-002 stays non-executable until model exists  
- No posture enum harness that would produce false assurance  

## Risks

- Security theater via labels  
- Conflating Policy with Sandbox  

## Open Questions

- Enforcement attestation signals?  
- Provider coverage matrix?  

## Validation Requirements

- Any future sandbox ADR must cite detectable enforcement tests  

## Related Experiments

E-002 (BLOCKED); future E-002-SEC-MODEL

## Related Research

Sandbox PROTOTYPE; DO-NOT-CHANGE Policy Engine role

## Implementation status

NOT IMPLEMENTED

## Implementation required

NO (prerequisite architecture only)
