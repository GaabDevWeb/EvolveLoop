# Scope

`analyze({ scope: { type, id }, authorize_system? })`  
Sem scope → `REQUIRES_SCOPE`. SYSTEM → exige `authorize_system: true`.

# Runtime wiring

```ts
new ExecutionEngine({
  ...,
  evolveLoop: new LongitudinalEvolveLoop({ evolutionDir, registry }),
  evolveScope: { type: "USER", id: userId },
});
```

Observer: `attachEvolveLoopObserver(eventBus, loop, { scope })` — só `ingest`, nunca `analyze` automático.

# Cadence

`AnalysisCadence` — `min_new_signals` (default 3) + `cooldown_ms` (60s) + request dedupe.

# Adapters

Ver `ADAPTER_REGISTRY` em `adapters/jsonl-events.ts`. Não declarar CONNECTED o que não está wired.
