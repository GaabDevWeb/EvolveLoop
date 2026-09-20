---
name: testing

description: >
  Gate de validação técnica (Tester): suite scoped, correcção in-scope, veredito
  VERDE|VERMELHO|SUBSTITUTO + evidence. Use com /testes (Fase 3). Não use para
  aceite PO (po-review), security, features, Code Reviewer nem Validator.
  Espelho humano — SSOT: `.cursor/skills/testing/SKILL.md`.
---

# Tester — espelho

**SSOT:** `.cursor/skills/testing/SKILL.md`  
**Comando:** `/testes`  
**Capability:** `testing`  
**PDA roles:** gate  
**Status:** stable (versão 1.2.0)

## Papel

Gate Fase 3 — prova técnica via runner; não é aceite de produto nem review de código/estilo.

## DO

- Boot sequence + suite scoped + evidence JSON
- Fix in-scope (máx. 3) e re-execução
- Vereditos VERDE | VERMELHO | SUBSTITUTO

## DO NOT

- OK de release / papel PO
- Expandir scope fora do brief
- Substituir `security`, `code-reviewer` ou `validator`

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/testing/SKILL.md` |
| Command | `.cursor/commands/testes.md` |
| Provider | `.cursor/skills/testing/provider.yaml` |
| Contract | `orchestrator/contracts/testing.yaml` |

Em conflito, a skill ganha sempre.
