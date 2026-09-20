# Auditoria pré-authoring — agent-architecture-mining

**Data:** 2026-09-18  
**Operação:** DISCOVER (agent-authoring) antes de `NEW_AGENT`

## Decisão de duplicação

| Código | `NEW_AGENT` |
|--------|-------------|
| Justificação | Nenhuma skill com capability/id `agent-architecture-mining`. Fronteiras claras vs irmãs. |

| Skill existente | Overlap? | Diferença |
|-----------------|----------|-----------|
| `architect` | parcial tema | Desenha **nossa** arquitectura de produto; não minera sistemas agentic externos |
| `researcher` | parcial fontes | Pesquisa externa genérica; sem gap MegaBrain / princípios agentic obrigatórios |
| `technical-library-dossier` | parcial docs | Dossiê de **biblioteca** (38 secções); não ALREADY_PRESENT vs Evidence/Registry |
| `agent-authoring` | handoff | Implementa packages; mining **não** implementa |

## Convenções reutilizadas

| Convenção | Path |
|-----------|------|
| Skill package | `.cursor/skills/<id>/` |
| References / templates / evals | padrão skill-authoring / agent-authoring |
| Provider + Contract | `provider.yaml` + `orchestrator/contracts/` |
| Command + Agents espelho | `.cursor/commands/` + `Agents/` |
| Install | `scripts/install-agents-global.sh` |
| Docs vivos | `docs/` (não novo registry) |

## Mecanismos MegaBrain (não duplicar)

Capability Registry, Provider manifests, Policy Engine, Orchestrator/Runtime, Evidence Bus, Knowledge/RAG, Memory, Telemetry, Evals, Capability IR, Skills, hooks, persistence — mining deve emitir `ALREADY_PRESENT` quando aplicável.

## Gaps fora de escopo (finding only)

- Bridge tipado MCP tool → Capability IR  
- Princípios ainda 0 (bootstrap)  
- Wiring tabela orquestrar § agents — DEFERRED  

**Nenhuma alteração a componentes externos à skill** nesta tarefa (excepto install list + contract sidecar necessários ao Agent Package).
