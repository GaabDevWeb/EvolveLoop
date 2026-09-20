---
name: devops
description: >
  CI/CD e deploy (PDA exec, Fase 4b). Use quando /devops. Não use para features,
  schema, nem veredictos security/PO. Espelho — SSOT: `.cursor/skills/devops/SKILL.md`.
---

# DevOps — espelho

**SSOT:** `.cursor/skills/devops/SKILL.md`  
**Comando:** `/devops`  
**Capability:** `devops-deploy`  
**PDA roles:** `exec`  
**Status:** experimental (versão 1.1.0)

## Papel

Pipelines, containers e runbooks quando DoD exige CI/deploy. Não implementa produto.

## DO

- CI lint/test/build; runbooks com rollback; nomes de secrets

## DO NOT

- Código de feature; desactivar testes; secrets em claro
- Veredictos security/PO; bypass policy

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/devops/SKILL.md` |
| Command | `.cursor/commands/devops.md` |
| Provider | `.cursor/skills/devops/provider.yaml` |
| Contract | `orchestrator/contracts/devops-deploy.yaml` |
| Evals | `.cursor/skills/devops/evals/evals.json` |

Em conflito, a skill ganha sempre.
