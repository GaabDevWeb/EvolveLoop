# Agent change record — `code-reviewer` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | create |
| Breaking | no |
| Decisão | NEW_AGENT |

## Antes

- version: —
- capabilities: —
- responsibilities: (gap Wave C3 — po-review ≠ code review)

## Depois

- version: 1.0.0
- capabilities: `code-review` (gate)
- responsibilities: review adversarial de diff/PR; LGTM|CHANGES_REQUESTED|BLOCKED

## Motivo

Lead matrix Wave C3: materializar Code Reviewer distinto de `po-review`, `testing` e `validator`.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/code-reviewer/SKILL.md` | added |
| `.cursor/skills/code-reviewer/provider.yaml` | added |
| `.cursor/skills/code-reviewer/evals/evals.json` | added |
| `orchestrator/contracts/code-review.yaml` | added |
| `.cursor/commands/code-reviewer.md` | added |
| `.cursor/commands/revisar-codigo.md` | added |
| `Agents/Code-reviewer.md` | added |

## Migration notes

n/a — capability nova.

## Validação

- gates: READY experimental (package completo; runners isolados DEFERRED)
- evals: boundary PO/testing/validator + happy path + missing context
