# Priorização e Security Debt

Quarta dimensão: **esforço de correção** — para quem vai executar o hardening.

## Esforço de correção

| Esforço | Critério | Acção sugerida |
|---------|----------|----------------|
| **trivial** | < 1h; 1 ficheiro; config | corrigir agora |
| **baixo** | 1–4h | sprint atual |
| **médio** | 1–3 dias | planejar |
| **alto** | > 1 semana; refactor | roadmap / debt |

## Matriz de priorização execução

```text
P0 = impacto crítico/alta + exploitabilidade alta + esforço trivial/baixo
P1 = impacto alto + esforço médio
P2 = impacto médio OU esforço alto
P3 = backlog
```

Exemplo no relatório:

| SEC | Impacto | Exploit. | Esforço | Prioridade |
|-----|---------|----------|---------|------------|
| SEC-003 | crítica | alta | trivial (param SQL) | **P0 — corrigir agora** |
| SEC-011 | média | baixa | alto (refactor authz) | P2 — planejar |

## Security Debt (secção obrigatória)

```markdown
### Security Debt

| Métrica | Valor |
|---------|-------|
| Total itens | 12 |
| Críticos | 3 |
| Altos | 4 |
| Médios | 3 |
| Baixos | 2 |
| **Tempo estimado** | **~27h** (soma esforços) |
| Bloqueantes release | 2 (SEC-003, CHAIN-01) |
```

### Estimativa de tempo (heurística)

| Esforço | Horas típicas |
|---------|---------------|
| trivial | 0.5h |
| baixo | 2h |
| médio | 8h |
| alto | 24h+ |

Somar todos os itens do Plano de Hardening não bloqueantes = **debt técnico de segurança**.

## Ligação com veredito

- **Bloqueantes** = crítica/alta L2+ não mitigada → veredito BLOQUEADO
- **Debt** = restante — pode ship com plano datado se política permitir (Orquestrador PO)

## Evidence JSON

```json
"security_debt": {
  "total_items": 12,
  "critical": 3,
  "estimated_hours": 27,
  "blocking_ids": ["SEC-003", "CHAIN-01"]
}
```
