# Agent change record — `wiki` 1.2.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | update |
| Breaking | no |
| Decisão | EXTEND_EXISTING_AGENT |

## Antes

- version: 1.1.0
- capabilities: (implícito grounding; sem provider/contract)
- responsibilities: ritual Wiki + template; sem identidade Context Engineer formal

## Depois

- version: 1.2.0
- capabilities: `context-grounding` (+ optional `knowledge.search|inspect`)
- responsibilities: Context Engineer — grounding / context pack; fronteiras Knowledge/Researcher

## Motivo

Wave C1 Lead matrix: Context Engineer → prefer EXTEND wiki se DO couber.  
DO (grounding / context pack) **cabe** integralmente.  
`NEW context-engineer` = `REJECT_DUPLICATE`.  
`knowledge.search|inspect` já no orchestrator — não duplicar RAG bridge.

## DO NOT CREATE

| Id | Código |
|----|--------|
| `context-engineer` | REJECT_DUPLICATE — EXTEND `wiki` |

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/wiki/SKILL.md` | modified |
| `.cursor/skills/wiki/provider.yaml` | added |
| `.cursor/skills/wiki/references/boundaries.md` | added |
| `.cursor/skills/wiki/CHANGE-RECORD.md` | added |
| `.cursor/skills/wiki/CHANGELOG.md` | modified |
| `.cursor/skills/wiki/evals/evals.json` | modified |
| `.cursor/skills/wiki/agents/README.md` | modified |
| `orchestrator/contracts/context-grounding.yaml` | added |
| `Agents/Wiki.md` | added |
| `.cursor/commands/wiki.md` | modified |
| `docs/agent-system-lead-matrix-2026-09-17.md` | modified |

## Migration notes

n/a — capability nova `context-grounding`; bridge `knowledge.*` inalterada.

## Validação

- gates: ver relatório Wave C1
- evals: actualizados; runners isolados DEFERRED
