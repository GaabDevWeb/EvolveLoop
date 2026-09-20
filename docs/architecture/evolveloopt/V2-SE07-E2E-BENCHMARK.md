# V2 SE-07 — End-to-End Software Engineering Benchmark & Closed-Loop Execution

**Status:** IMPLEMENTED (deterministic composition proof)  
**Branch:** `evolve-v2`  
**Depends on:** SE-01..SE-06, A01–A04, B01, B04, AgentExecutor

## Purpose

SE-07 **composes** existing contracts into one closed-loop project run. It does **not** invent a second Runtime, Supervisor, Worker, Reviewer, Evidence, or Telemetry system.

Target chain:

```text
Brief → Requirements → Architecture → TaskGraph → Supervisor → AgentExecutor
  → EngineeringWorker → Runtime effects → Tests → Review → Validation → Delivery
```

Failure / recovery paths reuse A03/A04/B01/B04 already proven in prior milestones.

## Composition layer

| Piece | Role |
|-------|------|
| `SoftwareEngineeringProject` | Project lifecycle (`CREATED`…`COMPLETED`) + delivery aggregation |
| `ProjectCheckpointStore` | AT_LEAST_ONCE project checkpoint (complements B04 worker/assignment stores) |
| `auditCompositionSeams()` | Documents SE-01..06 handoffs; flags GAPs |
| Fixture `se07-minicrm` | Brownfield MiniCRM contacts API + failing email stub |

## Fixture: SE07 MiniCRM

- Brownfield Node ESM contacts CRUD (`src/api`, `src/store`, `src/domain`, `src/validation`)
- Stub `isValidEmail` accepts any non-empty string → `npm test` fails on invalid email → **repair**
- Deliberate `forbid:mongodb` injection → architecture violation → **A04 replan lineage**
- Single brief: `MINICRM_BRIEF` / `BRIEF.md`

## Deterministic vs Live LLM

| Surface | Status |
|---------|--------|
| Deterministic framework proof (vitest) | measured PASS/FAIL |
| Live LLM quality (OllamaReasoningProvider) | **NOT_MEASURED** in this milestone unless separately eval’d |

Do **not** mix these in the same scorecard.

## Honest claims

Demonstrated:

- One brief drives SE-01..06 without manual per-task authoring in the automated path
- Real workspace file changes + real `npm test`
- Repair lineage + replan version lineage
- Project completion ≠ task completion
- Crash checkpoint + resume of completed task ids
- Adversarial guards fail closed (scope, shell, evidence, path escape)

**Not** claimed: fully autonomous engineer, production ready, exactly-once, secure sandbox, self-improving routing.

## Key paths

- `orchestrator/src/engineering/project/`
- `orchestrator/tests/fixtures/se07-minicrm/`
- `orchestrator/tests/unit/se07-e2e-benchmark.test.ts`
- `docs/architecture/evolveloopt/ADR-E2E-BENCHMARK-COMPOSITION.md`
- `docs/architecture/evolveloopt/V2-SE07-BENCHMARK-RESULTS.md`
