# ADR — Intent to Executable IR Boundary

**Status:** Accepted (evolve-v2)  
**Date:** 2026-09-20  
**Relates:** GAP-A01 (AUTONOMY_GAP_AUDIT), GAP-A05  

## Problem

User / Agent intent lived outside the runtime:

```text
natural language → PDA/LLM → planner skill → plan.ir.yaml → (optional) run-engine
```

There was no formal, validatable object at the Agent↔Runtime boundary. Separately, `run-engine` silently registered `MockProvider` for non-cursor-skill providers, producing fake SUCCESS.

## Decision

1. **Reuse `CapabilityGraph` (`CapabilityIR`) as the sole executable representation.** Do not introduce a parallel “Task IR”.
2. Introduce **`StructuredIntent`** + **`PlanEmitter`** (`orchestrator/src/planning/`):
   - Agent (or tooling) supplies structured steps (capability, inputs, deps).
   - Emitter **deterministically** produces `CapabilityIR` + planning evidence.
   - **`validateExecutableIR` / `assertExecutableIR`** reject with `REJECTED_BEFORE_EXECUTION` before `ExecutionEngine.run`.
3. Introduce **`bootstrapProviders({ mode: "real" | "mock" })`**:
   - Default CLI path: **`real`** — loads deterministic/shell via existing `PluginLoader`; cursor-skill only with `--jobs-dir`.
   - **`mock`** only when `--provider-mode mock` (tests/fixtures).
   - Missing real provider → `PROVIDER_UNAVAILABLE`, never silent mock.

## Why existing CapabilityGraph/IR was reused

Planner skill and engine already speak `kind: CapabilityGraph`. A second IR would split the ecosystem. StructuredIntent is an **input seam**, not a competing graph format.

## Agent responsibility

- Reason about goals.
- Produce / fill `StructuredIntent` (or continue emitting `plan.ir.yaml` compatible with `CapabilityIR`).
- Must **not** directly invoke providers.

## Runtime responsibility

- Validate intent structure.
- Emit and validate IR.
- Select providers via existing `RegistryClient`.
- Execute via `ExecutionEngine`.
- Produce evidence correlated by `execution_id` / `run_id`.

## Validation boundary

```text
StructuredIntent → validateStructuredIntent
                 → emitCapabilityIR
                 → validateExecutableIR (schema, caps, deps, providers, optional policy)
                 → READY | REJECTED_BEFORE_EXECUTION
                 → ExecutionEngine.run
```

## Provider boundary

```text
manifests → registry → bootstrapProviders(mode)
  real: PluginLoader (deterministic | cursor-skill+jobs | explicit mock plugin)
  mock: synthetic MockProvider (explicit only)
```

Seam reserved for GAP-B01: `providerFallbackHook: "reserved_for_gap_b01"` (no fallback implementation in this milestone).

## Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| New Task IR type | Duplicates CapabilityGraph; splits planner + engine |
| LLM inside ExecutionEngine | Violates reason≠execute; non-deterministic loop |
| Second registry/orchestrator | Forbidden by V2 reuse rule |
| Keep silent mock as default | Fake autonomy (GAP-A05) |

## Consequences

- V1 tests unchanged in behavior (in-process mock setups still valid).
- CLI default is stricter (`real`); scripts that relied on silent mock must pass `--provider-mode mock`.
- Skill-job autonomy (GAP-A02) and auto-replan (GAP-A04) remain future milestones; IR emission now exists as the prerequisite feed.
