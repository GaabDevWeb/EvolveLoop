# Gate — Aprovação do pacote docs (Fase 0.5)

## Orquestrador verifica

Antes de `continuar` para Fase 1 (`/planejar`):

| Critério | Verificação |
|----------|-------------|
| Pacote completo | 6 artefactos existem em `docs/` |
| Aprovação humana | Registo em `.agent_history.md`: "docs aprovados" |
| Consistência | planner consegue ler PRD + ARCHITECTURE + DATA-MODEL + API_SPEC |
| Sem código prematuro | Nenhum ficheiro src/ criado pelo prd |

## Estados SSOT

| Estado | Significado |
|--------|-------------|
| `docs: pendente` | prd não iniciado ou incompleto |
| `docs: aguarda aprovação` | pacote escrito, parar |
| `docs: aprovado` | OK para Fase 1 |

## Excepções estreitas

- **Hotfix trivial** (1 ficheiro, sem RF novo): orquestrador pode saltar prd com registo explícito "excepção hotfix"
- **Docs parciais existentes**: prd modo `delta-only` — actualizar, não recriar tudo

## Reprovação

Utilizador pede alterações → prd reentra em modo `update-spec` → novo gate.
