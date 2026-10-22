# Retrieval ranking (V22-GOAL-006d — no circularity)

## Candidatos

Igual ao braço **B0**: união dos paths devolvidos por `rg` com os `rg_patterns` da task (só para **enumerar** candidatos). O ranking **não** usa `rg_patterns` no score (vazamento de resposta — GOAL-005 harness 1.1.0).

## Entradas de score (permitidas)

| Fonte | Uso |
|-------|-----|
| Texto da `query` / briefing | Termos, ADR-*, fragmentos path-like, CamelCase |
| `cited_paths` em metadata do spawn | Boost explícito |
| Sinais estruturais de path | `docs/adr/`, `docs/architecture/`, `orchestrator/src/`, `profiles/`, `.cursor/skills/` |

## Proibido no score

- `rg_patterns` da task
- Anchors / substrings / linhas gabarito
- Ajuste por resultados de H13–H18 (medir apenas)

## Seleção

1. `rankRetrievalPaths` por score (query + metadata + estrutural).
2. `selectTopRankedPaths` — densidade `score/log1p(tokens)`, `max_paths=15`.
3. `applyContextBudget` — classes protegidas (DoD, segurança, evidência).

Código: `orchestrator/src/context/retrieval-ranking.ts`

## Testes

- Rápido: `npm test` (unit + integração, sem bench de corpus).
- Lento: `npm run test:bench` — R01–R06 + H07–H18.
