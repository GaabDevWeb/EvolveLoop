---
name: security

description: >
  Gate de revisão de segurança (Fase 4 /seguranca): registry de specialists,
  evidence L0–L4, veredito binário e veto. Use para threat modeling, hardening,
  regressões de segurança. Não use para PO (po-review), testes (testing) nem
  Code Reviewer. Espelho humano — SSOT: `.cursor/skills/security/SKILL.md`.
---

# Security — espelho

**SSOT:** `.cursor/skills/security/SKILL.md`  
**Comando:** `/seguranca`  
**Capability:** `security-review`  
**PDA roles:** gate, critic  
**Status:** stable (versão 2.1.1)

## Papel

Gate Fase 4 — ameaça, evidence e veto. Não é aceite PO nem review de estilo.

## DO

- Registry → providers → judge → veredito + artifacts
- Bloquear só com L≥2 + crítica/alta confirmada

## DO NOT

- Papel PO / testing / Code Reviewer (Wave C3)
- Hardening sem pedido; bypass safety

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/security/SKILL.md` |
| Command | `.cursor/commands/seguranca.md` |
| Provider | `.cursor/skills/security/provider.yaml` |
| Contract | `orchestrator/contracts/security-review.yaml` |

Em conflito, a skill ganha sempre.
