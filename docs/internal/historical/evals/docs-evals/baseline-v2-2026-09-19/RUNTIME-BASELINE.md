# Runtime Baseline V2 — 2026-09-19

Parent: baseline-v1-2026-09-18 (immutable).

## Delta

- Added `orchestrator/src/evolveloop/` — Need Detection loop (signals→patterns→needs→RCA→candidates→EvolutionRequest handoff).
- Autonomy ceiling: PROPOSE. CORE_CANDIDATE → HOLD (no auto Core).
- No sandbox/stuck/routing changes.
- Tests: 120/120 (was 103; +17 EvolveLoop).

## Invariants preserved

Jobs/resume, Evidence[], Registry, Policy, Authority DeterministicProvider — unchanged in behavior.
