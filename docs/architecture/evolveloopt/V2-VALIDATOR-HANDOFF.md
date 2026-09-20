# V2 Validator Handoff

**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Audience:** independent validation agents

## Order

| Layer | What | Command / artifact | Expected | Limitations |
|-------|------|-------------------|----------|-------------|
| 1 | A01–A04 | `cd orchestrator && npx vitest run tests/integration/v2-intent-execution.test.ts tests/integration/a03-runtime-gates.test.ts tests/integration/a04-bounded-replan.test.ts` | PASS | — |
| 2 | B01/B04 | `npx vitest run tests/integration/b01-resource-policy.test.ts tests/integration/b04-checkpoint-recovery.test.ts` | PASS | — |
| 3 | Agent runtime | `npx vitest run tests/integration/agent-executor.test.ts tests/unit/reasoning-provider-adapter.test.ts` | PASS | Live LLM separate |
| 4 | SE01–03 | `npx vitest run tests/unit/requirements-se01.test.ts tests/unit/architecture-se02.test.ts tests/unit/task-graph-se03.test.ts` | PASS | — |
| 5 | SE04–06 | `npx vitest run tests/unit/supervisor-se04.test.ts tests/unit/engineering-worker-se05.test.ts tests/unit/engineering-review-se06.test.ts` | PASS | — |
| 6 | SE07 | `npx vitest run tests/unit/se07-e2e-benchmark.test.ts` | PASS | deterministic |
| 7 | Adapters | `npx vitest run tests/unit/backends/agent-backend-contract.test.ts` | PASS (mocks) | live BLOCKED without auth/SDK |
| 8 | Live backends | SE08 live / env gates | PASS only if real | else BLOCKED/NOT_MEASURED |
| 9 | Long-horizon | SE07 + bench A–J | Tier1–2; Tier3–4 NOT_MEASURED OK | — |
| 10 | Adversarial | A03 + backends auth + scope/injection benches | PASS deterministic | — |
| 11 | Recovery | B04 suite | PASS | vendor resume ≠ B04 |
| 12 | Final E2E | SE07 + benchmarks-aj | PASS deterministic | live separate |

Full suite: `cd orchestrator && npx vitest run`

## Claims allowed

- Deterministic engineering loop proven (SE-07 + A–J).
- AgentBackend contract present; Model C default.
- Backend-agnostic core with adapters under `src/backends/`.

## Claims forbidden without new proof

- fully autonomous / human-level / production ready
- EvolveLoop sandbox implemented
- live LLM quality MEASURED without live runs
- mock = live
- vendor sandbox = EvolveLoop sandbox
- self-evolving core

## Known gaps

- Live Cursor/Codex/Claude/Antigravity often BLOCKED (auth/binary)
- B03 dual knowledge seams residual
- B06 dist may be stale vs src (rebuild with `npm run build`)
- SE-08 procedural debt (implemented before adapter approval) — reconciled as ReasoningProvider facade

## Grill-me evidence

`memory/evolveloop-v2-master-finalization/evidence/gate.grill-me.json`
