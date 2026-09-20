# Agent change record — `adr` 1.0.1

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | refactor |
| Breaking | no |
| Decisão | REFACTOR_EXISTING_AGENT |

## Antes

- version: 1.0.1 (skill) / 1.0.0 (provider)
- capabilities: `architecture-decision` (contract ref órfão)
- responsibilities: ADR-only (fronteira architect já presente)

## Depois

- version: 1.0.1 (skill + provider)
- capabilities: `architecture-decision` → `contracts/architecture-decision@1.0.0` (ficheiro real)
- responsibilities: inalteradas — ADR-only; **não** expandido para Architect

## Motivo

Fechar debt de package: contract MISSING, Agents espelho PARTIAL, provider ref alinhado.

## Artefactos tocados

| Path | Acção |
|------|-------|
| `orchestrator/contracts/architecture-decision.yaml` | added |
| `Agents/Adr.md` | added |
| `.cursor/skills/adr/provider.yaml` | modified (versão 1.0.1 + schema output) |
| `.cursor/skills/adr/SKILL.md` | modified (`pda_roles: [plan]` only) |

## Migration notes

n/a — contract novo `@1.0.0` casa com ref já existente no provider.

## Validação

- gates: READY (debt pedido fechado)
- evals: existentes; runners isolados DEFERRED
