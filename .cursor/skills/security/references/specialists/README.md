# Especialistas — Capability Registry

Providers registados em [capability-registry.yaml](../../capability-registry.yaml). O orquestrador **query por capability**, não por lista fixa.

## Pipeline debate (standard/deep)

```text
threat-modeler → [providers analíticos] → red-team → blue-team → judge → report-consolidator
```

## Providers

| ID | Capabilities | Ficheiro |
|----|--------------|----------|
| threat-modeler | threat-modeling | [threat-modeler.md](threat-modeler.md) |
| auth-reviewer | auth-review, idor-bola | [auth-reviewer.md](auth-reviewer.md) |
| api-security-reviewer | api-review | [api-security-reviewer.md](api-security-reviewer.md) |
| business-logic-reviewer | business-logic, payment-review | [business-logic-reviewer.md](business-logic-reviewer.md) |
| graphql-reviewer | graphql-review | [graphql-reviewer.md](graphql-reviewer.md) |
| llm-security-reviewer | llm-review, mcp-review | [llm-security-reviewer.md](llm-security-reviewer.md) |
| cloud-security-reviewer | cloud-review, iac-review | [cloud-security-reviewer.md](cloud-security-reviewer.md) |
| dependency-reviewer | dependency-review | [dependency-reviewer.md](dependency-reviewer.md) |
| dynamic-pentest | dynamic-test, evidence-l3/l4 | [dynamic-pentest.md](dynamic-pentest.md) |
| **red-team** | offensive-creative | [red-team.md](red-team.md) |
| **blue-team** | mitigation-review | [blue-team.md](blue-team.md) |
| **judge** | verdict-adjudication, confidence-merge | [judge.md](judge.md) |
| report-consolidator | report-merge, sarif-export | [report-consolidator.md](report-consolidator.md) |

## Adicionar provider

Ver [capability-registry.md](../capability-registry.md) — zero alterações no SKILL.md.

**Contrato obrigatório:** [specialist-contract.md](../specialist-contract.md)
