# Agent Package — contrato composto (formato existente)

**Não** existe `kind: Agent` no runtime. O contrato formal de um agente EvolveLoop é a composição versionada destes artefactos.

## Composição obrigatória mínima

| Artefacto | Path | Papel |
|-----------|------|-------|
| Skill normativa | `.cursor/skills/<id>/SKILL.md` | SSOT de comportamento |
| Frontmatter metadata | no `SKILL.md` | identidade, versão, capability, tipo, comando |
| Command | `.cursor/commands/<cmd>.md` | gatilho `/` |

## Composição recomendada (pipeline / Tier 1–2)

| Artefacto | Path | Papel |
|-----------|------|-------|
| Provider | `.cursor/skills/<id>/provider.yaml` | registo Capability → Provider |
| Contract | `orchestrator/contracts/<capability>.yaml` | I/O, DoD, evidence, semver |
| Evals | `.cursor/skills/<id>/evals/evals.json` | comportamento |
| Agents espelho | `Agents/<Name>.md` | resumo humano (não SSOT) |
| Install | `scripts/install-agents-global.sh` `SKILLS=(...)` | symlink global |
| Orquestrar | tabelas/fases em `orquestrar` / `ecosystem-v2.md` | integração de ciclo |

## Metadata canónica (SKILL.md)

Seguir o padrão já usado (`database`, `adr`, …):

```yaml
---
name: <kebab-id>
description: >
  WHAT. Use quando … . Não use para … (skills irmãs).
metadata:
  version: "1.0.0"
  status: draft | experimental | stable | deprecated
  capability: <capability-id>          # se worker/gate/upstream
  type: worker | gate | upstream | meta | orchestration
  command: <slash-without-/>
  pda_roles: [exec]                    # papéis PDA típicos
  non_responsibilities: []             # opcional curto; detalhe no corpo
disable-model-invocation: true
---
```

## Mapeamento pedido → existente

| Campo conceptual `agent:` | Onde vive |
|---------------------------|-----------|
| id / version / status | `name` + `metadata.version` + `metadata.status` (+ provider metadata) |
| identity / purpose | `description` + H1 + secção papel |
| role | `metadata.pda_roles` + `GATE_BUNDLE.role` em runtime |
| responsibilities / non_responsibilities | corpo DO / DO NOT (+ description exclusions) |
| inputs / outputs | Contract YAML + secções skill + handoff |
| capabilities required/optional/forbidden | `provider.yaml` capabilities + secção **Capability scope** na skill; forbidden = explícito DO NOT + exclusões |
| context | Contract inputs + «Inputs obrigatórios» |
| policy | Policy Engine / ExecutionPolicy — **não** embutir autoridade no prompt |
| validation / evidence / telemetry | Contract DoD + Evidence Bus + `telemetry.key` |
| dependencies | `provider.yaml` `spec.dependencies` |
| compatibility | Contract `compatible_with` + `runtime_compatibility` |
| routing hints | `provider.yaml` `spec.constraints` (+ `signals` se padrão security registry) — **não** criar Agent Router |

## Princípio Agent vs Capability vs Skill

```text
Skill     = knowledge + workflow (authoring/instruções)
Agent     = identidade de raciocínio/execução = Agent Package acima
Capability= operação agendável (IR / registry)
Provider  = quem implementa a capability (geralmente a skill)
```

**Anti-padrão:** criar «Git Agent» quando o correcto é capability/provider ou tool — ver [duplication-decisions.md](duplication-decisions.md).
