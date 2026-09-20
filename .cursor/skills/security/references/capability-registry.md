# Capability Registry (plugin architecture)

O orquestrador **não conhece** especialistas por nome fixo. Consulta [capability-registry.yaml](../capability-registry.yaml).

## Fluxo

```text
1. Detectar stack + capability matrix
2. Modo auditoria (fast | standard | deep) — [cost-modes.md](cost-modes.md)
3. Query registry:
   - providers onde signals match OU always: true
   - filtrar por mode
   - filtrar por requires_capabilities na matrix
4. Ordenar por cost.tier se modo fast e max_providers
5. Carregar entrypoint de cada provider activado
```

## Adicionar especialista (sem tocar SKILL.md)

1. Criar `references/specialists/novo-reviewer.md`
2. Registar em `capability-registry.yaml`:

```yaml
- id: sap-reviewer
  capabilities: [sap-review]
  modes: [deep]
  entrypoint: specialists/sap-reviewer.md
  cost: { tier: high, tools: [] }
  signals: [SAP|OData]
```

3. Opcional: `stack_profiles.sap.suggested_capabilities` → incluir `sap-review`

## Query mental

```text
"Quem atende capability=payment-review?"
→ business-logic-reviewer (se signals Stripe ou mode deep força business)
```

## Outputs por provider

Cada provider devolve:

```yaml
provider_id: auth-reviewer
findings: [SEC-...]
confidence_local: 0.0-1.0
evidence_level_max: L2
coverage_domains: [authentication: 0.8]
cost_actual: { tokens_estimate: medium, tools_used: [grep] }
```

Judge funde confianças — [confidence-merge.md](confidence-merge.md).
