# Contracts — Versionamento

**Normativo.** Garante compatibilidade quando capabilities, inputs, outputs e DoD evoluem.

Relacionado: [capability-ir.md](capability-ir.md), [provider-manifest.md](provider-manifest.md), [evidence.md](evidence.md)

---

## 1. Problema

```
frontend-ui v1 → frontend-ui v2 → frontend-ui v3
```

Quem garante que IR, Provider e Evidence permanecem compatíveis?

---

## 2. Camadas de versionamento

| Camada | ID exemplo | Muda quando |
|--------|------------|-------------|
| **Capability ID** | `frontend-ui` | Quase nunca — identidade semântica |
| **Contract Version** | `contracts/frontend-ui@2.1.0` | Inputs, outputs, DoD schema |
| **Schema Version** | `artifacts/frontend-pages@1.0.0` | Formato de artefactos |
| **Provider Version** | `frontend-pro@1.1.0` | Implementação |
| **IR Version** | `capability-ir/2.0.0` | Formato do grafo |

---

## 3. Contract document

```yaml
# contracts/frontend-ui.yaml
apiVersion: capability-orchestrator.io/v2
kind: Contract
metadata:
  id: frontend-ui
  version: "2.1.0"
  status: active                    # active | deprecated | retired

spec:
  capability: frontend-ui
  type: worker

  semver:
    major: 2
    minor: 1
    patch: 0

  compatible_with:
    - "contracts/frontend-ui@1.x"   # providers antigos ainda válidos
    - "contracts/frontend-ui@2.0.x"

  breaking_changes:
    - version: "2.0.0"
      description: "design-spec obrigatório como input"
      migration: "Adicionar input design-spec ou usar v1.x provider"

  inputs:
    - name: api-contract
      schema: contracts/api@1.x
      required: false
    - name: design-spec
      schema: artifacts/design-spec@1.0.0
      required: true                  # breaking em 2.0.0

  outputs:
    - name: ui-artifacts
      schema: artifacts/frontend-pages@1.0.0

  definition_of_done:
    schema: schemas/dod-frontend-ui@2.0.0
    minimum_checks:
      - ui_renders
      - api_consumed
      - responsive_baseline

  evidence:
    schema: evidence/worker-default@1.0.0
```

---

## 4. Semver rules

| Bump | Exemplo | Impacto |
|------|---------|---------|
| **MAJOR** | 2.0.0 → 3.0.0 | Breaking — IR pode rejeitar; migration required |
| **MINOR** | 2.0.0 → 2.1.0 | Additive — novos inputs opcionais, novos DoD checks |
| **PATCH** | 2.1.0 → 2.1.1 | Clarificação docs, sem alteração runtime |

---

## 5. Resolução de compatibilidade

No IR, nó declara:

```yaml
capability: frontend-ui
capability_version: ">=2.0.0 <3.0.0"
```

Runtime valida:

```python
def compatible(node, provider_contract) -> bool:
    return semver.satisfies(
        provider_contract.version,
        node.capability_version
    )
```

| Resultado | Acção |
|-----------|-------|
| Compatible | Schedule |
| Compatible via `compatible_with` | Schedule + warning |
| Incompatible | `block("contract_version_mismatch")` → replan |

---

## 6. Breaking change workflow

```
1. Publicar contract v2.0.0 com breaking_changes documentado
2. Provider actualiza manifest → contract: contracts/frontend-ui@2.0.0
3. Manter provider v1.x com contract@1.x durante janela de migração
4. Registry marca provider v1 deprecated
5. Planner passa a emitir capability_version >=2.0.0
6. Retirar v1 após telemetria confirmar zero usage
```

---

## 7. Schema registry

```
contracts/
├── frontend-ui.yaml           # contract definitions
├── testing.yaml
├── api.yaml
schemas/
├── artifacts/
│   └── frontend-pages@1.0.0.json
├── evidence/
│   └── test-report@1.0.0.json
└── dod/
    └── frontend-ui@2.0.0.json
```

Schemas JSON Schema ou equivalente — validação automática de evidence e outputs.

---

## 8. Contract no Provider manifest

```yaml
spec:
  capabilities:
    - id: frontend-ui
      contract: contracts/frontend-ui@2.1.0
```

Registry indexa `contract` → facilita compat check.

---

## 9. Deprecation

```yaml
metadata:
  status: deprecated
  deprecated_at: "2026-09-01"
  superseded_by: contracts/frontend-ui@3.0.0
  sunset_at: "2026-12-01"
```

Scheduler em strategy `stable` exclui deprecated após `sunset_at`.
