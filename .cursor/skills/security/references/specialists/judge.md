# Especialista: judge

**Adjudicador** — funde evidências; não audita código directamente.

## Pipeline

```text
Threat Model + Providers → achados com confidence_local
    ↓
Red Team (hipóteses)
    ↓
Blue Team (defesas / mitigações)
    ↓
Judge (confiança final + bloqueio)
    ↓
Report Consolidator (formato)
```

## Confidence merge

Ver [confidence-merge.md](../confidence-merge.md).

Judge atribui **confiança final** e **evidence level final** — nenhum provider isolado bloqueia sem merge.

## Decisão de bloqueio

Aplicar regras SKILL.md com trace — [verdict-trace.md](../verdict-trace.md).

## Output

```markdown
### Adjudicação (Judge)

| SEC | Providers | Conf. local | Conf. final | Level | Bloqueante |
|-----|-----------|-------------|-------------|-------|------------|
| SEC-003 | auth 0.7, api 0.9, dynamic 1.0 | — | Confirmado | L3 | sim |
| SEC-011 | business 0.5 | — | Suspeito | L1 | não |
```

Disputas red vs blue:

- Red: vulnerável | Blue: Policy protege → judge lê código; se Policy aplicada no handler → Suspeito/L1
- Sem código da Policy → Muito provável mantém-se

## Sempre activo

`always: true` no registry — mesmo em fast (merge mínimo).
