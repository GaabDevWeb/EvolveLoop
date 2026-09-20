# Evals — roadmap (pós-congelamento v2.1)

**Arquitetura congelada.** Ver [../ARCHITECTURE-FROZEN.md](../ARCHITECTURE-FROZEN.md).

**Fase actual:** pesquisa/engenharia — provar melhoria com dados, não desenhar mais arquitectura.

## Prioridade única: benchmark

| Fase | Entrega | Estado |
|------|---------|--------|
| 1 | 6 cenários P0 (4 vuln+fixed, 2 ambiguous) | **feito** |
| 2 | Runners isolados + metrics.json por run | **próximo** |
| 3 | Provider metrics + marginal utility (ablation) | após iter-1 |
| 4 | benchmark-history.md preenchido por release | após iter-1 |
| 5 | Comparação Semgrep/CodeQL nos fixtures A | pendente |
| 6 | +8 cenários (jwt-none, coupon-race, xss-react, regression) | backlog |

### Cenários P0 (iteration-1)

| Cenário | Estados | Classe |
|---------|---------|--------|
| auth/idor-basic | vulnerable, fixed | B |
| auth/mass-assignment | vulnerable, fixed | A |
| injections/sqli-classic | vulnerable, fixed | A |
| business/negative-price | vulnerable, fixed | B |
| injections/sqli-suspect-safe | ambiguous, fixed | A |
| injections/redirect-allowlist | ambiguous | A |

## Métricas (100 runs)

Agregar em `security-workspace/benchmark-report.md` + [benchmark-history.md](benchmark-history.md):

- Recall / Precision / FP / FN (por estado: vulnerable, fixed, ambiguous)
- Provider metrics por especialista
- Marginal utility (ablation)
- Release regression (Δ vs versão anterior)
- baseline → with_skill → semgrep → codeql → combinações

Schema: [metrics-schema.json](metrics-schema.json)

## Adiado (v3+)

- Evidence Graph
- Quality Assessor (meta-auditoria) — só após baseline métrico
- Novos cenários sem lacuna medida em benchmark

## Ship gate

Ver [manifest.json](manifest.json) → `ship_gate`

Legacy prompts: [evals-v1.json](evals-v1.json)
