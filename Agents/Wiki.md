---
name: wiki
description: >
  Context Engineer — grounding / context pack Wiki. Use /wiki. Não use para
  mem/promote (wiki-mem) nem research web. Espelho humano — SSOT:
  `.cursor/skills/wiki/SKILL.md`.
---

# Wiki (Context Engineer) — espelho

**SSOT:** `.cursor/skills/wiki/SKILL.md`  
**Comando:** `/wiki`  
**Capability:** `context-grounding`  
**PDA roles:** explore, plan  
**Status:** experimental (versão 1.2.0)  
**Specialization:** Context Engineer

## Papel

Injectar Relevant Context (pack + scout/search) da vault; não implementar produto; não promover episódico.

## DO

- Ritual `ground.sh` + template Fontes/Contratos/GAPs/Método/Handoff
- Relevant Context > Maximum Context
- GAP explícito se wiki vazia / CLI down

## DO NOT

- Package novo `context-engineer`
- `/mem` / promote librarian
- Researcher web
- `wiki vibe` como coding brain

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/wiki/SKILL.md` |
| Command | `.cursor/commands/wiki.md` |
| Provider | `.cursor/skills/wiki/provider.yaml` |
| Contract | `orchestrator/contracts/context-grounding.yaml` |

Em conflito, a skill ganha sempre.
