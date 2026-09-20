# ADR: Universal Pre-Execute Authorization Boundary

- **Status:** Accepted
- **Date:** 2026-09-20
- **Branch:** evolve-v2
- **Related:** GAP-A03, ADR-BOUNDED-REPLANNING, CapabilityAuthority

## Context

CapabilityAuthority and skill-gate helpers existed, but authorization was not
universal on the ExecutionEngine schedule path. Mock providers and replanned IRs
could reach `ProviderRuntime.execute` without a runtime gate decision.

## Decision

1. All Engine-scheduled capabilities pass `evaluatePreExecute` **before**
   `Scheduler.schedule` / provider execute.
2. Decisions are `ALLOW | DENY | CONFIRMATION_REQUIRED | DEFERRED` (not a bare boolean).
3. Confirmation is bound to `plan_hash`; replans invalidate unless
   `inheritConfirmationAcrossReplan` is explicitly true.
4. Skill gates remain AGENT_ATTESTED via evidence status — no fake LLM validators.
5. Direct `ProviderRuntime.execute` outside the Engine is not the public API;
   enforcement claim applies to the Engine path.

## Consequences

- V1 tests remain green with permissive default `authorityContext`.
- Production / strict runs must supply `authorityContext` and `gateContext`.
- External job completion after write remains a documented limitation.
