# Arquitetura congelada — v2.1.0

**Estado:** API estável. Sem novos especialistas, providers ou fases de pipeline até métricas justificarem.

## Congelado (não alterar sem RFC)

| Componente | Ficheiro |
|------------|----------|
| Orquestrador | `SKILL.md` — só bugfixes de clareza |
| Registry API | `capability-registry.yaml` — add provider OK; mudar contrato NOK |
| Evidence levels L0–L4 | `references/evidence-levels.md` |
| Output contract | `references/output-contract.md` |
| CI artifacts shape | `references/ci-artifacts.md` |
| Specialist contract | `references/specialist-contract.md` |

## Investimento permitido (80% esforço)

1. **Suite evals** — `evals/` fixtures + manifest
2. **Métricas** — `evals/metrics-schema.json`, runs em `security-workspace/`
3. **Integração tools** — semgrep, gitleaks, npm audit nos cenários existentes
4. **Benchmark externo** — comparar com Semgrep/CodeQL nos mesmos fixtures

## Explicitamente adiado (v3+)

- Evidence Graph
- Quality Assessor como provider
- Novos especialistas sem lacuna medida em benchmark

## Critério para descongelar

Lacuna **medida** em benchmark: recall < X% num domínio após 3 iterações de eval, com FP rate estável.
