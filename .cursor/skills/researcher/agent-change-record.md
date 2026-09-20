# Agent change record — `researcher` 1.0.0

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
- capabilities: `research`
- responsibilities: pesquisa externa, source_policy, anti-alucinação; PDA explore

## Motivo

Wave C2 Investigation — Lead matrix: CREATE `researcher` (decisão fechada).  
Knowledge (`wiki-mem`) e Context Engineer (`wiki`) permanecem separados.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/researcher/SKILL.md` | added |
| `.cursor/skills/researcher/provider.yaml` | added |
| `.cursor/skills/researcher/evals/evals.json` | added |
| `.cursor/commands/pesquisar.md` | added |
| `.cursor/commands/research.md` | added |
| `orchestrator/contracts/research.yaml` | added |
| `Agents/Researcher.md` | added |
| `scripts/install-agents-global.sh` | modified |
| `.cursor/skills/orquestrar/SKILL.md` | modified (tabela) |

## Migration notes

N/A — capability nova.

## Validação

- gates: READY experimental (package completo; runners DEFERRED)
- evals: criados; execução isolada DEFERRED
