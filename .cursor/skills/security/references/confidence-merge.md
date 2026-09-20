# Confidence Merge (fusão de evidências)

Evita que **um** especialista determine o veredito.

## Input por SEC

Cada provider que toca no achado reporta:

```yaml
confidence_local: 0.0-1.0  # 0=hipótese, 1=confirmado
evidence_level: L0-L4
provider_id: auth-reviewer
```

## Fórmula (judge)

```text
confidence_final = min(1.0, weighted_mean(confidence_local, weights))

weights por provider:
  dynamic-pentest: 1.0
  red-team (confirmado no código): 0.7
  auth/api/business-*: 0.8
  threat-modeler (hipótese): 0.3
  blue-team (defesa comprovada): reduz ×0.5 no merge
```

**Evidence level final** = `max(level)` dos providers — dynamic eleva L1→L3.

## Mapeamento → Confiança textual

| confidence_final | Confiança |
|------------------|-----------|
| ≥ 0.85 | Confirmado |
| 0.65–0.84 | Muito provável |
| 0.40–0.64 | Suspeito |
| < 0.40 | Informativo |

## Bloqueio

Só judge emite flag `bloqueante: sim` após merge + regras L2+.

## Exemplo

```text
SEC-003 SQLi
  api-reviewer: 0.9 L2
  dynamic-pentest: 1.0 L3
→ merge: Confirmado, L3, bloqueante

SEC-011 SSRF hipótese
  api-reviewer: 0.5 L1
  blue-team: defesa não verificada
→ merge: Suspeito, L1, não bloqueante
```

Registar no Evidence JSON: `confidence_merge: [{ sec, inputs, final }]`.
