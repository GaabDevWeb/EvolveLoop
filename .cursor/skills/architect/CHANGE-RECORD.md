# Agent change record — `architect` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | create |
| Breaking | no |
| Decisão | NEW_AGENT |

## Antes

- version: — (não existia)
- capabilities: —
- responsibilities: cobertas parcialmente por `adr` (só ADR) e `prd` (ARCHITECTURE no pacote)

## Depois

- version: 1.0.0
- capabilities: `architecture-analysis`
- responsibilities: análise/desenho estrutural; handoff para adr/prd/planner

## Motivo

Lead matrix: ADR ≠ full architecture analysis. `adr` permanece ADRs only.
`EXTEND`/`REFACTOR` adr sobrecarregaria `architecture-decision` e o trigger `/adr`.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/architect/SKILL.md` | added |
| `.cursor/skills/architect/provider.yaml` | added |
| `.cursor/skills/architect/references/boundaries.md` | added |
| `.cursor/skills/architect/evals/evals.json` | added |
| `.cursor/commands/architect.md` | added |
| `orchestrator/contracts/architecture-analysis.yaml` | added |
| `Agents/Architect.md` | added |
| `scripts/install-agents-global.sh` | modified |
| `.cursor/skills/orquestrar/SKILL.md` | modified |
| `.cursor/skills/adr/SKILL.md` | modified (fronteira) |

## Migration notes

n/a — capability nova; `architecture-decision` inalterada no provider `adr`.

## Validação

- gates: ver relatório agent-authoring
- evals: criados; runners isolados DEFERRED
