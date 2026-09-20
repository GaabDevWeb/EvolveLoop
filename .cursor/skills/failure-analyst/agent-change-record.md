# Agent change record — `failure-analyst` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | create |
| Breaking | no |
| Decisão | NEW_AGENT |

## Antes

- version: —
- capabilities: —
- responsibilities: —

## Depois

- version: 1.0.0
- capabilities: `failure-analysis`
- responsibilities: classificar falhas do Agent System; PDA explore/critic; sem fix

## Motivo

Wave C2 Investigation — Lead matrix: CREATE `failure-analyst` (decisão fechada).  
Explicitamente ≠ Debugger; ≠ implementar remediação.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/failure-analyst/SKILL.md` | added |
| `.cursor/skills/failure-analyst/provider.yaml` | added |
| `.cursor/skills/failure-analyst/evals/evals.json` | added |
| `.cursor/commands/failure-analyst.md` | added |
| `.cursor/commands/analisar-falha.md` | added |
| `orchestrator/contracts/failure-analysis.yaml` | added |
| `Agents/Failure-analyst.md` | added |
| `scripts/install-agents-global.sh` | modified |
| `.cursor/skills/orquestrar/SKILL.md` | modified (tabela) |

## Migration notes

N/A — capability nova.

## Validação

- gates: READY experimental (package completo; runners DEFERRED)
- evals: criados; execução isolada DEFERRED
