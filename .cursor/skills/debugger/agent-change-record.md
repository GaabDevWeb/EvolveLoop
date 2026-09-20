# Agent change record — `debugger` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | create (package) / EXTEND Tier3 |
| Breaking | no |
| Decisão | EXTEND_EXISTING_AGENT |

## Antes

- version: n/a (só Tier3 `global-skills/systematic-debugging`)
- capabilities: implícito / `systematic-debug` em docs
- responsibilities: Iron Law + 4 phases (skill global, sem provider/contract/command pipeline)

## Depois

- version: 1.0.0
- capabilities: `debug`
- responsibilities: Debugger Agent Package — absorve DO do Tier3; pipeline completo

## Motivo

Wave C2 Lead matrix: Debugger → EXTEND systematic-debugging → skill id `debugger`.  
**DO NOT CREATE** agente paralelo com o mesmo DO (`REJECT_DUPLICATE`).

## DO NOT CREATE

| Id | Código |
|----|--------|
| segundo agente «Systematic Debugger» / `systematic-debugging` pipeline | REJECT_DUPLICATE — EXTEND via `debugger` |

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/debugger/SKILL.md` | added |
| `.cursor/skills/debugger/provider.yaml` | added |
| `.cursor/skills/debugger/references/*` | added (symlinks → Tier3) |
| `.cursor/skills/debugger/evals/evals.json` | added |
| `.cursor/skills/debugger/agent-change-record.md` | added |
| `.cursor/commands/debugger.md` | added |
| `.cursor/commands/debug.md` | added (alias) |
| `Agents/Debugger.md` | added |
| `orchestrator/contracts/debug.yaml` | added |
| `orchestrator/providers/debugger/provider.yaml` | added |
| `scripts/install-agents-global.sh` | modified |
| `global-skills/systematic-debugging/PACKAGE-NOTE.md` | added |

## Migration notes

Tier3 `systematic-debugging` permanece como fonte DO + técnicas. Runtime/pipeline usa `debugger` + capability `debug`. Docs que citam `systematic-debug` → preferir `debug` / `/debugger` (DEFERRED refresh MegaBrain-Ecosystem se Lead pedir).

## Validação

- gates: READY experimental (runners isolados DEFERRED)
- evals: 7 casos (happy + adversarial); runners isolados DEFERRED
