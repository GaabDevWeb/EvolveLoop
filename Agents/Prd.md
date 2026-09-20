---
name: prd
description: >
  Product/Requirements upstream — pacote docs em docs/ antes de código.
  Espelho humano — SSOT: `.cursor/skills/prd/SKILL.md`.
---

# PRD — Product / Requirements (espelho)

**SSOT:** `.cursor/skills/prd/SKILL.md`  
**Comando:** `/prd`  
**Capability:** `business-requirements`  
**PDA roles:** `plan`  
**Status:** stable (versão 1.1.0)  
**Tipo:** upstream · Fase 0.5 EvolveLoop

## Papel

Define *o quê* e *para quem* via pacote documental; HARD-GATE humano antes de `/planejar`.

## DO

- Capturar intenção de produto e produzir pacote (`full-package` | `update-spec` | `delta-only`)
- RF/RNF numerados, cross-check, gate de aprovação, handoff ao planner
- Relevant Context only

## DO NOT

- Implementar código / invocar workers de construção
- Decisões arquitecturais sozinho → handoff `/adr` ou Architect
- Planear tarefas (planner) ou saltar gate humano

## Capability scope

- **required:** `business-requirements`
- **optional:** `filesystem.read|search`, `project.inspect`, `git.inspect`, `knowledge.search`
- **forbidden:** implementation/planning/gates de construção; autoridade final `architecture-decision` em pedidos ADR-only

## Pacote (6 artefactos)

- `docs/prd/YYYY-MM-DD-<feature>.md`
- `docs/CONTRIBUTING.md`
- `docs/adr/NNNN-<titulo>.md` (*proposed* se autoridade pendente)
- `docs/API_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA-MODEL.md`

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/prd/SKILL.md` |
| Command | `.cursor/commands/prd.md` |
| Provider | `.cursor/skills/prd/provider.yaml` |
| Contract | `orchestrator/contracts/business-requirements.yaml` |

Em conflito, a skill ganha sempre.

## Fluxo

```
brainstorming? → prd → grill-me? → planner → código
```
