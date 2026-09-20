# Agent change record — backend 1.2.0 (Wave C2)

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | update |
| Breaking | no |
| Decisão | EXTEND_EXISTING_AGENT |

## Antes

- version: 1.1.0
- capabilities: `backend-implementation`
- responsibilities: implement only (sem mode refactor formal)
- modes: implícito implement

## Depois

- version: 1.2.0
- capabilities: `backend-implementation` @1.2.0
- responsibilities: implement + **mode `refactor`** (papel Refactorer)
- modes: `[implement, refactor]`

## Motivo

Wave C2: Refactorer → EXTEND `backend` + mode; **NÃO** NEW `refactorer` agent.

## DO NOT CREATE

| Id | Código |
|----|--------|
| `refactorer` / `Agents/Refactorer.md` | REJECT_DUPLICATE — mode no `backend` |

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/backend/SKILL.md` | modified |
| `.cursor/skills/backend/provider.yaml` | modified |
| `.cursor/skills/backend/evals/evals.json` | modified |
| `.cursor/skills/backend/agent-change-record.md` | modified |
| `orchestrator/contracts/backend-implementation.yaml` | modified |
| `orchestrator/providers/backend/provider.yaml` | modified |
| `.cursor/commands/backend.md` | modified |
| `Agents/backend.md` | modified |

## Migration notes

n/a — minor bump; `compatible_with` inclui 1.0.x–1.2.x. Callers podem enviar `mode: refactor` no briefing/input.

## Validação

- gates: READY experimental
- evals: +2 (happy refactor + adversarial greenfield-as-refactor); runners isolados DEFERRED
