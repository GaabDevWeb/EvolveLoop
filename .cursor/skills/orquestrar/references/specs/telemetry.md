# Telemetry

**Normativo.** Schema de métricas derivadas de eventos.

Relacionado: [events.md](events.md), [registry.md](registry.md)

---

## 1. Pipeline

```
Events (JSONL) → Aggregator → Metrics (YAML/JSON) → Registry quality_score
                            → Dashboard
                            → Feature summary
```

---

## 2. Feature summary

```yaml
# telemetry/features/2026-06-30-login-dashboard.yaml
apiVersion: capability-orchestrator.io/v2
kind: FeatureMetrics
metadata:
  feature_id: "2026-06-30-login-dashboard"
  ir_id: "2026-06-30-login-dashboard"
  policy_id: high-reliability
  started_at: "2026-06-30T10:00:00Z"
  completed_at: "2026-06-30T14:30:00Z"
  duration_ms: 16200000
  success: true

metrics:
  planner:
    replan_count: 0
    accuracy: 1.0                       # 1 - replan_count

  execution:
    total_nodes: 8
    satisfied_nodes: 8
    failed_nodes: 0
    reworked_nodes: 2
    rework_rate: 0.25
    average_iterations: 1.25
    average_node_duration_ms: 2025000
    max_parallelism: 2
    parallelism_utilization: 0.35

  gates:
    testing_retries: 1
    po_rejection: false
    security_findings:
      critical: 0
      major: 0
      minor: 2
    frontend_findings: 1

  providers:
    usage:
      backend: 2
      frontend-pro: 3
      testing: 2
      po-review: 1
    fallbacks: 0

  capabilities:
    usage:
      backend-implementation: 2
      frontend-ui: 2
      testing: 2
    most_expensive_ms:
      frontend-ui: 7200000

  quality:
    evidence_completeness: 1.0
    kb_hit_rate: 0.33
    kb_hits: 1
    hallucination_detections: 0

  events_total: 47
  event_log: "telemetry/events/2026-06-30-login-dashboard.jsonl"
```

---

## 3. Provider stats (Registry input)

```yaml
# telemetry/provider-stats/frontend-pro.json
provider_id: frontend-pro
window: 30d
updated_at: "2026-06-30T15:00:00Z"

stats:
  total_runs: 847
  success_rate: 0.94
  average_duration_ms: 720000
  p95_duration_ms: 1800000
  rework_rate: 0.08
  gate_pass_rate: 0.91
  evidence_completeness: 0.97
  quality_score: 0.92                 # fórmula registry.md
  last_success: "2026-06-30T14:00:00Z"
  last_failure: "2026-06-29T09:12:00Z"
  capabilities: [frontend-ui, frontend-visual-review]
  unused_days: 0
```

---

## 4. Aggregator rules

| Métrica | Fórmula / Fonte |
|---------|-----------------|
| `rework_rate` | `reworked_nodes / total_nodes` |
| `planner.accuracy` | `1 - (features_with_replan / total_features)` |
| `testing_retries` | count `RetryScheduled` where capability=testing |
| `po_rejection_rate` | `GateRejected(po-acceptance) / GatePassed+Rejected` |
| `kb_hit_rate` | `KnowledgeHit.prevented_failure / KnowledgeHit total` |
| `provider.unused` | providers com `total_runs=0` em 30d |
| `capability.most_recurring` | top N por count em IRs |

---

## 5. Dashboard dimensions (futuro)

| Vista | Pergunta |
|-------|----------|
| Features | Quais features demoraram mais? |
| Providers | Qual provider tem pior quality_score? |
| Capabilities | Quais capabilities faltam provider? |
| Gates | Onde estão os bottlenecks de rejection? |
| Policies | `rapid-prototype` vs `high-reliability` comparativo |

---

## 6. Alerting thresholds (opcional)

```yaml
alerts:
  - metric: gate.po_rejection_rate
    threshold: 0.3
    window: 7d
    action: notify

  - metric: provider.frontend-pro.success_rate
    threshold: 0.8
    window: 30d
    action: mark_review
```

---

## 7. Retenção

| Dado | Retenção |
|------|----------|
| Event JSONL | 1 ano |
| Feature metrics | Permanente |
| Provider stats | Rolling 90d + snapshots mensais |
