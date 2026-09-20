# Agent change record — `validator` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | create |
| Breaking | no |
| Decisão | NEW_AGENT (thin) |

## Antes

- version: —
- overlap conceptual com testing/po-review sem dono de checklist formal vs disco

## Depois

- version: 1.0.0
- capabilities: `validation` (gate)
- responsibilities: DoD/checklist ↔ artefactos/evidence; PASS|FAIL|INCOMPLETE

## Motivo

Wave C3: gap real entre testing (runners), po-review (UAT) e code-reviewer (diff). Prefer NEW thin vs EXTEND testing/po.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/validator/*` | added |
| `orchestrator/contracts/validation.yaml` | added |
| `.cursor/commands/validator.md` | added |
| `.cursor/commands/validar-artefacto.md` | added |
| `Agents/Validator.md` | added |

## Validação

- gates: READY experimental
- evals: boundaries testing/PO/CR + happy + incomplete
