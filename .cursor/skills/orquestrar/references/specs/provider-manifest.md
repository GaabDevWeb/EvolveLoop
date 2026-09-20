# Provider Manifest

**Normativo.** Schema de `provider.yaml` — unidade de packaging do ecossistema.

Relacionado: [plugins.md](plugins.md), [registry.md](registry.md), [contracts.md](contracts.md)

---

## 1. Propósito

Cada Provider declara-se via manifest. O **Registry Builder** agrega manifests → `capability-registry.yaml`.

Analogia: `package.json` / `Cargo.toml` para agentes.

---

## 2. Localização

```
providers/
├── frontend-pro/
│   ├── provider.yaml
│   └── SKILL.md              # implementação cursor-skill
├── backend/
│   ├── provider.yaml
│   └── SKILL.md
└── testing/
    └── provider.yaml
```

Ou dentro de skill existente:

```
.cursor/skills/frontend-pro/
├── SKILL.md
└── provider.yaml              # sidecar manifest
```

---

## 3. Schema completo

```yaml
# provider.yaml
apiVersion: capability-orchestrator.io/v2
kind: Provider
metadata:
  name: frontend-pro
  version: "1.1.0"
  description: "UI implementation and visual QA for web stacks"
  owner: agents-team
  license: MIT
  homepage: ".cursor/skills/frontend-pro/SKILL.md"

spec:
  plugin:
    type: cursor-skill              # cursor-skill | mcp | shell | human | remote-agent
    entrypoint: ".cursor/skills/frontend-pro/SKILL.md"

  capabilities:
    - id: frontend-ui
      contract: contracts/frontend-ui@2.0.0
      type: worker
      modes:
        - name: build
          default: true
        - name: vision
          delegates: image-to-code
    - id: frontend-visual-review
      contract: contracts/frontend-visual-review@1.0.0
      type: gate
      modes:
        - name: review
        - name: audit

  interfaces:
    inputs:
      - name: api-contract
        schema: contracts/api@1.x
        required: false
      - name: design-spec
        schema: artifacts/design-spec@1.0.0
        required: false
    outputs:
      - name: ui-artifacts
        schema: artifacts/frontend-pages@1.0.0
      - name: visual-evidence
        schema: evidence/visual-review@1.0.0

  runtime:
    cost: medium
    estimated_duration: 10m-45m
    isolation_required: false       # true para po-acceptance-like
    subagent_type: generalPurpose

  constraints:
    stack: [react, next, html, typescript, css]
    platforms: [cursor]

  dependencies:
    plugins:
      - name: image-to-code
        optional: true
        capability: visual-generation
    capabilities:
      - api-contract
        type: soft

  telemetry:
    key: provider.frontend-pro
    emit_events: true

  fallbacks: []                     # ou referência a outro provider

  availability: active              # active | deprecated | experimental
  priority: 100
```

---

## 4. Campos obrigatórios

| Campo | Obrigatório |
|-------|-------------|
| `metadata.name` | ✓ |
| `metadata.version` | ✓ semver |
| `spec.plugin.type` | ✓ |
| `spec.plugin.entrypoint` | ✓ |
| `spec.capabilities[]` | ✓ ≥1 |
| `spec.capabilities[].id` | ✓ |
| `spec.capabilities[].type` | ✓ worker \| gate |
| `spec.runtime.cost` | ✓ |
| `spec.telemetry.key` | ✓ |

---

## 5. Validação

```bash
registry-builder validate providers/frontend-pro/provider.yaml
```

| Regra | Código |
|-------|--------|
| Semver válido | `MANIFEST_INVALID_VERSION` |
| Capability IDs únicos no manifest | `MANIFEST_DUPLICATE_CAPABILITY` |
| Contract schema existe | `MANIFEST_UNKNOWN_CONTRACT` |
| Plugin type suportado | `MANIFEST_UNSUPPORTED_PLUGIN` |
| Gate com `isolation_required` coerente | warning |

---

## 6. Geração de Registry entry

Builder transforma manifest → entrada no registry:

```yaml
# Entrada gerada (excerpt)
frontend-ui:
  providers:
    - id: frontend-pro
      manifest: providers/frontend-pro/provider.yaml
      priority: 100
      cost: medium
      version: "1.1.0"
      availability: active
      # telemetry.* preenchido em runtime
```

---

## 7. Versionamento de manifest

| Bump | Quando |
|------|--------|
| MAJOR | Breaking change em contract ou capability removida |
| MINOR | Nova capability ou mode |
| PATCH | Fix, telemetry, docs |

Manifest version ≠ contract version — ver [contracts.md](contracts.md).

---

## 8. Exemplo mínimo (gate testing)

```yaml
apiVersion: capability-orchestrator.io/v2
kind: Provider
metadata:
  name: testing
  version: "0.1.0"
  description: "Test suite execution and reporting"
  owner: agents-team

spec:
  plugin:
    type: cursor-skill
    entrypoint: ".cursor/skills/testing/SKILL.md"

  capabilities:
    - id: testing
      contract: contracts/testing@1.0.0
      type: gate

  interfaces:
    outputs:
      - name: test-report
        schema: evidence/test-report@1.0.0

  runtime:
    cost: low
    subagent_type: shell

  telemetry:
    key: provider.testing

  availability: experimental
  priority: 80
```
