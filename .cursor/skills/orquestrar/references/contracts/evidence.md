# Evidence Contract

**Pacote:** `contracts-v2.1.0` · **Interface:** `capability-orchestrator/evidence@2.1.0`

Schema detalhado workers/gates: [specs/evidence.md](../specs/evidence.md).

---

## 1. Princípio

**Todo nó e toda decisão de componente emite Evidence.** O sistema inteiro é observável. Gate é um **tipo** de evidence — não o único consumidor.

---

## 2. Emissores e tipos

| Emissor | `metadata.emitter` | Payload `type` | Campos chave |
|---------|-------------------|----------------|--------------|
| Planner | `planner` | `planning` | assumptions, decomposition_confidence, unresolved_dependencies |
| Scheduler | `scheduler` | `scheduling` | selected_provider, rejected_providers, ready_batch |
| Registry | `registry` | `selection` | ranking_snapshot, strategy_applied |
| Worker | `worker` | `worker` | artifacts, side_effects, checks |
| Gate | `gate` | `gate` | verdict, confidence, findings |
| Executor | `executor` | `execution` | duration_ms, logs, retry_count, timeout_hit |

---

## 3. Schema base (v2.1)

```yaml
apiVersion: capability-orchestrator.io/v2
kind: Evidence
metadata:
  node_id: string                    # ou "planning", "selection:<capability>"
  run_id: string
  emitter: planner | scheduler | registry | worker | gate | executor
  provider_id?: string
  capability?: string
  submitted_at: ISO8601

spec:
  status: complete | partial | failed
  confidence: number                 # 0.0–1.0 — obrigatório em v2.1
  coverage: number                   # 0.0–1.0 — % DoD verificado automaticamente
  assumptions: string[]
  known_gaps:
    - id: string
      severity: critical | major | minor | info
      description: string
  payload: <type-specific>           # ver secção 4
```

---

## 4. Payloads por tipo

### 4.1 `planning`

```yaml
payload:
  type: planning
  decomposition_confidence: number
  unresolved_dependencies: string[]
  critical_path: string[]
  out_of_scope: string[]
```

### 4.2 `scheduling`

```yaml
payload:
  type: scheduling
  selected_provider: string
  rejected_providers: [{ id, reason }]
  strategy: string
  ready_batch: string[]
  parallelism: number
```

### 4.3 `selection`

```yaml
payload:
  type: selection
  capability: string
  ranking_snapshot: [{ provider_id, score, cost, success_rate, selected }]
  strategy_applied: string
```

### 4.4 `worker`

```yaml
payload:
  type: worker
  artifacts: [{ path, type, checksum? }]
  checks: [{ dod_id, result, verification }]
  side_effects:
    files_created: string[]
    files_modified: string[]
    commands_run: string[]
```

### 4.5 `gate`

```yaml
payload:
  type: gate
  verdict: passed | rejected | conditional
  findings: [{ id, severity, description, location? }]
  artifacts: [{ path, type }]
```

### 4.6 `execution`

```yaml
payload:
  type: execution
  executor_id: string
  executor_type: string
  retry_count: number
  timeout_hit: boolean
  logs: [{ path, excerpt? }]
```

---

## 5. Validação

| Regra | Aplicação |
|-------|-----------|
| `status: complete` obrigatório para nó → `satisfied` | Workers e Gates |
| `confidence` ≥ `policy.min_confidence` | Gates em `high-reliability` |
| `verdict` obrigatório | Gates |
| Todos os `dod_id` com `result: pass` | Workers e Gates |
| `known_gaps` com severity `critical` → não `complete` | Universal |

---

## 6. Invariante

Sem Evidence com `status: complete` e `confidence` declarado, **nenhuma** transição para estado terminal de sucesso é permitida (ver [runtime.md](runtime.md)).

---

## 7. Referências

| Documento | Path |
|-----------|------|
| Spec v2.0 workers/gates | [specs/evidence.md](../specs/evidence.md) |
| Runtime | [runtime.md](runtime.md) |
