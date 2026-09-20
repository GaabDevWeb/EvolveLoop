---
name: debugger
description: >
  Diagnóstico sistemático (root cause antes de fix). Use quando /debugger, /debug
  ou após retries de /testes. Não use para greenfield, refactor estrutural
  (/backend mode:refactor), nem gates testing/security. Espelho humano — SSOT:
  `.cursor/skills/debugger/SKILL.md`.
---

# Debugger — espelho

**SSOT:** `.cursor/skills/debugger/SKILL.md`  
**Comando:** `/debugger` (alias `/debug`)  
**Capability:** `debug`  
**PDA roles:** `explore`, `exec`  
**Status:** experimental (versão 1.0.0)  
**Fonte DO:** `global-skills/systematic-debugging` (EXTEND → package; REJECT_DUPLICATE paralelo)

## Papel

Investigation: Phase 1–4 (root cause → pattern → hipótese → fix mínimo). Não é gate.

## DO

- Iron Law: investigar causa antes de patch
- Evidência, uma hipótese, teste que falha antes do fix
- Handoff estruturado

## DO NOT

- Quick fix / thrashing / múltiplos patches sem isolar
- Veredictos `testing` / `security-review`
- Greenfield ou refactor estrutural (`/backend`)

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/debugger/SKILL.md` |
| Command | `.cursor/commands/debugger.md` (+ `debug.md`) |
| Provider | `.cursor/skills/debugger/provider.yaml` |
| Contract | `orchestrator/contracts/debug.yaml` |
| Evals | `.cursor/skills/debugger/evals/evals.json` |
| Tier3 source | `global-skills/systematic-debugging/` |

Em conflito, a skill ganha sempre.
