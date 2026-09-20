# Scheduler Contract

**Pacote:** `contracts-v2.1.0` · **Interface:** `capability-orchestrator/scheduler@2.1.0`

Algoritmo: [specs/runtime.md](../specs/runtime.md).

---

## 1. Responsabilidade

Operar o **DAG** — identificar nós ready, agendar execuções, processar resultados, invalidar downstream. Decisões **tácticas** de execução, não estratégicas.

---

## 2. Interface

```typescript
interface Scheduler {
  ready_nodes(graph: GraphStore, policy: ExecutionPolicy): GraphNode[];
  schedule(node: GraphNode, provider: ProviderEntry, policy: ExecutionPolicy, graph: GraphStore): RunHandle;
  running_handles(): RunHandle[];
  invalidate_downstream(graph: GraphStore, node_id: string): void;
  process_run_result(run: ExecuteResult, graph: GraphStore, policy: ExecutionPolicy): void;
}
```

---

## 3. Scheduler Evidence (payload `scheduling`)

Emitida **por cada** decisão de schedule:

```yaml
payload:
  type: scheduling
  node_id: string
  selected_provider: string
  rejected_providers:
    - id: string
      reason: string
  strategy: stable | highest_quality | fastest | cheapest | experimental | priority
  ready_batch: string[]
  parallelism: number
  gate_depth?: fast | standard | deep
```

---

## 4. Capacidades contratuais

- Ordenação por dependências (topological ou priority_field — policy)
- Paralelismo até `max_parallel`
- Gates condicionais (`optional`, `skipped` por policy)
- Invalidação parcial downstream em falha
- Consulta Registry por estratégia — **não** por nome de skill

---

## 5. MUST NOT

| Proibido | Motivo |
|----------|--------|
| Mutar IR (edges, nodes) | Planner |
| Escolher `policy_id` | Orchestrator / PolicyEngine |
| `continuar \| corrigir \| replan` | Orchestrator |
| Conhecer SKILL.md por path | Registry + PluginLoader |

---

## 6. Referências

| Documento | Path |
|-----------|------|
| Runtime | [runtime.md](runtime.md) |
| Registry | [registry.md](registry.md) |
| Policies | [specs/execution-policies.md](../specs/execution-policies.md) |
