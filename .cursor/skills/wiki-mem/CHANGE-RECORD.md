# Agent change record — `wiki-mem` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | update (package completeness) |
| Breaking | no |
| Decisão | EXTEND_EXISTING_AGENT |

## Antes

- version: (sem semver formal)
- capabilities: episódico + fila promote (implícito)
- responsibilities: mem search/digest; promote parcialmente documentado

## Depois

- version: 1.0.0
- capabilities: `knowledge-promote`
- responsibilities: Knowledge specialization — episódico + librarian promote; Researcher ≠ Knowledge

## Motivo

Wave C1: Knowledge → EXTEND wiki/wiki-mem OU NEW thin `knowledge`.  
NEW thin só para “grounding interno” **duplicaria** Context Engineer (`wiki`).  
Promote/librarian cabe em `wiki-mem`.  
`knowledge.search|inspect` já deterministic — `AGENT_UNNECESSARY` como agente search.

## DO NOT CREATE

| Id | Código |
|----|--------|
| `knowledge` (Agent Package novo) | REJECT_DUPLICATE — EXTEND `wiki-mem`; search = capability existente |

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/wiki-mem/SKILL.md` | modified |
| `.cursor/skills/wiki-mem/provider.yaml` | added |
| `.cursor/skills/wiki-mem/CHANGE-RECORD.md` | added |
| `.cursor/skills/wiki-mem/evals/evals.json` | added |
| `orchestrator/contracts/knowledge-promote.yaml` | added |
| `Agents/Wiki-mem.md` | added |
| `.cursor/commands/mem.md` | modified |

## Migration notes

n/a — capability nova `knowledge-promote`; não altera `knowledge.search`.

## Validação

- gates: ver relatório Wave C1
- evals: criados; runners isolados DEFERRED
