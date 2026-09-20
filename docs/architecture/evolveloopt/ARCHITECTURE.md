# EvolveLoop Architecture

## Purpose

Close the loop:

```text
observe → signal → pattern → need → root cause → candidate → validate
→ Evolution Request → existing Architecture Evolution Pipeline
```

## Non-goals

- Autonomously mutate runtime / policy / core
- Default to creating Agents
- Second registry / evidence bus / telemetry / RAG

## Components

| Module | Responsibility |
|--------|----------------|
| SignalMiner | RawObservation → NeedSignal (dedupe) |
| PatternDetector | Signals → patterns (window + scope) |
| NeedDetector | Patterns → NeedCandidate |
| RootCauseAnalyzer | Need → suspected causes + alternatives |
| EvolutionCandidateGenerator | Need+RCA → candidates (prefer small change) |
| CandidateValidator | Provenance/scope/rollback/eval gate |
| EvolveLoopController | Orchestrates; handoff only |
| EvolveLoopStore | Evolution-state persistence (separate semantic) |

## Preference hierarchy

```text
existing capability/skill/knowledge/provider/policy/routing
  → before AGENT
  → before RUNTIME
```

## Autonomy

| Level | Allowed |
|-------|---------|
| OBSERVE / ANALYZE / PROPOSE | Autonomous in EvolveLoop |
| PROTOTYPE / IMPLEMENT | Existing gates only |

Ceiling on EvolutionRequest: **PROPOSE**. `mutates_core` / `mutates_runtime` always **false** at this layer.
