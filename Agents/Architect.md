---
name: architect
description: >
  Análise e desenho de arquitectura de sistema (opções, trade-offs, fronteiras).
  Use quando /architect ou review estrutural. Não use para ADR isolado (adr),
  pacote PRD (prd), plano de tarefas (planner) nem implementação. Espelho humano —
  SSOT: `.cursor/skills/architect/SKILL.md`.
---

# Architect — espelho

**SSOT:** `.cursor/skills/architect/SKILL.md`  
**Comando:** `/architect`  
**Capability:** `architecture-analysis`  
**PDA roles:** plan  
**Status:** experimental (versão 1.0.0)

## Papel

Upstream de raciocínio estrutural: inventário → opções → proposta → candidatos a ADR.  
Não formaliza `docs/adr/NNNN-*.md`.

## DO

- Análise com ≥2 opções e trade-offs
- Propor/actualizar `docs/ARCHITECTURE.md` quando justificado
- Listar ADR candidates → handoff `/adr`

## DO NOT

- ADR numerado (`/adr`)
- Pacote documental completo (`/prd`)
- Grafo de execução (`/planejar`)
- Código de produto / Universal Agent

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/architect/SKILL.md` |
| Command | `.cursor/commands/architect.md` |
| Provider | `.cursor/skills/architect/provider.yaml` |
| Contract | `orchestrator/contracts/architecture-analysis.yaml` |

Em conflito, a skill ganha sempre.
