# POST-PRUNE-CONTRACT-AUDIT

## Agents locais (.cursor / Agents)

Todos os contratos de skills **required** reconciliados contra inventário pós-poda.

- Nenhuma skill removida aparece como required/optional ativa em agent contracts do pack.
- 23 agents locais: sem regressão de dependência estrutural.

## Commands críticos

| command | skills/gates | status |
|---------|--------------|--------|
| /prd | prd | OK |
| /planejar | planner + grill-me gate | OK |
| /testes | testing | OK |
| /debugger | debugger + systematic-debugging | OK |
| /validar | po-review | OK |
| /documentar | documentation | OK |
| /frontend-pro | frontend-pro + image-to-code + agent-browser | OK |
| /library-dossier | technical-library-dossier + agent-browser | OK |
| /descobrir | find-skills | OK |
| /grill-me | grill-me HARD-GATE | OK |

## Providers

Runtime resolve via `provider.yaml` + discovery de manifests — **não** via `find-skills` como fallback.

Após poda: zero providers com path inexistente para as 7 skills removidas.

## Gates

| gate | semântica pós-poda |
|------|-------------------|
| grill-me | CONDITIONAL_FAIL_CLOSED inalterada |
| image-to-code | HARD_GATE inalterada |

Nenhum hard gate convertido em best-effort.
