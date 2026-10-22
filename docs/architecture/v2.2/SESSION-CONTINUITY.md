# Continuidade de sessão (V22-GOAL-004)

Fluxo de laboratório no engine (opt-in via `dataPaths` + `resume`), sem exigir `memory.enabled` no perfil público.

## Componentes

| Peça | Caminho |
|------|---------|
| Checkpoint HMAC do grafo | `orchestrator/src/jobs/checkpoint.ts` → `jobs/checkpoints/<feature_id>.json` |
| Snapshot de continuidade | `orchestrator/src/session/session-continuity.ts` → `memory/<feature_id>/session-continuity.json` |
| Evidência (bus + redaction) | `memory/<feature_id>/evidence/continuity.json` via `evidence-bus` |
| Decisões de sessão | `session_decision:<texto>` em `assumptions` da evidence → `memory/<feature_id>/decisions.yaml` |

## Retomada

1. `ExecutionEngine.run({ resume: true })` carrega checkpoint (valida HMAC) e `session-continuity.json`.
2. `satisfied_job_run_ids` evita re-ingestão de jobs externos já aplicados.
3. `next_action` descreve o nó em `awaiting_external_job`.
4. Sucesso limpa checkpoint e `session-continuity.json`.

## Wiki / episódico (host)

Procedimento opt-in com skill `wiki-mem` e `.ai/sessions` permanece documentado em `EVOLVELOOP_V2.2_GOALS.md`; este arquivo cobre apenas o braço engine+fixture.

## Verificação

- Integração: `orchestrator/tests/integration/v22-session-continuity.integration.test.ts`
- Unitário: `orchestrator/tests/unit/session-continuity.test.ts`
