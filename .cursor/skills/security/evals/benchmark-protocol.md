# Protocolo de benchmark

**Pergunta central:** o benchmark prova que o framework melhora?

## Categorias (objectivos)

- **Categoria A — Paridade**: não ser significativamente pior que SAST clássico.
- **Categoria B — Complementar**: problemas que scanners tradicionais não encontram.
- **Categoria C — Orquestração**: boas decisões sobre módulos/scanners/capabilities.

## Estados de fixture (por cenário)

| Estado | Propósito | Grading |
|--------|-----------|---------|
| `vulnerable/` | Vulnerabilidade real | must_detect + must_block |
| `fixed/` | Mesma funcionalidade corrigida | must_not_block |
| `ambiguous/` | Parece perigoso, é seguro | must_not_block; L0-L1 OK |

Cenários podem expor 1–3 estados (`fixture_states` em `scenario.yaml`).

## Runners (sessão isolada)

Por cenário × estado, correr **a mesma prompt base** em contexto fresco:

| Runner | O que mede |
|--------|------------|
| **baseline** | LLM “puro” (referência) |
| **with_skill** | ganho do framework |
| **semgrep** | paridade SAST regras/taint |
| **codeql** | paridade SAST dataflow |
| **with_skill+semgrep** | combinação prática |
| **with_skill+codeql** | combinação prática |
| **with_skill-ablation** | marginal utility (opcional, pós-iter1) |

Output → `security-workspace/runs/<scenario-id>/<fixture-state>/<runner>/`

## Grading

Grader isolado compara output vs `scenario.yaml`:

```yaml
# vulnerable/
expected:
  must_detect: [SQL_INJECTION]
  must_block: true
  min_evidence_level: L2

# fixed/
expected:
  must_detect: []
  must_not_block: true

# ambiguous/
expected:
  must_detect: []
  must_not_block: true
  max_evidence_level_for_block: L1
```

## Métricas por run

Gravar `metrics.json` conforme [metrics-schema.json](metrics-schema.json).

### Framework (agregado)

- Recall, Precision, FP/FN, Precision by Severity, TTFC, Unique Findings, Actionability, Explainability

### Por provider (`provider_metrics`)

Para cada especialista activado, registar:

| Campo | Uso |
|-------|-----|
| recall / precision | qualidade do domínio |
| fp_rate / fn_rate | onde calibrar |
| duration_ms | custo |
| exclusive_findings | valor diferencial |

### Marginal utility (`marginal_utility`)

1. Correr `with_skill` completo → `findings_with`
2. Correr `with_skill-ablation` sem provider X → `findings_without`
3. `marginal_findings = with − without`

Responde: **quais especialistas realmente fazem diferença?**

## Regressão entre releases

Após cada iteração, agregar em [benchmark-history.md](benchmark-history.md):

- Comparar recall/FP/FN vs release anterior
- Falha se recall cai > 5pp ou FP (fixed) > 5%
- Usar `release_comparison` no schema

## Ship gate

Ver [manifest.json](manifest.json) → `ship_gate`.

## Regressão de código

Cenários `regression/` — snapshot histórico + código reintroduzido → assert REGRESSÃO.
