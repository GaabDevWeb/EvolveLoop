# Reverse engineering — fluxo e causalidade

## Pipeline a reconstruir (quando aplicável)

```text
Input → Interpretation → Context Selection → Reasoning → Decision
  → Capability/Tool Selection → Authorization → Execution → Evidence
  → Validation → State Update → Next Decision → Final Output
```

Por etapa:

| Pergunta | Resposta ou `UNKNOWN` |
|----------|----------------------|
| Quem executa? | |
| Estado in / out? | |
| Contratos? | |
| Determinístico vs modelo? | |
| Guardrails? | |
| Falhas / recovery? | |
| Observabilidade? | |

**Nunca** preencher lacunas com suposição.

## Causalidade

Não basta listar features. Para cada mecanismo:

> Qual problema resolve? Por que esta forma? Em que tarefas? Que custo? Alternativas? Que evidência sustenta o benefício?

Aplica-se a: skills, RAG, memory, tools, planning, handoffs, sandboxes, guardrails, context, evals, tracing, structured outputs, routing, multi-agent, etc.

## Feature ≠ bom

Para cada padrão:

```text
Problem → Mechanism → Evidence → Benefits → Costs → Failure Modes
→ Alternatives → Applicability
```

Veredicto de utilidade (sem rankings):

`USEFUL | CONDITIONALLY_USEFUL | REDUNDANT | HARMFUL | UNPROVEN | NOT_APPLICABLE`
