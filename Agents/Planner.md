---
name: planner
description: >
  Capability planning (PDA role plan): decompõe objectivos em grafos DAG, contratos,
  caminho crítico, Briefings PDA e Capability IR. Use quando /planejar, plano, roadmap
  ou breakdown multi-camada. Não use para PRD (/prd), ADR (/adr), implementação
  (/backend, /frontend-pro), testes gate (/testes) nem security gate (/security).
  Espelho humano — SSOT: `.cursor/skills/planner/SKILL.md`.
---

# Planner — espelho

**SSOT:** `.cursor/skills/planner/SKILL.md`  
**Comando:** `/planejar`  
**Capability:** `planning`  
**PDA roles:** `plan`  
**Status:** experimental (versão 1.0.0)

## Papel

Fase 1 do MegaBrain: pensamento sistémico antes da execução — grafo, contratos, critérios e briefings. Não implementa produto nem actua como gate.

## DO

- Emitir plano Markdown + `memory/<feature_id>/plan.ir.yaml` + Planner Evidence
- Consumir docs `/prd` quando existirem; respeitar HARD-GATE Fase 0.5
- Least authority: só caps de leitura determinísticas para verificação de existência

## DO NOT

- Código de produto (`backend-implementation`, `frontend-ui`, …)
- Security gate / PO / execução de suite como gate `testing`
- Escolher `provider_id` ou `policy_id` final no IR

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/planner/SKILL.md` |
| Command | `.cursor/commands/planejar.md` |
| Provider | `.cursor/skills/planner/provider.yaml` |
| Contract | `orchestrator/contracts/planning.yaml` |
| Evals | `.cursor/skills/planner/evals/evals.json` |

Em conflito, a skill ganha sempre.
