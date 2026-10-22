# Retrieval ranking (V22-GOAL-006c)

Orçamento de contexto **não** ordena paths por ordem lexicográfica. Antes do corte (`max_paths` / `max_tokens`), o runtime classifica candidatos com score determinístico.

## Entradas permitidas

- `query` da tarefa / briefing do spawn
- `rg_patterns` do harness (mesmos padrões do braço B0)
- `cited_paths` opcionais em metadata do spawn (paths nomeados no objetivo — **não** anchors do verificador)

## Proibido (anti-circularidade)

- `anchors` / `substring` / linhas gabarito das tasks R01–R06 ou H01–H12
- Respostas esperadas ou recall labels

## Score (resumo)

| Sinal | Peso |
|-------|------|
| Termo da query/pattern no path | +5 |
| Termo no conteúdo (cap 8 ocorrências/termo) | +1 cada |
| Pattern `rg` no path / conteúdo | +8 / +4 |
| Prefixo `docs/adr/`, `docs/architecture/` | +3 |
| `ADR-*` citado na query e presente no path | +20 |
| Fragmento path-like na query (`*.ts`, `profiles/...`) | +18 |
| `cited_paths` explícitos | +22 |

Desempate: ordem lexicográfica do path (estável).

Implementação: `orchestrator/src/context/retrieval-ranking.ts`

## Critério GOAL-006 (bench)

Por task: `recall(budget) >= recall(B0_OFFICIAL)` e `tokens(budget) <= tokens(B0_OFFICIAL)` com `max_paths=15`.
