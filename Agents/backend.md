---
name: backend
description: >
  Backend worker (PDA exec): APIs, domínio, persistência leve e mode refactor
  de código servidor existente. Use quando /backend ou Fase 2 MegaBrain. Não use
  para UI (/frontend-pro), DBA pesado (/database), CI (/devops), gates
  testing/security/po, nem root-cause (/debugger). Espelho humano — SSOT:
  `.cursor/skills/backend/SKILL.md`.
---

# Backend — espelho

**SSOT:** `.cursor/skills/backend/SKILL.md`  
**Comando:** `/backend`  
**Capability:** `backend-implementation`  
**Modes:** `implement` (default) | `refactor`  
**PDA roles:** `exec`  
**Status:** experimental (versão 1.2.0)

## Papel

Fase 2 do MegaBrain: implementação **ou** refactor de servidor (API + domínio).  
O papel **Refactorer** da matriz = mode `refactor` deste package — **sem** agente separado.

## DO

- APIs tipadas, validação na borda, domínio isolado, handoff para `/testes`
- Refactor com preservação de comportamento (mode `refactor`)
- Defesa mínima na borda sem substituir `/seguranca`
- Least authority: só caps necessárias à execução backend

## DO NOT

- UI (`frontend-ui`) / visual review
- Schema/DBA pesado → `/database`; CI/deploy → `/devops`
- Veredictos `testing` / `security-review` / `po-acceptance`
- Greenfield mascarado como refactor
- Bypass de Policy Engine

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/backend/SKILL.md` |
| Command | `.cursor/commands/backend.md` |
| Provider | `.cursor/skills/backend/provider.yaml` |
| Contract | `orchestrator/contracts/backend-implementation.yaml` |
| Evals | `.cursor/skills/backend/evals/evals.json` |

Em conflito, a skill ganha sempre.
