# EvolveLoop Live Operations — Starting State

**Date:** 2026-09-19  
**Tests before:** 162/162  

## Confirmed wiring

| Path | Status |
|------|--------|
| EventBus → attachEvolveLoopObserver → ingest | CONNECTED (opt-in) |
| AnalysisCadence.shouldAnalyze | EXISTS, **NOT wired to observer** |
| Automatic analyze(scope) | **MISSING** |
| analyze → EvolutionRequest handoff | EXISTS when `handoffDir` set |
| Post-evolution observation window scheduler | **MISSING** |
| Outcome re-ingestion | EXISTS (manual recordOutcome) |

## Gap (PHASE 1)

```
EventBus → ingest → [GAP] → cadence → analyze(scope)
```

## Constraints

- No second EventBus/registry/gate
- Scope mandatory; no silent global
- Autonomy ceiling: PROPOSE; CORE HOLD
- Non-blocking vs main runtime
