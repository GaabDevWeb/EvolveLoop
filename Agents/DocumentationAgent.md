---
name: documentation

description: >
  Documentarian Fase 6 (/documentar): Master README, Mermaid, histórico.
  Não use para produto, PO, security ou Code Reviewer. Espelho — SSOT:
  `.cursor/skills/documentation/SKILL.md`.
---

# Documentarian — espelho

**SSOT:** `.cursor/skills/documentation/SKILL.md`  
**Comando:** `/documentar`  
**Capability:** `documentation`  
**PDA roles:** gate, librarian  
**Status:** experimental (versão 1.0.0)

## Papel

Gate Fase 6 — prova pública documental após PO OK.

## DO

- Final Gate `.agent_history.md` → Master README + Mermaid + anti-alucinação

## DO NOT

- Implementar; reabrir PO/security; inventar APIs

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/documentation/SKILL.md` |
| Command | `.cursor/commands/documentar.md` |
| Provider | `.cursor/skills/documentation/provider.yaml` |
| Contract | `orchestrator/contracts/documentation.yaml` |

Em conflito, a skill ganha sempre.
