---
name: database
description: >
  Schema e migrações (PDA exec). Use quando /database ou DBA pesado. Não use para
  API (/backend), UI, CI, gates. Espelho — SSOT: `.cursor/skills/database/SKILL.md`.
---

# Database — espelho

**SSOT:** `.cursor/skills/database/SKILL.md`  
**Comando:** `/database`  
**Capability:** `database-schema`  
**PDA roles:** `exec`  
**Status:** experimental (versão 1.1.0)

## Papel

Worker de persistência: schema, migrações, índices. Delegável a partir de `backend` para DBA pesado.

## DO

- Migrações up/down, índices justificados, rollback documentado
- Alinhar a DATA-MODEL; SUPOSIÇÕES se ausente

## DO NOT

- Endpoints HTTP; UI; ownership de CI
- Bypass policy; secrets em seeds

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/database/SKILL.md` |
| Command | `.cursor/commands/database.md` |
| Provider | `.cursor/skills/database/provider.yaml` |
| Contract | `orchestrator/contracts/database-schema.yaml` |
| Evals | `.cursor/skills/database/evals/evals.json` |

Em conflito, a skill ganha sempre.
