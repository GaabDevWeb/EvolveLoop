# Especificações — Framework de Orquestração v2

Documentos normativos e implementáveis. **Congelados** em conjunto com [ecosystem-v2.md](../ecosystem-v2.md) (referência arquitectural).

**Contratos v2.1 (interfaces estáveis):** [contracts/README.md](../contracts/README.md) — ciclo de vida, evidence universal, executor. Governança: [ARCHITECTURAL-PRINCIPLES.md](../ARCHITECTURAL-PRINCIPLES.md).

| # | Documento | Responde |
|---|-----------|----------|
| 1 | [runtime.md](runtime.md) | Qual é o algoritmo do loop de execução? |
| 2 | [capability-ir.md](capability-ir.md) | Qual é o formato oficial do Task Graph (IR)? |
| 3 | [execution-policies.md](execution-policies.md) | Quem decide retries, gates obrigatórios, estratégia? |
| 4 | [registry.md](registry.md) | Como o Registry escolhe providers (estratégias, scores)? |
| 5 | [provider-manifest.md](provider-manifest.md) | Como declarar um provider (`provider.yaml`)? |
| 6 | [plugins.md](plugins.md) | Como plugins exportam providers? |
| 7 | [contracts.md](contracts.md) | Como versionar inputs, outputs, DoD? |
| 8 | [events.md](events.md) | Quais eventos o runtime emite/consome? |
| 9 | [evidence.md](evidence.md) | Qual é o schema de evidência por nó? |
| 10 | [knowledge-memory.md](knowledge-memory.md) | Knowledge vs Memory — dois níveis distintos |
| 11 | [telemetry.md](telemetry.md) | Schema de métricas e agregação |
| 12 | [interfaces.md](interfaces.md) | APIs internas: Scheduler, Provider, Gate, Plugin |

## Hierarquia de leitura

```
ARCHITECTURAL-PRINCIPLES.md  ← governança (regras invioláveis)
        ↓
ecosystem-v2.md              ← PORQUÊ e componentes (arquitectura)
        ↓
contracts/                   ← interfaces estáveis v2.1
        ↓
specs/runtime.md             ← COMO executa (algoritmo)
        ↓
specs/capability-ir.md       ← O QUE o Planner produz
specs/execution-policies     ← COMO comportar-se
specs/registry.md            ← QUEM executa cada capability
        ↓
specs/*.md                   ← detalhe implementável por domínio
```

## Versionamento das specs

| Campo | Valor |
|-------|-------|
| Spec version | `2.0.0` |
| Compatível com | ecosystem-v2 (2026-06-30) |
| Breaking changes | Incremento MAJOR; documentar em CHANGELOG da pasta specs |

## Implementação de referência

| Artefacto | Path |
|-----------|------|
| **Execution Engine (TypeScript)** | `Cursor/orchestrator/` |
| Provider manifests | `Cursor/orchestrator/providers/*/provider.yaml` |
| Policies | `Cursor/orchestrator/policies/*.yaml` |
| Testes | `Cursor/orchestrator/tests/` |

Paths previstos no repo de trabalho (runtime):

```
capability-registry.yaml    ← gerado a partir de provider.yaml
providers/*/provider.yaml   ← manifests individuais
knowledge/                  ← permanente
memory/                     ← contextual por feature
telemetry/events/           ← event log append-only
.agent_history.md           ← log operacional (não spec)
```
