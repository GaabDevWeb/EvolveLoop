---
name: wiki-mem
description: >
  Knowledge / librarian — memória episódica + promote controlado. Use /mem.
  Não use para grounding canónico (/wiki) nem research web. Espelho humano —
  SSOT: `.cursor/skills/wiki-mem/SKILL.md`.
---

# Wiki Mem (Knowledge) — espelho

**SSOT:** `.cursor/skills/wiki-mem/SKILL.md`  
**Comando:** `/mem`  
**Capability:** `knowledge-promote`  
**PDA roles:** librarian  
**Status:** experimental (versão 1.0.0)  
**Specialization:** Knowledge

## Papel

Continuidade de sessão + promoção `promote-queue` → `{Projeto}/log.md` ± `wiki/`.  
Nunca `raw/`. Researcher ≠ este papel.

## DO

- search / LATEST / digest
- librarian promote da fila
- redireccionar contratos canónicos para `/wiki`

## DO NOT

- Package novo `knowledge`
- Substituir Context Engineer
- Research web
- Escrever `raw/`

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/wiki-mem/SKILL.md` |
| Command | `.cursor/commands/mem.md` |
| Provider | `.cursor/skills/wiki-mem/provider.yaml` |
| Contract | `orchestrator/contracts/knowledge-promote.yaml` |
| Hooks | `.cursor/hooks/wiki-mem/` |

Em conflito, a skill ganha sempre.
