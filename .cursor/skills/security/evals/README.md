# Security Framework — Benchmark Suite

**Testes unitários do framework.** Arquitetura congelada em v2.1 — evolução passa por aqui.

**Pergunta central:** o benchmark prova que o framework melhora?

## Categorias de benchmark

- **A — Paridade**: classes clássicas (SQLi, XSS, SSRF, traversal, command injection, secrets, mass assignment, JWT, CORS, CSP).
- **B — Complementar**: business logic, IDOR complexo, attack chains, threat modeling, trust boundaries, integração/arquitetura, LLM security.
- **C — Orquestração**: activação correcta de especialistas/scanners, detecção de capabilities, evitar módulos desnecessários, coverage coerente.

## Estrutura

```text
evals/
├── manifest.json           # catálogo de cenários
├── metrics-schema.json     # schema de run metrics
├── benchmark-protocol.md   # como correr e comparar
├── benchmark-history.md  # painel histórico por release
├── evals-v1.json           # prompts comportamentais (legado)
├── trigger-eval-set.json
├── auth/
├── injections/
├── business/
└── ...                     # expandir por domínio
```

## Cada cenário contém

| Ficheiro / pasta | Propósito |
|------------------|-----------|
| `scenario.yaml` | metadata, expected, FP/FN conhecidos |
| `vulnerable/` | código com vulnerabilidade real |
| `fixed/` | mesma funcionalidade corrigida |
| `ambiguous/` | seguro mas parece perigoso (maturidade do judge) |
| `README.md` | contexto para o runner (opcional) |

## Correr (isolado)

Ver [benchmark-protocol.md](benchmark-protocol.md) e [../ARCHITECTURE-FROZEN.md](../ARCHITECTURE-FROZEN.md).

Runners: **baseline → with_skill → semgrep → codeql → with_skill+semgrep → with_skill+codeql**.

Deep (pós-iter1): **with_skill-ablation** por provider → marginal utility.

## Métricas alvo (100+ runs)

| Métrica | Definição |
|---------|-----------|
| **Recall** | vulns esperadas detectadas / total esperado |
| **Precision** | achados corretos / total achados |
| **FP rate** | bloqueios indevidos (fixed + ambiguous) |
| **FN rate** | vulns esperadas não detectadas |
| **Provider metrics** | recall/precision/FP/FN/tempo por especialista |
| **Marginal utility** | achados perdidos ao desactivar um provider |
| **Release regression** | Δ recall/FP vs versão anterior |
| **Precision by Severity** | precision estratificada por severidade |
| **TTFC** | time to first critical (ms) |
| **Unique Findings** | overlap + exclusivos (framework vs tool) |
| **Actionability** | % de achados corrigíveis por dev |
| **Explainability** | nota (0–10) para clareza do relatório |

Histórico: [benchmark-history.md](benchmark-history.md)

## Roadmap de cenários

Prioridade: auth → business → injections → regression → llm/cloud/graphql.

Ver [manifest.json](manifest.json) para estado por cenário.
