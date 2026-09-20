# Events

**Normativo.** Modelo de eventos do Execution Engine — runtime dirigido por eventos.

Relacionado: [runtime.md](runtime.md), [telemetry.md](telemetry.md), [registry.md](registry.md)

---

## 1. Event Bus

Todos os subsistemas comunicam via eventos append-only:

```
Producer → Event Bus → [Telemetry, Registry, Knowledge, Memory, Orchestrator hooks]
```

| Propriedade | Valor |
|-------------|-------|
| Persistência | `telemetry/events/<feature_id>.jsonl` |
| Ordem | Total por feature |
| Idempotência | `event_id` UUID |

---

## 2. Envelope base

```yaml
# Cada evento
event_id: "550e8400-e29b-41d4-a716-446655440000"
type: NodeCompleted
timestamp: "2026-06-30T10:15:00Z"
feature_id: "2026-06-30-login-dashboard"
source: scheduler                    # scheduler | orchestrator | provider | planner
correlation_id: "run-uuid"           # liga eventos do mesmo run
payload: { ... }                     # type-specific
```

---

## 3. Catálogo de eventos

### Lifecycle — Feature

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `FeatureStarted` | `engine.run()` inicia | `ir_id`, `policy_id` |
| `FeatureCompleted` | Grafo finished | `metrics`, `duration_ms` |
| `FeatureBlocked` | Engine blocked | `reason`, `node_id?` |
| `FeatureAborted` | Abort manual/catastrófico | `reason` |

### Lifecycle — Node

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `NodeScheduled` | Nó entra em running | `node_id`, `provider_id`, `attempt` |
| `NodeStarted` | Provider confirmou início | `run_id`, `node_id` |
| `NodeCompleted` | Success + evidence OK | `run_id`, `evidence_ref`, `duration_ms` |
| `NodeFailed` | Erro ou evidence invalid | `run_id`, `error`, `attempt` |
| `RetryScheduled` | Retry policy activo | `node_id`, `attempt`, `max_retries` |
| `NodeSkipped` | Policy gate disabled | `node_id`, `capability` |

### Gates

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `GatePassed` | Verdict approved | `node_id`, `verdict`, `evidence_ref` |
| `GateRejected` | Verdict rejected | `node_id`, `verdict`, `findings[]` |
| `GateSkipped` | Policy | `node_id` |

### Graph

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `SubgraphInvalidated` | Falha/reject downstream | `root_node_id`, `affected[]` |
| `PhaseGateReached` | Fase SSOT | `phase`, `node_id` |

### Planning

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `PlannerReplan` | Orchestrator → replan | `new_ir_id`, `reason`, `supersedes` |

### Providers

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `ProviderSelected` | Antes de schedule | `node_id`, `provider_id`, `strategy` |
| `ProviderFallbackUsed` | Primary indisponível | `primary`, `fallback`, `reason` |
| `ProviderDiscoveryStarted` | find-skills | `capability`, `query` |
| `ProviderDiscoveryCompleted` | Novo provider | `capability`, `provider_id` |

### Knowledge & Memory

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `KnowledgeHit` | Consulta útil | `query`, `entries[]`, `prevented_failure?` |
| `KnowledgeProposed` | Learning durável | `entry`, `source_node` |
| `MemoryWritten` | Contexto feature | `scope`, `entry` |

### Orchestrator

| Type | Quando | Payload chave |
|------|--------|-----------------|
| `OrchestratorDecision` | continuar/corrigir/replan | `decision`, `reason` |
| `HumanInputRequired` | Upstream humano | `capability`, `prompt` |
| `HumanInputReceived` | Resposta humana | `capability`, `response_ref` |

---

## 4. Payload examples

### NodeCompleted

```yaml
type: NodeCompleted
payload:
  node_id: be-auth
  run_id: "run-abc"
  provider_id: backend
  capability: backend-implementation
  duration_ms: 480000
  evidence_ref: "telemetry/evidence/be-auth.json"
  attempt: 1
```

### GateRejected

```yaml
type: GateRejected
payload:
  node_id: po-accept
  provider_id: po-review
  verdict: rejected
  findings:
    - id: PO-001
      severity: major
      description: "Login sem feedback de erro"
  evidence_ref: "telemetry/evidence/po-accept.json"
```

### ProviderSelected

```yaml
type: ProviderSelected
payload:
  node_id: fe-login
  capability: frontend-ui
  provider_id: frontend-pro
  strategy: highest_quality
  candidates_considered: 2
  quality_score: 0.92
```

---

## 5. Subscribers

| Subscriber | Eventos consumidos | Acção |
|------------|-------------------|-------|
| **Telemetry** | Todos | Agregação métricas |
| **Registry** | NodeCompleted, NodeFailed, RetryScheduled, GateRejected | Update provider stats |
| **Knowledge** | KnowledgeProposed | Curadoria / indexação |
| **Memory** | MemoryWritten | Persist scope feature |
| **Orchestrator** | FeatureBlocked, GateRejected | decide() |
| **Audit log** | Todos | Compliance |

---

## 6. JSONL example

```jsonl
{"event_id":"...","type":"FeatureStarted","timestamp":"2026-06-30T10:00:00Z","feature_id":"login","payload":{"policy_id":"high-reliability"}}
{"event_id":"...","type":"ProviderSelected","timestamp":"2026-06-30T10:01:00Z","feature_id":"login","payload":{"node_id":"contract-1","provider_id":"planner"}}
{"event_id":"...","type":"NodeCompleted","timestamp":"2026-06-30T10:05:00Z","feature_id":"login","payload":{"node_id":"contract-1","duration_ms":300000}}
```

---

## 7. Event → Metric mapping

Ver [telemetry.md](telemetry.md) — cada evento alimenta métricas específicas.

| Evento | Métrica |
|--------|---------|
| `RetryScheduled` | `task.rework_rate` |
| `GateRejected` | `gate.po_rejection_rate` |
| `KnowledgeHit` | `quality.kb_hit_rate` |
| `ProviderFallbackUsed` | `provider.fallback_rate` |
| `PlannerReplan` | `planner.accuracy` (negativo) |
