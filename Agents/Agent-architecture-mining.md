---
name: agent-architecture-mining

description: >
  Engenharia reversa de arquitecturas agentic com evidências e gap analysis
  MegaBrain. Use quando /agent-architecture-mining ou minerar frameworks/
  coding agents/MCP/Skills. Espelho — SSOT:
  .cursor/skills/agent-architecture-mining/SKILL.md. Não use para criar agentes
  (agent-authoring) nem implementar o orchestrator.
---

# Agent Architecture Mining — espelho

**SSOT:** `.cursor/skills/agent-architecture-mining/SKILL.md`  
**Comando:** `/agent-architecture-mining`  
**Capability:** `agent-architecture-mining`  
**Tipo:** meta · PDA: explore  
**Status:** experimental (1.0.0)

## Papel

Laboratório observacional: desmontar sistemas agentic, extrair mecanismos, comparar ao MegaBrain, classificar `ALREADY_PRESENT|ADOPT|ADAPT|PROTOTYPE|DEFER|REJECT` — **sem implementar**.

## DO

- Fontes primárias + labels epistémicos
- Findings / patterns / gaps / hipóteses
- Anti-duplicação face a registries/Evidence/Policy existentes

## DO NOT

- Mutar Agent System / criar agents / rankings / inventar internals

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/agent-architecture-mining/SKILL.md` |
| Command | `.cursor/commands/agent-architecture-mining.md` |
| Provider | `.cursor/skills/agent-architecture-mining/provider.yaml` |
| Principles | `docs/AGENT_ARCHITECTURE_PRINCIPLES.md` |

Em conflito, a skill ganha sempre.
