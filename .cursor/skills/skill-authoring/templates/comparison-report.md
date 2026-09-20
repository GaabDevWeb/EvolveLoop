# Comparison Report — `<skill-name>` — iteration-`<N>`

Gerado após evals em **sessões isoladas** (runners separados).

## Resumo executivo

| Métrica | with_skill | without_skill (baseline) |
|---------|------------|--------------------------|
| Evals executados | | |
| Assertions críticas pass | / | / |
| Pass rate médio | % | % |
| **Discriminador** | melhor / equivalente / pior | — |

**Recomendação:** ship / iterar / descartar skill

---

## Por eval

### `<eval-name>` — categoria: `<category>`

**Prompt:** <resumo>

| Dimensão | with_skill | baseline |
|----------|------------|----------|
| Pass rate assertions | | |
| Formato conforme skill | sim/não | sim/não |
| Completude | 1–5 | 1–5 |
| Violações do contrato | | |

**Diff qualitativo (1 parágrafo):** o que a skill mudou vs baseline?

**Paths:**
- with_skill: `.../with_skill/outputs/`
- baseline: `.../without_skill/outputs/`

---

## Padrões transversais

| Padrão | Evals afectados | Acção na skill |
|--------|-----------------|----------------|
| ex.: falta secção X | eval-1, eval-3 | adicionar template obrigatório |
| | | |

## Categorias cobertas

| Categoria | Evals | with_skill OK? |
|-----------|-------|----------------|
| happy_path | | |
| edge_case | | |
| adversarial | | |
| minimal_context | | |
| near_miss_domain | | |
| integration | | |

## Regressão vs iteração anterior

| Eval | iter-(N-1) with_skill | iter-N with_skill | Δ |
|------|----------------------|-------------------|---|
| | | | melhorou / igual / piorou |

## Feedback manual (chat real)

| Eval | Testado em chat novo? | OK? | Notas |
|------|---------------------|-----|-------|
| | sim/não | | |
