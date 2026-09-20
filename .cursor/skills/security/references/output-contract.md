# Contrato de Saída — Relatório Completo

Ordem **exacta** das secções Markdown. Orquestrador consolida output dos especialistas aqui.

---

## 1. Veredito Final

```text
SEGURO PARA RELEASE | BLOQUEADO - RISCO DETECTADO
```

Contagem severidades + frase. Se bloqueado → Status Orquestrador = `bloqueado`.

## 2. Security Score

`Security Score: N/100 (grade)` — [risk-scoring.md](risk-scoring.md)

## 3. Verdict Trace

[verdict-trace.md](verdict-trace.md) — **obrigatório se bloqueado**

## 4. Resumo Executivo

Postura | Score | Top 3 (SEC/CHAIN) | Bloqueantes

## 4. Capability Matrix + Modo + Custo

[capability-matrix.md](capability-matrix.md) + [cost-modes.md](cost-modes.md) + Framework Audit Log

## 5. Regressões (se histórico)

[audit-memory.md](audit-memory.md)

## 6. Plano de Auditoria (registry)

Módulos activados + scanners — [auto-planning.md](auto-planning.md)

## 6. Threat Model (resumo)

[threat-modeling.md](threat-modeling.md)

## 7. Mapa Arquitetural

[architecture-surfaces.md](architecture-surfaces.md)

## 8. Threat Coverage

[threat-coverage.md](threat-coverage.md)

## 9. Attack Chains

[attack-chains.md](attack-chains.md)

## 10. Vetores de Ataque (`SEC-XXX`)

| Campo | Conteúdo |
|-------|----------|
| Impacto | crítica \| alta \| média \| baixa \| informativa |
| Exploitabilidade | alta \| média \| baixa \| muito baixa |
| Confiança | Confirmado \| Muito provável \| Suspeito \| Informativo |
| **Evidence Level** | L0 \| L1 \| L2 \| L3 \| L4 |
| Esforço correção | trivial \| baixo \| médio \| alto |
| Prioridade | P0–P3 |
| **OWASP** | A0X:2021 |
| **CWE** | CWE-NNN |
| **MITRE** | TNNNN |
| Quem explora | [attacker-profiles.md](attacker-profiles.md) |
| Onde | path:linha |
| O que / Impact / Reasoning / Attack Path | obrigatórios |
| Como explorar | PoC mental ou L3 steps |
| Como corrigir / Mitigação Obrigatória | |
| Evidence | trecho código ou output scanner |
| Attack Graph | pré-condições, dependências, cadeia |

## 11. Lógica de Negócio

[business-logic.md](business-logic.md)

## 12. Auth + Authz

Tabela `Recurso | Ação | Controle | Falha?`

## 13. Mapa de Taint

SOURCE → sanitizer → SINK

## 14. Plano de Hardening

Por prioridade P0→P3 com esforço

## 15. Security Debt

[prioritization.md](prioritization.md)

## 16. Riscos Residuais / FP / FN

[risk-scoring.md](risk-scoring.md)

## 17. Artifacts Gerados

Lista paths JSON/SARIF/evidence

---

Checklist pré-entrega: ver [../SKILL.md](../SKILL.md) regras invioláveis + evidence level em cada SEC.
