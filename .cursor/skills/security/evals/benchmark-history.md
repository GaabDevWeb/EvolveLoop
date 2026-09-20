# Benchmark — histórico por release

Painel agregado após cada iteração. Fonte: `security-workspace/runs/` + `manifest.json` ship_gate.

## Release summary

| Versão | Recall | Precisão | FP (fixed) | FP (ambiguous) | FN | Tempo médio | Únicos (B) | Marginal top provider | Status |
|--------|--------|----------|------------|----------------|-----|-------------|------------|----------------------|--------|
| v2.1.0-iter0 | — | — | — | — | — | — | — | — | pendente |
| **v2.1.0-iter1** | **100%** | **100%** | **0** | **0** | **0** | **7491 ms** | **2** (IDOR, neg-price) | — (ablation pós-iter1) | ✅ passa ship_gate |

**Status:** ✅ passa ship_gate | ❌ falha | ⚠️ regressão vs release anterior

## Regressão entre releases

| Versão anterior → nova | Δ Recall | Δ FP (fixed) | Δ FP (ambiguous) | Aceitável? |
|------------------------|----------|--------------|------------------|------------|
| iter0 → iter1 | — | — | — | ✅ (baseline histórico) |

Critério: queda de recall > 5pp ou FP (fixed) > 5% → **falhou benchmark**.

## Por provider (marginal utility — última run)

| Provider | Findings c/ | Findings s/ | Marginal | Recall | Precision | FP rate | Tempo |
|----------|-------------|-------------|----------|--------|-----------|---------|-------|
| threat-modeler | — | — | — | — | — | — | — |
| auth-reviewer | 2 | 1 | **1** | — | — | — | — |
| business-logic-reviewer | 1 | 0 | **1** | — | — | — | — |
| api-security-reviewer | 5 | 2 | **3** | — | — | — | — |
| judge | 6 | 6 | **0*** | — | — | — | — |

\*Judge: marginal 0 em *findings*, mas crítico para *bloqueio* (sem judge → FP em ambiguous, sem gate em vulnerable).

Marginal = findings(run completo) − findings(run sem provider). Correr ablation só em `with_skill` deep.

## Por cenário (última run with_skill)

| Cenário | Estado | Recall | Block correto? | TTFC (ms) | Providers activados |
|---------|--------|--------|----------------|-----------|---------------------|
| auth/idor-basic | vulnerable | 1.0 | ✅ | 3560 | auth-reviewer, api-security-reviewer, judge |
| auth/mass-assignment | vulnerable | 1.0 | ✅ | 3240 | auth-reviewer, api-security-reviewer, judge |
| injections/sqli-classic | vulnerable | 1.0 | ✅ | 3040 | api-security-reviewer, judge |
| business/negative-price | vulnerable | 1.0 | ✅ | 3680 | business-logic-reviewer, judge |
| injections/sqli-suspect-safe | ambiguous | 1.0 | ✅ (não bloqueou) | — | api-security-reviewer, judge |
| injections/redirect-allowlist | ambiguous | 1.0 | ✅ (não bloqueou) | — | api-security-reviewer, judge |

**Fonte:** `security-workspace/iteration-1/` — runners baseline + with_skill apenas. Semgrep/CodeQL pendente (iter-2).

**Benchmark v1.0 congelado** após iter-1 PASS — ver `security-workspace/iteration-1/iteration-1-report.md`.

## Semgrep (iter-2)

Primeira integração de ferramenta externa (runner `semgrep`) com ruleset local mínimo.

- **Runs**: 11
- **Recall (vulnerable)**: 50%
- **FP (fixed)**: 0
- **FP (ambiguous)**: 1
- **Tempo médio**: ~1565 ms

Relatório: `security-workspace/iteration-2/iteration-2-report.md`

## CodeQL (iter-3)

Segunda integração de ferramenta externa (runner `codeql`) com pack local mínimo.

- **Runs**: 11
- **Recall (vulnerable)**: 50%
- **FP (fixed)**: 0
- **FP (ambiguous)**: 2
- **Tempo médio**: ~9000 ms

Relatório: `security-workspace/iteration-3/iteration-3-report.md`

**Comparação rápida (categoria A vulnerable):** Semgrep e CodeQL empatam em SQLi + Mass Assignment; ambos falham IDOR/Negative Price (categoria B).

## Combinações (iter-4)

Merge `with_skill` + ferramenta com disciplina do Judge (FP de tool suprimido em fixed/ambiguous).

| Runner | Recall (vuln) | FP (fixed+amb) | Overlap | Únicos skill / tool | Tempo médio |
|--------|---------------|----------------|---------|---------------------|-------------|
| with_skill+semgrep | 100% | 0 | 3 | 3 / 1 | ~9065 ms |
| with_skill+codeql | 100% | 0 | 4 | 2 / 1 | ~16500 ms |

Relatório: `security-workspace/iteration-4/iteration-4-report.md`

**Insight:** combinações recuperam recall 100% em vulnerable vs 50% da ferramenta isolada, sem reintroduzir bloqueios indevidos em ambiguous.

## Ablation (iter-5)

Marginal utility por provider (`with_skill-ablation`) em 6 cenários P0 relevantes.

- **Runs**: 14 ablations
- **Top marginal (findings)**: api-security-reviewer (3)
- **Judge**: marginal 0 em findings, crítico para veredito (FP/FN de bloqueio)

Relatório: `security-workspace/iteration-5/iteration-5-report.md`

## Gitleaks (iter-6)

Integração do scanner de secrets (runner `gitleaks`). Fixtures P0 **não contêm secrets** — validação de pipeline.

- **Runs**: 11
- **Findings**: 0 (esperado)
- **FP (fixed+ambiguous)**: 0
- **Tempo médio**: ~340 ms
- **Limitação demonstrada**: falta cenário `secrets/` para medir recall

Relatório: `security-workspace/iteration-6/iteration-6-report.md`
