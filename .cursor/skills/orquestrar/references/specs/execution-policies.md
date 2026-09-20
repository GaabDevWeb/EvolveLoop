# Execution Policies

**Normativo.** Separa **o que executar** (IR) de **como comportar-se** (política).

Relacionado: [runtime.md](runtime.md), [registry.md](registry.md)

---

## 1. Problema

O Scheduler não deve acumular decisões de negócio. Sem políticas, torna-se "deus" — retries, gates, estratégias, paralelismo tudo hardcoded.

```
Planner → Capability IR → Execution Policy → Scheduler → Providers
```

| Componente | Decide |
|------------|--------|
| **Planner** | O quê (grafo, contratos, DoD) |
| **Execution Policy** | Como (retries, gates, estratégia, limites) |
| **Scheduler** | Quando (ready nodes, schedule, wait, validate) |
| **Orchestrator** | Porquê parar/continuar (SSOT) |

---

## 2. Schema de Policy

```yaml
# policies/high-reliability.yaml
apiVersion: capability-orchestrator.io/v2
kind: ExecutionPolicy
metadata:
  id: high-reliability
  version: "1.0.0"
  description: "Produção — gates completos, retries generosos, qualidade"

spec:
  retries:
    default: 3
    by_capability:
      testing: 2
      frontend-ui: 2
    by_type:
      gate: 1
      worker: 3

  gates:
    required:
      - testing
      - security-review
      - po-acceptance
      - documentation
    optional:
      - frontend-visual-review
    skipped: []                           # explicitamente desactivados

  provider_strategy: highest_quality      # ver registry.md

  parallelism:
    max_parallel: 3
    mode: async                           # async | sync

  timeouts:
    step_timeout: 30m
    wait_timeout: 60m
    feature_timeout: 8h

  on_gate_reject: orchestrator            # orchestrator | auto_retry | fail_fast
  on_evidence_missing: fail                 # fail | retry

  fail_fast: false

  execution_order: topological

  knowledge:
    consult_before_schedule: true
    consult_before_provider_select: true

  memory:
    scope: feature                        # feature | session
    persist_contextual: true

  phase_gates:                            # convergência SSOT
    enabled: true
    mapping:                              # capability → fase SSOT
      testing: 3
      security-review: 4
      po-acceptance: 5
      documentation: 6
```

---

## 3. Políticas predefinidas

### `high-reliability`

| Parâmetro | Valor |
|-----------|-------|
| Retries | 3 workers, 2 testing |
| Gates | Todos obrigatórios |
| Strategy | `highest_quality` |
| Paralelismo | 3 |
| Security | ✓ |
| PO | ✓ isolado |
| Documentation | ✓ |

### `rapid-prototype`

```yaml
metadata:
  id: rapid-prototype
spec:
  retries:
    default: 1
  gates:
    required: [testing]
    skipped: [security-review, documentation, po-acceptance]
  provider_strategy: fastest
  parallelism:
    max_parallel: 4
    mode: async
  fail_fast: true
  on_gate_reject: auto_retry
  knowledge:
    consult_before_schedule: false
```

### `experimental`

```yaml
metadata:
  id: experimental
spec:
  retries:
    default: 1
  gates:
    required: []
    optional: [testing]
  provider_strategy: experimental         # providers tagged experimental
  provider_strategy_fallback: stable
  parallelism:
    max_parallel: 2
  knowledge:
    consult_before_schedule: true
```

### `cost-optimized`

```yaml
metadata:
  id: cost-optimized
spec:
  provider_strategy: cheapest
  retries:
    default: 2
  gates:
    required: [testing, po-acceptance]
  parallelism:
    max_parallel: 2
```

---

## 4. Resolução de Policy

```python
def resolve_policy(feature_context) -> ExecutionPolicy:
    # Ordem de precedência (maior ganha):
    # 1. Orchestrator override explícito
    # 2. IR metadata.policy_ref
    # 3. Project default (.orchestrator/policy.yaml)
    # 4. Built-in: high-reliability
```

---

## 5. Policy Engine API

```yaml
# Interface (ver interfaces.md)
PolicyEngine:
  resolve(policy_id | context) -> ExecutionPolicy
  gate_enabled(policy, capability) -> bool
  retries_for(policy, node) -> int
  max_parallel(policy) -> int
  provider_strategy(policy) -> StrategyId
```

---

## 6. Extensão de Policy

Policies são **declarativas** — adicionar nova policy = novo YAML, zero alteração no Scheduler.

| Extensão | Mecanismo |
|----------|-----------|
| Nova gate obrigatória | `gates.required[]` |
| Desactivar security em spike | `gates.skipped[]` |
| CI rápido | `rapid-prototype` |
| Eval de provider novo | `experimental` |

---

## 7. Anti-patterns

| Evitar | Correcto |
|--------|----------|
| Retries hardcoded no Scheduler | `policy.retries` |
| "Pular security" no código | `rapid-prototype` policy |
| Planner escolher policy por nó | Policy global + overrides Orchestrator |
| 50 policies micro-especializadas | 4–6 policies nomeadas + composição futura |
