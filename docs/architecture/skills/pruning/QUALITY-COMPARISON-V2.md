# QUALITY-COMPARISON-V2

## Método

Comparação **pré vs pós** com o mesmo corpus estrutural:

1. Vitest full suite (contratos, gates, full-cycle, evals engine)
2. Matriz massiva pós-poda (147 cenários estruturais)
3. Catalog/adversarial assertions (`removed_skill_must_not_be_runtime_resolvable`)

**Não medido em produção LLM:** latency token-level, task success humano, retrieval relevance live — marcado `NOT_MEASURED` / `INCONCLUSIVE` onde aplicável.

## Resumo

| dimensão | pre | post | verdict |
|----------|-----|------|---------|
| vitest | 212/212 | 225/225 | IMPROVED (cobertura) / UNCHANGED (core) |
| hard gates grill-me | fail-closed | fail-closed | UNCHANGED |
| hard gate image-to-code | present | present | UNCHANGED |
| agent-browser chain | intact | intact | UNCHANGED |
| library-dossier chain | intact | intact | UNCHANGED |
| find-skills vs registry | discovery only | discovery only | UNCHANGED |
| motion/UI skills resolvable | yes (pack) | no | IMPROVED (escopo) |
| qualidade tarefa LLM live | NOT_MEASURED | NOT_MEASURED | INCONCLUSIVE |
| material core regression | — | none observed | UNCHANGED |

## Quality collapse checks

Pedidos que outrora ativariam skills removidas:

- GSAP / Framer / Lenis / R3F / particles / LinkedIn → skill ausente do pack; sem loop; sem broken active ref; path apropriado = frontend-pro / ausência documentada — **sem hallucinated pack skill load** nos testes estruturais.

## Declaração

Não se afirma “mais preciso só porque o catálogo é menor”. Afirma-se:

> Core MegaBrain + hard gates + providers/commands/agents intactos; 7 skills non-core removidas; suites estruturais verdes; sem regressão material observável nos testes existentes.
