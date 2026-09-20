---
name: validator
description: >
  Gate fino DoD/evidence (capability validation). Use /validator ou
  /validar-artefacto. ≠ testing, ≠ po-review, ≠ code-reviewer. Espelho — SSOT:
  `.cursor/skills/validator/SKILL.md`.
---

# Validator — espelho

**SSOT:** `.cursor/skills/validator/SKILL.md`  
**Comando:** `/validator` (alias `/validar-artefacto`)  
**Capability:** `validation`  
**PDA roles:** gate  
**Status:** experimental (versão 1.0.0)  
**Specialization:** Validator

## Papel

Checklist DoD formal vs artefactos no disco.  
PASS ≠ OK de PO. Validator ≠ Tester ≠ Code Reviewer.

## DO

- Itens DoD ↔ evidence observável
- Veredito PASS|FAIL|INCOMPLETE
- Gaps explícitos

## DO NOT

- Correr suite / fix de testes
- Aceite PO / UAT
- Code review / patches

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/validator/SKILL.md` |
| Command | `.cursor/commands/validator.md` (+ `validar-artefacto.md`) |
| Provider | `.cursor/skills/validator/provider.yaml` |
| Contract | `orchestrator/contracts/validation.yaml` |

Em conflito, a skill ganha sempre.
