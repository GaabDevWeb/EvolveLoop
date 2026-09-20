# EvolveLoop Stabilization — Starting State

**Date:** 2026-09-19  
**Prior verdict:** `VALIDATED_WITH_LIMITATIONS` (`docs/architecture/evolveloopt/validation/`)

## Verified gaps entering this phase

| Gap | Status at start |
|-----|-----------------|
| analyze() without scope aggregates all | OPEN → target REQUIRES_SCOPE |
| Outcomes not re-ingested | OPEN |
| Registry = injected inventory | OPEN → live CapabilityRegistry snapshot |
| Live adapters / runtime wiring | OPEN → EventBus observer opt-in |
| Dual episodic + longitudinal stacks | DOCUMENTED (keep; no second architecture) |

## Existing systems (reuse)

| System | Path | Role |
|--------|------|------|
| CapabilityRegistry / RegistryClient | `registry/` | Live inventory source |
| EventBus + JsonlEventPersister | `events/`, `persistence/` | Runtime observation |
| resolveDataPaths.evolutionDir | `persistence/paths.ts` | Longitudinal store root |
| ExecutionEngine | `engine/` | Opt-in observer hook |
| discover skills (agentsRoot) | `discovery/provider-discovery.ts` | Skill scan pattern |
| Prototype Gate handoff | `evolveloop/handoff/` | Evolution requests |

## Not inventing

No second registry, EventBus, evidence bus, telemetry layer, or evolution engine.

## Baselines

V1/V2/V3 preserved; V4 only after completion criteria.
