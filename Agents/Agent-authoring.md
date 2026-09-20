---
name: agent-authoring

description: >
  Fábrica e manutenção de agentes MegaBrain (Agent Packages) + Evaluator de
  packages. Use /agent-authoring. Espelho — SSOT:
  .cursor/skills/agent-authoring/SKILL.md. Skills isoladas → skill-authoring;
  features → MegaBrain. Não criar agente evaluator nem Observer.
---

# Agent Authoring — espelho

**SSOT:** `.cursor/skills/agent-authoring/SKILL.md`  
**Comando:** `/agent-authoring`  
**Capability:** `agent-authoring`  
**Tipo:** meta  
**Status:** experimental (versão 1.1.0)  
**Specialization:** Agent Author | Evaluator (packages)

## Papel

Criar e manter **Agent Packages** consistentes com Provider, Contract, Policy Engine, Evidence Bus e PDA roles — sem arquitectura paralela.  
Evaluator de packages = op `evaluate` + `evals/` — **REJECT_DUPLICATE** de agente `evaluator`.

## DO

- Auditar o sistema antes de escrever
- Detectar duplicação / overload / agent desnecessário
- Gerar skill + command + provider/contract + evals + install wiring
- Reportar gates `READY` | `NOT_READY` e debt
- Avaliar packages (Evaluator meta)

## DO NOT

- Inventar Agent Registry / Evidence Bus / Policy Engine novos
- Absorver skill-authoring (Evaluator de skills), orquestrar ou coding de produto
- Materializar automaticamente o catálogo de 19 agentes
- Criar Observer agent (telemetria runtime)

## Integração

| Artefacto | Path |
|-----------|------|
| Skill | `.cursor/skills/agent-authoring/SKILL.md` |
| Command | `.cursor/commands/agent-authoring.md` |
| Provider | `.cursor/skills/agent-authoring/provider.yaml` |
| Contract | `orchestrator/contracts/agent-authoring.yaml` |

Em conflito, a skill ganha sempre.
