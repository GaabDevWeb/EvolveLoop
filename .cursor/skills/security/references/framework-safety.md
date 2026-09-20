# Segurança do próprio framework

O gate toma decisões críticas — o **executor** deve ser auditável e seguro.

## Regras invioláveis do executor

| # | Regra |
|---|-------|
| 1 | **Nunca** ferramentas destrutivas por defeito (rm -rf, drop, flood) |
| 2 | **Separar** análise passiva (grep, read) vs testes activos (curl, scan) |
| 3 | **Confirmar** com utilizador antes de: prod, carga massiva, write no ambiente |
| 4 | **Registar** providers executados, tools, evidence levels, judge trace |
| 5 | **Respeitar** capability matrix — não afirmar L3 sem ter executado |
| 6 | **Legal** — só alvos autorizados; declarar limites no relatório |

## Classificação de acções

| Classe | Exemplos | Requer |
|--------|----------|--------|
| **Passiva** | read, grep, ast, npm audit read-only | nada |
| **Activa leve** | curl GET headers, jwt decode local | terminal; staging preferível |
| **Activa pesada** | brute force, fuzz, load test | confirmação explícita + deep mode |

`dynamic-pentest` só classe activa leve sem confirmação; pesada → pedir OK.

## Audit log (no relatório)

```markdown
### Framework Audit Log

| Timestamp | Provider | Action | Target | Evidence |
|-----------|----------|--------|--------|----------|
| — | dependency-reviewer | npm audit | package-lock | L4 |
| — | dynamic-pentest | curl -I | localhost:3000 | L3 |
```

## Falha segura

Erro de tool → não elevar confiança; marcar FN em coverage.

Provider crash → omitir merge desse provider; declarar no audit log.
