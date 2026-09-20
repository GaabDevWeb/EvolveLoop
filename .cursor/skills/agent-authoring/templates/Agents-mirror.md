---
name: {{AGENT_ID}}

description: >
  {{ONE_LINE_PURPOSE}}. Use quando … . Não use para …
  (apontar skills irmãs). Espelho humano — SSOT: `.cursor/skills/{{AGENT_ID}}/SKILL.md`.
---

# {{TITLE}} — espelho

**SSOT:** `.cursor/skills/{{AGENT_ID}}/SKILL.md`  
**Comando:** `/{{COMMAND}}`  
**Capability:** `{{CAPABILITY_ID}}`  
**PDA roles:** {{PDA_ROLES}}  
**Status:** {{STATUS}} (versão {{VERSION}})

## Papel

{{SHORT_PURPOSE}}

## DO

- 

## DO NOT

- 

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/{{AGENT_ID}}/SKILL.md` |
| Command | `.cursor/commands/{{COMMAND}}.md` |
| Provider | `.cursor/skills/{{AGENT_ID}}/provider.yaml` |

Em conflito, a skill ganha sempre.
