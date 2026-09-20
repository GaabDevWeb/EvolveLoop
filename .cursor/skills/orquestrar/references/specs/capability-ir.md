# Capability IR — Intermediate Representation

**Normativo.** Formato oficial produzido pelo Planner. Entrada do Execution Engine.

Relacionado: [runtime.md](runtime.md), [contracts.md](contracts.md)

---

## 1. Definição

**Capability IR** (Intermediate Representation) é a linguagem intermédia entre intenção (spec/feature) e execução (Scheduler).

| Propriedade | Valor |
|-------------|-------|
| Formato canónico | YAML |
| Schema version | `capability-ir/2.0.0` |
| Produzido por | Planner |
| Consumido por | Execution Engine |
| Mutável em runtime | **Não** — alterações exigem `replan` |

---

## 2. Documento raiz

```yaml
# capability-ir.yaml
apiVersion: capability-orchestrator.io/v2
kind: CapabilityGraph
metadata:
  id: "2026-06-30-login-dashboard"
  feature: "Login + Dashboard"
  created_at: "2026-06-30T10:00:00Z"
  planner_version: "1.0.0"
  ir_version: "2.0.0"
  policy_ref: "high-reliability"          # default; Orchestrator pode override

spec:
  nodes: []                               # ver secção 3
  edges: []                               # implícito via dependencies; explícito opcional
  global_inputs: []                         # artefactos partilhados
  global_outputs: []                        # entregáveis finais da feature
  assumptions: []                           # suposições declaradas
  out_of_scope: []                          # explicitamente excluído
```

---

## 3. Schema de nó

```yaml
nodes:
  - id: fe-login                          # único no grafo; kebab-case
    capability: frontend-ui               # ID no Registry
    capability_version: ">=2.0.0 <3.0.0"  # semver range — ver contracts.md
    type: worker                          # worker | gate
    inputs:
      - ref: contract-1.outputs
        schema: contracts/api@1.2.0
      - ref: global_inputs.design-spec
        schema: artifacts/design-spec@1.0.0
    outputs:
      - id: ui-login
        path: "src/pages/login/"
        schema: artifacts/frontend-pages@1.0.0
    dependencies:
      - contract-1
    definition_of_done:
      - id: dod-ui-1
        check: "UI renderiza formulário login conforme design-spec"
        verification: manual | automated | evidence
      - id: dod-ui-2
        check: "Consome API conforme contrato"
        verification: automated
    constraints:                            # opcional; filtra providers
      stack: [react, typescript]
    metadata:
      priority: 50                          # desempate na ordenação
      estimated_effort: M                   # S | M | L — informativo
      tags: [ui, auth]
```

### Campos obrigatórios por nó

| Campo | Worker | Gate |
|-------|--------|------|
| `id` | ✓ | ✓ |
| `capability` | ✓ | ✓ |
| `type` | ✓ | ✓ |
| `inputs` | ✓ | ✓ |
| `outputs` | ✓ | ✓ (evidence paths) |
| `dependencies` | ✓ | ✓ |
| `definition_of_done` | ✓ | ✓ |
| `capability_version` | recomendado | recomendado |

### Campos proibidos no IR (Scheduler preenche)

- `provider` / `provider_id`
- `status`
- `retry_count`
- `evidence`
- `scheduled_at`

---

## 4. Schema de Gate

Gates usam o mesmo schema de nó com extensões:

```yaml
  - id: test-suite
    capability: testing
    type: gate
    inputs:
      - ref: be-auth.outputs
      - ref: fe-login.outputs
    outputs:
      - id: test-report
        path: "telemetry/evidence/test-report.json"
        schema: evidence/test-report@1.0.0
    dependencies: [be-auth, fe-login]
    definition_of_done:
      - id: dod-test-1
        check: "Suite verde"
        verification: automated
    gate:
      on_reject: invalidate_downstream    # default
      verdict_required: true
      isolation: false                    # po-acceptance → true
```

---

## 5. Arestas

Dependências via `dependencies[]` (default). Arestas explícitas opcionais:

```yaml
edges:
  - from: contract-1
    to: be-auth
    type: data                            # data | ordering | soft
```

| Tipo | Significado |
|------|-------------|
| `data` | Output de `from` é input de `to` |
| `ordering` | Ordem sem dependência de dados |
| `soft` | Preferível antes; Scheduler pode violar com policy |

---

## 6. Validação (IR linter)

Antes de `engine.run()`:

| Regra | Erro |
|-------|------|
| IDs únicos | `IR_DUPLICATE_ID` |
| Sem ciclos | `IR_CYCLE_DETECTED` |
| `dependencies` referem nós existentes | `IR_DANGLING_EDGE` |
| Gate `po-acceptance` com `isolation: true` | warning se ausente |
| `capability` existe no Registry | `IR_UNKNOWN_CAPABILITY` |
| Schemas referenciados existem | `IR_UNKNOWN_SCHEMA` |

---

## 7. Versionamento do IR

```yaml
metadata:
  ir_version: "2.0.0"
  supersedes: "2026-06-29-login-dashboard-v1"   # se replan
  replan_reason: "testing revealed auth bug in contract"
```

Replan produz **novo documento** com `supersedes` — Graph Store substitui atomicamente.

---

## 8. Exemplo completo

Ver [ecosystem-v2.md §17](../ecosystem-v2.md) — exemplo login convertido:

```yaml
apiVersion: capability-orchestrator.io/v2
kind: CapabilityGraph
metadata:
  id: "2026-06-30-login-dashboard"
  feature: "Login + Dashboard"
  ir_version: "2.0.0"
  policy_ref: "high-reliability"

spec:
  global_inputs:
    - id: feature-request
      source: user
  nodes:
    - id: contract-1
      capability: api-contract
      type: worker
      inputs: [{ ref: global_inputs.feature-request }]
      outputs: [{ id: api-contract, path: "docs/contracts/login-api.md", schema: contracts/api@1.0.0 }]
      dependencies: []
      definition_of_done:
        - { id: dod-1, check: "OpenAPI documentado", verification: evidence }

    - id: be-auth
      capability: backend-implementation
      type: worker
      inputs: [{ ref: contract-1.outputs.api-contract }]
      outputs: [{ id: auth-module, path: "src/auth/" }]
      dependencies: [contract-1]
      definition_of_done:
        - { id: dod-be-1, check: "Endpoints implementados", verification: automated }

    - id: fe-login
      capability: frontend-ui
      capability_version: ">=2.0.0"
      type: worker
      inputs: [{ ref: contract-1.outputs.api-contract }]
      outputs: [{ id: ui-login, path: "src/pages/login/" }]
      dependencies: [contract-1]
      definition_of_done:
        - { id: dod-fe-1, check: "UI conforme spec", verification: evidence }

    - id: fe-review
      capability: frontend-visual-review
      type: gate
      dependencies: [fe-login]
      inputs: [{ ref: fe-login.outputs.ui-login }]
      outputs: [{ id: visual-report, path: ".frontend-review/" }]
      definition_of_done:
        - { id: dod-fr-1, check: "Screenshot capturado", verification: evidence }
      gate: { verdict_required: true }

    - id: test-suite
      capability: testing
      type: gate
      dependencies: [be-auth, fe-login]
      inputs:
        - { ref: be-auth.outputs.auth-module }
        - { ref: fe-login.outputs.ui-login }
      outputs: [{ id: test-report, path: "telemetry/evidence/test-report.json" }]
      definition_of_done:
        - { id: dod-t-1, check: "Suite verde", verification: automated }
      gate: { on_reject: invalidate_downstream }

    - id: sec-audit
      capability: security-review
      type: gate
      dependencies: [test-suite]
      definition_of_done:
        - { id: dod-s-1, check: "Sem findings críticos", verification: evidence }
      gate: { verdict_required: true }

    - id: po-accept
      capability: po-acceptance
      type: gate
      dependencies: [fe-review, test-suite, sec-audit]
      gate: { isolation: true, verdict_required: true }
      definition_of_done:
        - { id: dod-po-1, check: "OK ou Ajustes documentados", verification: evidence }

    - id: docs
      capability: documentation
      type: gate
      dependencies: [po-accept]
      definition_of_done:
        - { id: dod-doc-1, check: "README/changelog actualizados", verification: evidence }
```
