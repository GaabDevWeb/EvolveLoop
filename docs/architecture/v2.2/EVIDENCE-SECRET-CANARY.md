# V2.2 — Canário de segredos em evidência (V22-GOAL-007)

| Campo | Valor |
|-------|-------|
| **Meta** | V22-GOAL-007 |
| **Módulo** | `orchestrator/src/evidence/secret-redaction.ts` |
| **Publicação** | `serializeEvidenceForPublish` em `publish-sanitize.ts` |
| **Retrieval** | excerpts wiki passam por `redactSecrets` em `wiki-backend.ts` |

## Canário de teste

String fixa do plano V22-BENCH (fixture apenas, **não** segredo real):

`SUPERSECRETO_NAO_LOGAR`

Critério: **0** ocorrências em JSON de evidência publicada após sanitização.

## Testes

| Critério | Teste |
|----------|-------|
| 0× canário em evidence | `secret-redaction.test.ts` — published evidence JSON |
| Redação mínima | `secret-redaction.test.ts` — redacts fixture canary |
| Paths de código preservados | `secret-redaction.test.ts` — redacts common secret patterns |
