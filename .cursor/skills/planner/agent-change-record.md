# Agent change record — `planner` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | refactor |
| Breaking | no |
| Decisão | REFACTOR_EXISTING_AGENT |

## Antes

- version: (ausente no frontmatter)
- capabilities: implícita `planning` (docs) sem `provider.yaml` / contract YAML no orchestrator
- responsibilities: corpo normativo rico; sem DO/DO NOT / capability scope / failure model formais de Agent Package
- evals: ausentes
- Agents espelho: cópia integral desactualizada (`Orquestrador-v2.md`)

## Depois

- version: 1.0.0 (`experimental`)
- capabilities: `planning` (required) + optional deterministic read/knowledge; forbidden impl/gates
- responsibilities: Boundaries DO/DO NOT + PDA `plan` + handoff `[ENTREGA CONSOLIDADA]`
- package: provider.yaml, `orchestrator/contracts/planning.yaml`, evals, command `/planejar`, install (já listado)

## Motivo

Lead Matrix Wave M1 — completar Agent Package sem arquitectura paralela; least authority alinhada a DeterministicProvider.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/planner/SKILL.md` | modified |
| `.cursor/skills/planner/provider.yaml` | added |
| `orchestrator/contracts/planning.yaml` | added |
| `.cursor/skills/planner/evals/evals.json` | added |
| `.cursor/commands/planejar.md` | modified |
| `Agents/Planner.md` | modified (espelho fino) |
| `.cursor/skills/planner/agent-change-record.md` | added |
| `scripts/install-agents-global.sh` | unchanged (já tinha `planner`) |

## Migration notes

Não breaking: consumidores continuam `/planejar` + IR em `memory/<feature_id>/plan.ir.yaml`. Contract novo `planning@1.0.0` formaliza I/O já descrito em `orquestrar/references/contracts/planner.md`.

## Validação

- gates: READY (críticos); runners isolados DEFERRED
- evals: 8 casos (happy/boundary/adversarial/edge/minimal/integration) — execução em runners isolados
