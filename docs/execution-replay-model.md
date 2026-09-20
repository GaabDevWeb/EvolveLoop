# Execution replay model (observability mínimo)

**Data:** 2026-09-17  
**Estado:** documentado — **não** implementar Temporal / workflow engine externo.

## O que já existe

| Artefacto | Função |
|-----------|--------|
| `EventBus` + `EventEnvelope[]` | Timeline in-process por run |
| `JsonlEventPersister` | Persistência `telemetry/events/<feature_id>.jsonl` |
| `Evidence[]` em `RunResult` | Decisões e resultados normalizados por nó |
| `MetricsAccumulator` | Métricas agregadas (`FeatureMetrics`) |
| `summarizeExecutionTrace()` | Resumo JSON pós-run (capability calls, authority, errors, latency) |

## Modelo de replay (pragmático)

Replay = **releitura offline** de JSONL + evidence, **não** reexecução determinística completa do engine.

```text
RunResult / disco
  ├─ events/*.jsonl     → ordem temporal (FeatureStarted…NodeFailed…)
  ├─ evidence[]         → authority (allow|deny|confirm) + worker.normalized
  └─ summarizeExecutionTrace() → JSON compacto para dashboards / evals
```

### Evidence relevante (já emitida)

1. **CapabilityAuthority** — `buildAuthorityEvidence` em deny/confirm (`payload.type: authority`).
2. **DeterministicProvider (allow)** — `buildWorkerEvidence` com `payload.authority` + `spec.normalized` (resultado semântico).
3. **Retrieval (RAG)** — `buildRetrievalEvidence` / `EvidenceSet` com `degraded` / `error_code` (≠ empty corpus).

### O que NÃO fazer nesta fase

- Temporal / Cadence / Kafka event streaming
- Replay que re-dispara providers ou LLM
- Segundo “Evidence Bus” paralelo ao EventBus + evidence_dir EvolveLoop

## Uso rápido

```ts
import { summarizeExecutionTrace } from "@agents/orchestrator";

const summary = summarizeExecutionTrace({
  events: runResult.events,
  evidence: runResult.evidence,
  metrics: runResult.metrics,
});
// summary.execution_id, capability_calls, policy_authority_decisions, errors, latency_ms
```
