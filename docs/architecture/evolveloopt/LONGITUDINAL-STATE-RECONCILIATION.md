# Longitudinal State Reconciliation

**Date:** 2026-09-19  
**Baselines:** V1 intact · V2 intact (`baseline-v2-2026-09-19`) · suite **120/120** OBSERVED  

## What exists

| Component | Status | Gap |
|-----------|--------|-----|
| SignalMiner / PatternDetector / NeedDetector / RCA / Candidates / Validator | IMPLEMENTED | Episodic (one `run()` batch) |
| EvolveLoopStore | Snapshot JSON optional | Not durable append; not queryable by window/scope |
| SyntheticFixtures | IMPLEMENTED | Not live adapters |
| PatternAggregator (learning/) | In-run NodeFailed only | Not composed into EvolveLoop |
| Telemetry JSONL / Evidence | PRESENT | Adapters NOT_CONNECTED to EvolveLoop |
| EvolutionRequest handoff | IMPLEMENTED | No EvolutionOutcome / post-change loop |

## Missing for longitudinal

- Persistent append store across process restarts  
- Cross-run aggregation with `unique_executions`  
- Need lifecycle (ESTABLISHED / STALE / RESOLVED / REOPENED)  
- Post-evolution outcome tracking → new signals  
- Real observation adapters (or explicit NOT_CONNECTED)  
- Timestamp adversarial handling  

## Reuse

- `resolveDataPaths` → add `evolutionDir`  
- Existing evolveloop types/miner/detector (extend, don't fork)  
- JsonlEventPersister as read source for adapter  
- No second registry/evidence/telemetry/RAG  

## Will add

```text
src/evolveloop/persistence/signal-store.ts
src/evolveloop/aggregation/cross-run.ts
src/evolveloop/lifecycle/need-lifecycle.ts
src/evolveloop/outcome/outcome-tracker.ts
src/evolveloop/adapters/jsonl-events.ts (+ connection status registry)
src/evolveloop/longitudinal-controller.ts
```
