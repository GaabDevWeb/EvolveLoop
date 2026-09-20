# Planner Contract

**Pacote:** `contracts-v2.1.0` · **Interface:** `capability-orchestrator/planner@2.1.0`

---

## 1. Responsabilidade

Decompor objetivos em **Capability IR** (Task Graph). Pensamento sistémico — não execução.

---

## 2. Interface

```typescript
interface Planner {
  plan(context: PlanContext): PlanResult;
  replan(graph: GraphSnapshot, reason: string): PlanResult;
}

interface PlanContext {
  feature_request: string;
  upstream_artifacts: ArtifactRef[];   // PRD, ADR, API_SPEC, etc.
  knowledge: KnowledgeEntry[];
  memory?: MemoryScope;
}

interface PlanResult {
  ir: CapabilityIR;
  evidence: Evidence;                 // emitter: planning — ver evidence.md
}
```

---

## 3. Output permitido

- `CapabilityIR` conforme [specs/capability-ir.md](../specs/capability-ir.md)
- **Planner Evidence** (obrigatória)

---

## 4. Planner Evidence (payload `planning`)

```yaml
payload:
  type: planning
  assumptions: string[]
  decomposition_confidence: number      # 0.0–1.0
  unresolved_dependencies: string[]
  critical_path: string[]               # node_ids
  out_of_scope: string[]
```

---

## 5. MUST NOT

| Proibido | Motivo |
|----------|--------|
| Escolher provider | Registry + Scheduler |
| Escolher executor | Execution contract |
| Definir `policy_id` final | Orchestrator |
| Mutar status de nós | Runtime |
| Implementar código (salvo pedido explícito plano+exec) | Separação Worker |

---

## 6. Referências

| Documento | Path |
|-----------|------|
| Capability IR | [specs/capability-ir.md](../specs/capability-ir.md) |
| Evidence | [evidence.md](evidence.md) |
| Skill Cursor | `.cursor/skills/planner/SKILL.md` |
