# Contract Versioning

**Pacote:** `contracts-v2.1.0`

Detalhe capability contracts: [specs/contracts.md](../specs/contracts.md).

---

## 1. Pacotes versionados

| Pacote | ID | Versão actual |
|--------|-----|---------------|
| Runtime | `capability-orchestrator/runtime` | 2.1.0 |
| Planner | `capability-orchestrator/planner` | 2.1.0 |
| Scheduler | `capability-orchestrator/scheduler` | 2.1.0 |
| Registry | `capability-orchestrator/registry` | 2.1.0 |
| Execution | `capability-orchestrator/execution` | 2.1.0 |
| Evidence | `capability-orchestrator/evidence` | 2.1.0 |
| Capability IR | `capability-orchestrator/capability-ir` | 2.0.0 |
| Execution Policy | `capability-orchestrator/execution-policy` | 2.0.0 |

---

## 2. Semver rules

| Mudança | Bump | Exemplo |
|---------|------|---------|
| Breaking em `ExecuteRequest`, `Evidence` schema, IR edges | **MAJOR** | evidence 2.x → 3.0 |
| Novo executor type, campos opcionais em Evidence | **MINOR** | execution 2.1 → 2.2 |
| Clarificação documental | **PATCH** | runtime 2.1.0 → 2.1.1 |

---

## 3. Declaração no provider manifest

```yaml
spec:
  runtime_compatibility:
    engine: ">=2.0.0 <3.0.0"
    evidence: ">=2.1.0 <3.0.0"
    scheduler: ">=2.0.0"
    execution: ">=2.1.0"
    executor_types: [cursor-skill, mcp, shell]
  contracts:
    - capability: frontend-ui
      version: "contracts/frontend-ui@2.1.0"
```

O Engine **rejeita** (fail fast) providers com `runtime_compatibility` incompatível.

---

## 4. Compatibilidade cruzada

| Provider evidence | Engine evidence | Resultado |
|-------------------|-----------------|-----------|
| 2.0.x (sem confidence) | 2.1.x | `partial` — warning |
| 2.1.x | 2.1.x | `complete` |
| 3.0.x | 2.1.x | **rejeitado** |

---

## 5. Novo executor

Adicionar executor = **MINOR** bump em `execution.md` + registo no manifest. **Zero** alterações em Scheduler ou Runtime core.

---

## 6. Referências

| Documento | Path |
|-----------|------|
| Capability contracts | [specs/contracts.md](../specs/contracts.md) |
| Provider manifest | [specs/provider-manifest.md](../specs/provider-manifest.md) |
| Integration test | [README.md](README.md) |
