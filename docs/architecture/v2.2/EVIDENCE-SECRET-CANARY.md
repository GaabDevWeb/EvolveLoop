# V2.2 — Canário de segredos em evidência (V22-GOAL-007)

| Campo | Valor |
|-------|-------|
| **Meta** | V22-GOAL-007 |
| **Módulo** | `orchestrator/src/evidence/secret-redaction.ts` |
| **Publicação** | `evidence-bus.ts` + `serializeEvidenceForPublish` / `serializeForPublish` / `serializeJsonlForPublish` |
| **Runtime wired** | `JobStore.completeJob`, `job-pickup` (`current-job.*`), `ExecutionEngine` (evidence bus + `run-summary.json`), `JsonlEventPersister`, `run-engine` stdout, `JobFileExecutor` |
| **Retrieval** | excerpts wiki passam por `redactSecrets` em `wiki-backend.ts` (`mapGaabwikiHit`) |

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
