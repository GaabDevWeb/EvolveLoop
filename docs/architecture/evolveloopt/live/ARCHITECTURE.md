# EvolveLoop Live Architecture

## Loop

```
EventBus (NodeFailed|FeatureBlocked|GateRejected)
  → attachEvolveLoopObserver (+ optional LiveAnalysisCoordinator)
  → ingest PersistentSignalStore
  → ScopedAnalysisCadence (per AnalysisScope)
  → analyze(scope)   # never silent global
  → pattern → need → RCA (live registry snapshot) → candidate
  → EvolutionRequest → handoff dir (Prototype Gate)
  → ControlledGateFixture APPROVED|HOLD (harness) / real gate (ops)
  → ObservationWindow OPEN
  → further events → samples
  → recordOutcome → post_evolution_* reingest
  → future analyze(scope)
```

## Cadence policy (`LIVE_CADENCE_DEFAULTS`)

| Key | Default |
|-----|---------|
| min_new_signals | 3 |
| min_new_signals_high_severity | 1 |
| cooldown_ms | 60000 |
| max_requests_per_need | 1 |
| max_analyses_per_minute | 30 |
| max_loop_depth | 2 |
| window_minimum_samples | 2 |
| window_max_duration_ms | 3600000 |

## Scope

Required. SYSTEM requires `authorize_system`. Multi-user events derive USER from payload.

## Autonomy

OBSERVE / ANALYZE / DETECT / PROPOSE — gated evolution. CORE → HOLD. No auto core mutation.

## Opt-in engine

```ts
new ExecutionEngine({
  evolveLoop, evolveScope, evolveCoordinator,
})
```
