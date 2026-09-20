# Agent Package checklist — `{{AGENT_ID}}`

## Decisão

- Código: `{{DECISION_CODE}}`
- Justificação: 

## Identidade

| Campo | Valor |
|-------|-------|
| id | `{{AGENT_ID}}` |
| version | `{{VERSION}}` |
| status | draft \| experimental \| stable \| deprecated |
| type | worker \| gate \| upstream \| meta \| orchestration |
| capability | `{{CAPABILITY_ID}}` |
| command | `/{{COMMAND}}` |
| pda_roles | |

## Boundaries

**DO:**

- 

**DO NOT:**

- 

## Capability scope

- required:
- optional:
- forbidden:

## Context (required / optional)

- 

## Output / handoff

- 

## Artefactos

- [ ] `.cursor/skills/{{AGENT_ID}}/SKILL.md`
- [ ] `.cursor/commands/{{COMMAND}}.md`
- [ ] `provider.yaml`
- [ ] `orchestrator/contracts/{{CAPABILITY_ID}}.yaml`
- [ ] `evals/evals.json`
- [ ] `Agents/{{AGENT_MIRROR}}.md`
- [ ] `install-agents-global.sh` SKILLS
- [ ] orquestrar wiring ou DEFERRED

## Gates

Ver [quality-gates.md](../references/quality-gates.md) → `READY` | `NOT_READY`
