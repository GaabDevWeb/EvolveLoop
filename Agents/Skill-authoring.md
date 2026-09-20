---
name: skill-authoring
description: >
  Fábrica de skills + Evaluator (eval-authoring): evals, runners isolados,
  triggers. Use /skill-authoring. ≠ gates de feature; packages → agent-authoring.
  Espelho — SSOT: `.cursor/skills/skill-authoring/SKILL.md`.
---

# Skill Authoring — espelho (+ Evaluator)

**SSOT:** `.cursor/skills/skill-authoring/SKILL.md`  
**Comando:** `/skill-authoring`  
**Capability:** `eval-authoring`  
**Status:** stable (versão 1.3.0)  
**Specialization:** Evaluator (skills)

## Papel

Criar/melhorar skills com ciclo de evals.  
Evaluator de skills vive aqui — **não** criar agente `evaluator`.

## DO

- Discovery → Draft → Evals isolados → Iterar → Description
- Assertions + comparação with_skill vs baseline

## DO NOT

- Substituir testing / validator / po-review / code-reviewer
- Authoring de Agent Packages → `agent-authoring`
- Observer / telemetria de runtime

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/skill-authoring/SKILL.md` |
| Command | `.cursor/commands/skill-authoring.md` |

Em conflito, a skill ganha sempre.
