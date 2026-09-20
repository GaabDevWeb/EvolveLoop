---
name: frontend-pro
description: >
  Frontend especializado: Build/Review/Vision/Fix/Audit. Use quando /frontend-pro
  ou UI web. Não use para backend, database, devops, testing/security/po gates.
  Espelho humano — SSOT: `.cursor/skills/frontend-pro/SKILL.md`.
---

# Frontend Pro — espelho

**SSOT:** `.cursor/skills/frontend-pro/SKILL.md`  
**Comando:** `/frontend-pro`  
**Capabilities:** `frontend-ui` + `frontend-visual-review`  
**PDA roles:** `exec`, `gate` (review/audit)  
**Status:** experimental (versão 1.2.0)

## Papel

Construction frontend especializado (KEEP). Worker UI + gate de evidência visual. Não Universal Developer.

## DO

- Build/Vision com anti-slop; Review/Audit só com screenshot real
- HARD-GATE image-to-code com imagem anexada
- Least authority: só paths/caps de UI

## DO NOT

- `backend-implementation`, `database-schema`, `devops-deploy`
- Gates `testing` / `security-review` / `po-acceptance`
- Veredito visual sem evidência; bypass de policy

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/frontend-pro/SKILL.md` |
| Command | `.cursor/commands/frontend-pro.md` |
| Provider | `.cursor/skills/frontend-pro/provider.yaml` |
| Contracts | `orchestrator/contracts/frontend-ui.yaml`, `frontend-visual-review.yaml` |
| Evals | `.cursor/skills/frontend-pro/evals/evals.json` |

Em conflito, a skill ganha sempre.
