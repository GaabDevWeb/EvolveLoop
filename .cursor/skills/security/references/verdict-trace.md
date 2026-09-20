# Verdict Trace (explainability)

Resposta obrigatória a: **"Por que bloqueou?"**

## Secção no relatório

```markdown
### Verdict Trace

**Veredito:** BLOQUEADO - RISCO DETECTADO

**Cadeia de decisão:**

1. SEC-003 — SQL Injection `src/users.ts:42`
   - Impacto: **crítica**
   - Exploitabilidade: **alta** (internet, sem auth)
   - Confiança final: **Confirmado** (merge: api 0.9 + dynamic 1.0)
   - Evidence Level: **L3** (curl reproduzido)
   - Bloqueante: **sim**

2. CHAIN-02 — SEC-004 → SEC-012 → admin takeover
   - Severidade cadeia: **crítica**
   - Bloqueante: **sim** (encadeamento)

**Regras aplicadas:**
- Regra 3 SKILL: crítica + Confirmado + L≥2 → bloqueio
- Nenhum FP: blue-team não encontrou controlo compensatório

**Não bloqueou:**
- SEC-011 (Suspeito, L1) — evidência insuficiente

**Modo:** standard | **Providers executados:** 8 | **Judge:** adjudicado
```

## Árvore mínima (opcional)

```text
BLOQUEADO
├── SEC-003 (crítica, L3, Confirmado)
└── CHAIN-02 (crítica)
```

## Evidence JSON

```json
"verdict_trace": {
  "blocking_reasons": ["SEC-003", "CHAIN-02"],
  "non_blocking_notable": ["SEC-011"],
  "rules_applied": ["critical+L2+confirmed"]
}
```

Transparência auditável — não caixa preta.
