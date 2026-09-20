# Agent change record — `prd` 1.1.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | update / refactor |
| Breaking | no |
| Decisão | `REFACTOR_EXISTING_AGENT` (+ EXTEND boundaries Architect/adr) |

## Antes

- version: 1.0.0
- capabilities: `business-requirements` (provider apontava contract fantasma)
- responsibilities: pacote docs; boundaries implícitas; sem DO/DO NOT / capability scope / context contract explícitos
- Agents espelho: parcial; evals sem adversarial arquitectura/contexto

## Depois

- version: 1.1.0
- capabilities: `business-requirements` + contract `orchestrator/contracts/business-requirements.yaml@1.0.0`
- responsibilities: Product/Requirements explícito; DO/DO NOT; Relevant Context; handoff arch; failure model
- Agents/Prd.md sincronizado; evals +2 adversarial; command `/prd` alinhado

## Motivo

Lead matrix Wave M1 — completar Agent Package Product/Requirements sem criar segundo agente Product.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/prd/SKILL.md` | modified |
| `.cursor/skills/prd/provider.yaml` | modified |
| `orchestrator/contracts/business-requirements.yaml` | added |
| `.cursor/commands/prd.md` | modified |
| `Agents/Prd.md` | modified |
| `.cursor/skills/prd/evals/evals.json` | modified |
| `.cursor/skills/prd/references/brainstorming-handoff.md` | modified |
| `scripts/install-agents-global.sh` | unchanged (já listava `prd`) |

## Migration notes

Não breaking: contract novo preenche referência já existente `contracts/business-requirements@1.0.0`.

## Validação

- gates: READY (críticos + importantes Tier1/2; runners isolados DEFERRED)
- evals: presentes; execução em runners isolados DEFERRED (protocolo skill-authoring)
