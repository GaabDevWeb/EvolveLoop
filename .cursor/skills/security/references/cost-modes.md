# Modos de auditoria e custo

## Modos

| Modo | Quando | Providers típicos |
|------|--------|-------------------|
| **fast** | PR pequeno, CI rápido, diff local | threat-modeler, auth, api, judge, consolidator |
| **standard** | gate Fase 4 default | + business, deps, red/blue debate em críticos |
| **deep** | release major, pagamentos, incident | + dynamic-pentest, cloud, graphql, llm, todos signals |

Inferir modo: pedido explícito > escopo (pagamento/admin → standard mínimo) > default **standard**.

Registry: `modes` em [capability-registry.yaml](../capability-registry.yaml).

## Custo declarado

Cada provider regista `cost.tier`: low | medium | high.

No relatório:

```markdown
### Custo da auditoria

| Provider | Tier | Tools | Executado |
|----------|------|-------|-----------|
| auth-reviewer | medium | grep | ✓ |
| dynamic-pentest | high | — | ✗ (mode fast) |

**Modo:** standard | **Providers:** 7/12 | **Estimativa:** média
```

Orquestrador em **fast**: respeitar `max_providers`; saltar tier high salvo bloqueante óbvio.

## Pedido do utilizador

- "auditoria rápida" → fast
- "auditoria completa" / "deep" → deep
- sem qualificador → standard
