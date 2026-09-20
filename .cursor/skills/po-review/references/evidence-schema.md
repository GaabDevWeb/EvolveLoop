# Evidence schema — gate `po-acceptance`

Alinhado a `orquestrar/references/specs/evidence.md`.

Produzir **dois** artefactos no handoff:

1. Relatório humano — formato Markdown obrigatório do `SKILL.md` (Veredito Executivo → Veredito Final)
2. Evidence JSON — `telemetry/evidence/<node_id>.json`

```yaml
kind: Evidence
metadata:
  node_id: po-acceptance
  run_id: "<uuid>"
  provider_id: po-review
  capability: po-acceptance
spec:
  status: complete
  verdict: passed | rejected | conditional
  checks:
    - dod_id: dod-po-1
      result: pass | fail
      verification: evidence
      requirement: "Objetivo aderente"
  acceptance_summary:
    executive: APROVADO | REJEITADO
    orchestrator_status: OK | Ajustes necessários
    blocking_count: 0
    gate_phase_6: LIBERADO | BLOQUEADO
```

**Veredito humano → gate:**

| Banner executivo | `spec.verdict` | `orchestrator_status` |
|------------------|----------------|------------------------|
| `[APROVADO]` | `passed` | `OK` |
| `[REJEITADO]` | `rejected` | `Ajustes necessários` |

**DECISÃO orquestrador:**

| Status | DECISÃO sugerida |
|--------|------------------|
| OK | `continuar` → Fase 6 |
| Ajustes necessários | `corrigir` (implementação) ou `replanejar` (escopo) |

Schema JSON: `Cursor/orchestrator/schemas/evidence/po-acceptance@1.0.0.json`
