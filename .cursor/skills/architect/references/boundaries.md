# Fronteiras — Architect vs adr / prd / planner

## Matriz rápida

| Pedido do utilizador | Agente |
|----------------------|--------|
| «Desenha a arquitectura / review estrutural / opções de camadas» | **architect** |
| «Documenta a decisão X num ADR» | **adr** |
| «Feature nova com PRD + specs + ARCHITECTURE» | **prd** |
| «Plano de implementação / DAG / briefings» | **planner** |

## Overlap permitido (handoff, não duplicação)

- **architect → adr:** lista candidatos; `/adr` formaliza `NNNN`.
- **prd → ARCHITECTURE:** pacote inicial de feature; architect intercede em redesign mid-life ou análise profunda sem pacote completo.
- **architect → planner:** arquitectura estável o suficiente; planner não redefine camadas sem evidência.

## Sinais de RESPONSIBILITY_OVERLOAD

Se o pedido misturar «desenha tudo + escreve ADRs + PRD + plano + código» → decompor na ordem:

`prd?` → `architect` → `adr` (por decisão) → `planner` → workers.
