# EvolveLoop V2 — Execution Autonomy Foundation

## Branch

```text
evolve-v2   ← V2 (this work)
main        ← V1 frozen baseline (untouched by this milestone)
```

No push. No merge. No release tags altered.

## Baseline V1

Recorded on `main` before branch creation (2026-09-20):

```text
cd orchestrator && npm test
→ 424/424 passing
```

`git` tip at branch point: `e73c91d` (main ahead of origin by 5 commits; local only).

## What Changed

| Area | Change |
|------|--------|
| `orchestrator/src/planning/` | `StructuredIntent`, `PlanEmitter`, `validateExecutableIR` |
| `orchestrator/src/providers/bootstrap.ts` | Real/mock provider bootstrap; no silent mock in `real` |
| `orchestrator/src/cli/run-engine.ts` | `--provider-mode real\|mock` (default **real**); preflight before run |
| `PolicyEngine.has()` | Enable strict unknown-policy rejection when requested |
| `CapabilityIR.metadata` | Optional `intent_id`, `execution_id` for correlation |
| Tests | `plan-emitter`, `provider-bootstrap`, `v2-intent-execution` |
| Docs | This file + ADR Intent→IR boundary |

**Not created:** second orchestrator, registry, policy engine, evidence, telemetry, knowledge, or planner architecture.

## Intent → IR Boundary

```text
StructuredIntent (Agent fills)
        ↓
PlanEmitter.emitPlan / emitPlanOrThrow   [deterministic]
        ↓
CapabilityIR (CapabilityGraph)           [existing IR]
        ↓
validateExecutableIR
        ↓
READY | REJECTED_BEFORE_EXECUTION
        ↓
ExecutionEngine.run                      [unchanged executor role]
```

Planner skill format (`plan.ir.yaml` / CapabilityGraph) remains the executable artifact. StructuredIntent is the runtime-consumable **input** when the Agent (or tool) already decomposed steps — not a magic LLM planner inside the engine.

**Status:** IMPLEMENTED (structured path). Natural-language→steps still Agent-side (PARTIAL toward full chat autonomy).

## Provider Execution Path

```text
provider.yaml manifests
        ↓
buildRegistryFromManifestFiles          [existing]
        ↓
bootstrapProviders({ mode: "real" })
        ↓
PluginLoader → DeterministicProvider | CursorSkill(+jobs) | explicit mock plugin
        ↓
RegistryClient.select*
        ↓
ExecutionEngine
```

CLI default: `--provider-mode real`.  
Explicit mocks: `--provider-mode mock`.

**Status:** IMPLEMENTED for deterministic providers. Cursor-skill still needs `--jobs-dir` (GAP-A02).

## Mock Isolation

| Mode | Behavior |
|------|----------|
| `real` | No silent `MockProvider`. Missing provider → `PROVIDER_UNAVAILABLE` / `REJECTED_BEFORE_EXECUTION` |
| `mock` | Synthetic mocks only when explicitly requested |

**Silent mock fallback:** REMOVED from default CLI path.

## Evidence Flow

- Planning evidence from `buildPlanningEvidence` with `run_id = execution_id`.
- Selection + worker evidence from existing builders during engine run.
- Correlation fields: `ir.metadata.execution_id`, `intent_id`, evidence `metadata.run_id`.

**Status:** OK for this milestone (existing evidence system; no second collector).

## Test Results

```text
V1 baseline:  424/424
V2 suite:     441/441  (+17 new tests)
```

New coverage:

- Intent valid / invalid / unknown capability / cycle / unknown policy
- Real provider registered & selected; unavailable without jobs; mock explicit; real ≠ mock
- Integration proof: intent → IR → real `filesystem.list` → engine → FileListResult evidence

## V1 Regression

```text
PASS — all prior 424 tests still green within 441/441
```

In-process tests that construct `MockProvider` directly are unchanged. Only CLI default semantics tightened.

### V2 Test Matrix

| Cenário | V1 | V2 | Esperado |
| --------------------------- | -------------- | ------------------ | --------------- |
| Existing unit tests | pass | pass | pass |
| Existing EvolveLoop | pass | pass | pass |
| Invalid IR | pass | pass | reject |
| Real provider execution | limited | pass | real result |
| Mock provider explicit mode | pass | pass | mock result |
| Real mode + provider absent | ambiguous/mock | fail explicit | no fake success |
| Intent → executable IR | manual | automated boundary | pass |
| Evidence correlation | partial | pass | execution_id |

## Remaining Autonomy Gaps

From audit — status after B04:

| Gap | Status |
|-----|--------|
| **GAP-A01..A05, B01** | **IMPLEMENTED** |
| **GAP-B04** Checkpoint / crash recovery | **IMPLEMENTED** (CRASH RECOVERABLE; see `V2-B04-STATUS.md`) |
| **AgentExecutor / LLM Replanner** | **DESIGNED** / NOT_IMPLEMENTED |
| **GAP-A06** Evolution promotion | deferred |

```text
process sandbox = NOT_IMPLEMENTED
hard provider cancellation = LIMITED
```

## Next Milestone

```text
Next: IMPLEMENT AGENTEXECUTOR CONTRACT
```

Agent/LLM layer is **DESIGNED** (see `V2-AGENT-RUNTIME-ARCHITECTURE.md` + contracts/security/eval/ADR).  
Runtime Core A01–B04 remains **IMPLEMENTED**; AgentExecutor / LLMReplanner **NOT_IMPLEMENTED**.

---

## Definition of Ready (checklist)

```text
[x] evolve-v2 criada a partir da main
[x] main não modificada
[x] baseline V1 registrado (424/424)
[x] Intent → executable IR boundary existe
[x] IR é validado antes da execução
[x] planner CapabilityGraph reutilizado
[x] ExecutionEngine continua executor
[x] real providers registáveis via bootstrap/CLI
[x] MockProvider não é fallback silencioso
[x] provider selection via registry existente
[x] execution produz evidence
[x] correlation via execution_id
[x] testes novos cobrem os caminhos
[x] regressão V1 pass (449/449 ⊇ 424)
[x] nenhum segundo registry/policy/evidence/orchestrator
[x] nenhum push
[x] GAP-A02 autonomous executor (handler-backed)
```
