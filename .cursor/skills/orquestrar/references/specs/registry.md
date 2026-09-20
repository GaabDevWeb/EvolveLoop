# Capability Registry

**Normativo.** Base de dados viva do ecossistema — não YAML estático passivo.

Relacionado: [provider-manifest.md](provider-manifest.md), [runtime.md](runtime.md), [telemetry.md](telemetry.md)

---

## 1. Evolução

| v2.0 (passivo) | v2.1 (activo) |
|----------------|---------------|
| YAML editado à mão | Gerado de `provider.yaml` + telemetria |
| Selecção por `priority` | Selecção por **estratégia** |
| Sem histórico | `last_success`, `average_duration`, `quality_score` |
| Estático | Actualizado por eventos runtime |

---

## 2. Modelo de dados

```yaml
# capability-registry.yaml (gerado + curado)
apiVersion: capability-orchestrator.io/v2
kind: CapabilityRegistry
metadata:
  generated_at: "2026-06-30T12:00:00Z"
  generator: registry-builder/1.0.0

capabilities:
  frontend-ui:
    schema_version: contracts/frontend-ui@2.0.0
    providers:
      - id: frontend-pro
        plugin: cursor-skill
        manifest: providers/frontend-pro/provider.yaml
        priority: 100
        cost: medium                    # low | medium | high
        quality_score: 0.92             # 0.0–1.0 — calculado
        availability: active            # active | deprecated | experimental
        version: "1.1.0"
        telemetry:
          total_runs: 847
          success_rate: 0.94
          average_duration_ms: 720000
          last_success: "2026-06-30T11:45:00Z"
          last_failure: "2026-06-29T09:12:00Z"
          rework_rate: 0.08
        constraints:
          stack: [react, next, html, typescript]
        fallbacks:
          - id: frontend-design
            priority: 50
            quality_score: 0.65
        modes: [build, review, vision, fix, audit]
```

---

## 3. Estratégias de selecção

O Scheduler **não** escolhe só por `priority`. A `ExecutionPolicy` define `provider_strategy`:

| Strategy | Algoritmo | Uso |
|----------|-----------|-----|
| `stable` | Maior `success_rate` × `quality_score`; exclui `experimental` | Produção default |
| `highest_quality` | Max `quality_score`; desempate `success_rate` | `high-reliability` |
| `fastest` | Min `average_duration_ms`; min `success_rate` ≥ 0.7 | `rapid-prototype` |
| `cheapest` | Min `cost`; desempate `priority` | `cost-optimized` |
| `experimental` | Providers `availability: experimental`; fallback `stable` | Eval de providers |
| `priority` | Max `priority` (legado) | Compatibilidade |

### Pseudocódigo

```python
def select(capability, strategy, constraints, node) -> Provider:
    candidates = registry.providers(capability)
    candidates = filter_constraints(candidates, constraints)
    candidates = filter_availability(candidates, strategy)

    if not candidates:
        return discover_via_provider_discovery(capability)

    ranked = rank(candidates, strategy)
    return ranked[0]

def rank(candidates, strategy):
    match strategy:
        case "highest_quality":
            return sorted(candidates, key=lambda p: (-p.quality_score, -p.success_rate))
        case "fastest":
            return sorted(candidates, key=lambda p: (p.average_duration_ms, -p.success_rate))
        case "cheapest":
            cost_order = {"low": 0, "medium": 1, "high": 2}
            return sorted(candidates, key=lambda p: (cost_order[p.cost], -p.priority))
        case "experimental":
            exp = [p for p in candidates if p.availability == "experimental"]
            return exp or rank(candidates, "stable")
        case "stable" | "priority":
            return sorted(candidates, key=lambda p: (-p.success_rate * p.quality_score, -p.priority))
```

---

## 4. Quality Score

Score composto recalculado por job batch ou após N eventos:

```
quality_score =
    0.40 × success_rate +
    0.25 × (1 - rework_rate) +
    0.20 × evidence_completeness +
    0.10 × gate_pass_rate +
    0.05 × kb_positive_hits
```

| Componente | Fonte |
|------------|-------|
| `success_rate` | `NodeCompleted / (NodeCompleted + NodeFailed)` |
| `rework_rate` | Nós reagendados após satisfied |
| `evidence_completeness` | Evidence schema validation |
| `gate_pass_rate` | Gates passed first attempt |
| `kb_positive_hits` | KnowledgeHit que evitou falha |

---

## 5. Actualização em runtime

Registry é **event-driven** ([events.md](events.md)):

| Evento | Actualização |
|--------|--------------|
| `NodeCompleted` | `total_runs++`, `last_success`, recalc duration |
| `NodeFailed` | `last_failure`, `success_rate` |
| `RetryScheduled` | `rework_rate` |
| `GateRejected` | impacto em `gate_pass_rate` do provider upstream |
| `ProviderSelected` | log para `capability.usage` |

Persistência:

```
registry/
├── capability-registry.yaml      # snapshot gerado
├── capability-registry.json      # cache runtime
└── telemetry/provider-stats/     # dados brutos por provider
    └── frontend-pro.json
```

---

## 6. Registry Builder

CLI futuro — agrega manifests + telemetria:

```bash
registry-builder build \
  --manifests providers/*/provider.yaml \
  --telemetry telemetry/events/ \
  --output capability-registry.yaml
```

| Input | Output |
|-------|--------|
| `provider.yaml` × N | Entradas estáticas |
| Event log | Métricas dinâmicas |
| Curadoria manual | `quality_score` override, deprecation |

---

## 7. Fallback chain

```
select(capability) → primary
    ↓ fail ou unavailable
fallback[0] → fallback[1] → ...
    ↓ exhausted
provider-discovery (find-skills)
    ↓
register new provider OR block
```

Emitir `ProviderFallbackUsed` quando activar fallback.

---

## 8. Schema Registry (contratos)

Capabilities referenciam schemas versionados:

```yaml
capabilities:
  frontend-ui:
    schema_version: contracts/frontend-ui@2.0.0
    compatible_with:
      - contracts/frontend-ui@1.x
```

Ver [contracts.md](contracts.md).

---

## 9. API (interfaces)

```yaml
RegistryClient:
  get_capability(id) -> CapabilityEntry
  list_providers(capability) -> Provider[]
  select(capability, strategy, constraints) -> Provider
  record_success(provider_id, run) -> void
  record_failure(provider_id, run) -> void
  rebuild() -> CapabilityRegistry              # offline
```
