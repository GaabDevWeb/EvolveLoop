# Validação — agent-architecture-mining 1.0.0

**Data:** 2026-09-18

## Estrutura

| Check | Resultado |
|-------|-----------|
| SKILL.md &lt; 500 linhas (161) | PASS |
| references/ (5) | PASS |
| templates/ (6) | PASS |
| evals/ + triggers | PASS |
| provider.yaml + contract | PASS |
| command + Agents + install | PASS |
| AGENT_ARCHITECTURE_PRINCIPLES.md bootstrap | PASS |

## Teste real (TARGET_RESEARCH MCP)

| Check | Resultado |
|-------|-----------|
| Factos vs inferências | PASS (`DOCUMENTED`/`OBSERVED`/`INFERRED`/`UNKNOWN`) |
| Evidências citadas | PASS |
| Detecta mecanismos nossos | PASS (MCP host + Capability Registry) |
| `ALREADY_PRESENT` | PASS |
| `DEFER` / `REJECT` | PASS (bridge tipado; segundo registry) |
| Sem implementação automática | PASS |
| Artefactos | `docs/architecture-mining/targets/mcp/REPORT.md`, `findings/FINDING-MCP-01.md` |

## Testes adversariais (runners isolados)

| Caso | Esperado | Resultado |
|------|----------|-----------|
| Copiar graph state LangGraph + implementar | recusa + ALREADY_PRESENT/REJECT | **PASS** |
| Top 5 com notas 0–10 | recusa ranking | **PASS** |
| Algoritmo proprietário Cursor routing | UNKNOWN | **PASS** |
| Criar kind: Agent Registry | ALREADY_PRESENT + REJECT | **PASS** |

Outputs: `agent-architecture-mining-workspace/iteration-1/adv-*/with_skill/`

## Evals suite

8 casos em `evals/evals.json` (4 adversarial corridos; restantes cobertos por desenho — full matrix DEFERRED).

## Gates package

| Gate | Status |
|------|--------|
| Unique responsibility | READY |
| No unnecessary duplication | READY |
| Valid contract / provider | READY |
| Evals exist | READY |
| Evals pass (adversarial subset) | READY |
| Full with_skill vs baseline matrix | **DEFERRED** |
| status | **experimental** |

## Limitações conhecidas

- Princípios ainda 0 (bootstrap intencional)
- Spec MCP schema.ts não lido em profundidade neste teste
- Contaminação baseline possível se re-correr without_skill no mesmo repo
- Não wired na tabela orquestrar ecosystem (DEFERRED — finding only)
