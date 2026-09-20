---
name: adr
description: >
  Architecture Decision Record isolado em docs/adr/NNNN-titulo.md.
  Use quando /adr ou decisão arquitectural mid-cycle. Não use para análise
  estrutural ampla (architect), pacote PRD (prd), plano (planner) nem código.
  Espelho humano — SSOT: `.cursor/skills/adr/SKILL.md`.
---

# ADR — espelho

**SSOT:** `.cursor/skills/adr/SKILL.md`  
**Comando:** `/adr`  
**Capability:** `architecture-decision`  
**PDA roles:** plan  
**Status:** stable (versão 1.0.1)  
**Tipo:** upstream

## Papel

Formaliza **uma** decisão arquitectural já (ou quase) fechada num ADR numerado.  
Não faz review estrutural completo (`/architect`) nem pacote documental (`/prd`).

## DO

- Redigir ADR numerado (contexto, decisão, ≥2 alternativas, consequências)
- Numerar correctamente em `docs/adr/`
- Referenciar `docs/ARCHITECTURE.md` se existir (sem reescrever)
- Gate humano em mudanças de alto impacto

## DO NOT

- Análise estrutural ampla / redesign (→ `/architect`)
- Pacote PRD/API/DATA-MODEL (→ `/prd`)
- Grafo de execução (→ `/planejar`)
- Implementar código

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/adr/SKILL.md` |
| Command | `.cursor/commands/adr.md` |
| Provider | `.cursor/skills/adr/provider.yaml` |
| Contract | `orchestrator/contracts/architecture-decision.yaml` |

Em conflito, a skill ganha sempre.
