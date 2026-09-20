# Evidence Levels (L0–L4)

Complementa **Confiança** (qualidade da inferência) com **profundidade da evidência** (estático vs dinâmico).

## Escala

| Level | Nome | Critério | Bloqueia release? |
|-------|------|----------|-------------------|
| **L0** | Hipótese | padrão vago; sem linha de código | **não** |
| **L1** | Código indica | `path:linha` ou config; caminho plausível | **não** só |
| **L2** | PoC mental | passos reproduzíveis sem executar | **sim** se impacto crítico/alto + confiança alta |
| **L3** | Exploração reproduzida | curl, script, request real em ambiente autorizado | **sim** |
| **L4** | Exploração automatizada | scanner, teste E2E, semgrep hit confirmado | **sim** |

## Mapeamento Confiança × Level

| Confiança | Level típico |
|-----------|--------------|
| Suspeito | L0–L1 |
| Muito provável | L1–L2 |
| Confirmado | L2+ (L3/L4 se dinâmico disponível) |

## Regra de bloqueio (v2)

```text
Bloquear SE:
  impacto ∈ {crítica, alta}
  AND confiança ∈ {Confirmado, Muito provável}
  AND evidence_level ≥ L2
  AND exploitabilidade ≠ muito baixa
```

L0–L1 com impacto alto → **Security Debt** + "elevar para L3 em staging" — não bloquear por defeito.

## Por achado (campo obrigatório)

```markdown
**Evidence Level:** L2 (PoC mental)
**Evidência dinâmica:** não tentada — sem staging (capability ✗)
```

## Elevar nível

| De | Para | Acção |
|----|------|-------|
| L1 | L2 | construir PoC mental detalhado |
| L2 | L3 | curl/playwright contra local/staging |
| L3 | L4 | semgrep/npm audit/gitleaks com hit confirmado |

Ver [dynamic-pentest.md](specialists/dynamic-pentest.md).

## No Evidence JSON

```json
"findings": [{ "id": "SEC-001", "evidence_level": "L2", "confidence": "confirmed" }]
```
