# CEO Controller — ritual externo para `/evolve` + Execution Engine

Este documento descreve como um **CEO Agent** (controlador externo) dirige o ciclo EvolveLoop **sem código novo no CEO**, reutilizando apenas mecanismos já presentes no repositório: `run-engine`, `run-jobs invoke|complete|reopen`, checkpoints HMAC, Evidence Bus e `.agent_history.md`.

## Papéis

| Papel | Responsabilidade |
|--------|------------------|
| **CEO** | Policy, SSOT (`[ESTADO ATUAL]`), `run-engine`, `invoke`, follow-ups, `resume`, Matriz `continuar\|corrigir\|replanejar` |
| **Worker Cloud** | Executa `current-job.md` / pickup: lê `SKILL.md`, produz evidence real, `run-jobs complete` |
| **Engine (TS)** | DAG, `JOB_PENDING`, checkpoint em `jobs/checkpoints/<feature_id>.json` |

## Ritual (um SkillJob)

1. **CEO** — `npm run run-engine -- --ir memory/<feature_id>/plan.ir.yaml --feature-id <id> --jobs-dir <dir> --discovery [--resume]`
2. **Interpretar saída**
   - `blocked_reason: awaiting_external_jobs` e `success: false` → **handoff normal**, não falha catastrófica.
   - Exit code `1` é esperado neste estado.
3. **CEO** — `npm run run-jobs -- invoke --jobs-dir <dir> --prompt-dir <pickup>`
4. **CEO** — enfileirar follow-up ao worker com o conteúdo de `prompt_path` (`current-job.md`, igual a `buildPickupPrompt`).
5. **Worker** — seguir pickup; gravar evidence; `run-jobs complete --success --evidence <path>`.
6. **CEO** — `run-engine --resume` (mesmo IR, `feature_id`, `jobs-dir`).
7. Repetir até `success: true` e `state: completed`, ou aplicar outer loop (`orquestrar` / `.agent_history.md`).

## Estado da missão

| Artefacto | Caminho |
|-----------|---------|
| IR | `memory/<feature_id>/plan.ir.yaml` |
| Evidence Bus | `memory/<feature_id>/evidence/*.json` |
| SkillJobs | `<jobs-dir>/<run_id>.json` |
| Checkpoint DAG | `<jobs-dir>/checkpoints/<feature_id>.json` (HMAC: `EVOLVELOOP_CHECKPOINT_HMAC_KEY`) |
| Decisões | `.agent_history.md` (append-only) |

Variáveis opcionais via `~/.cursor/agents.env` (sem substituir flags CLI): `ORCHESTRATOR_JOBS_DIR`, `ORCHESTRATOR_PROMPT_DIR`, `AGENTS_ROOT`, `ORCHESTRATOR_ROOT`.

## Falhas e recuperação

| Situação | Acção CEO |
|----------|-----------|
| Follow-up perdido | `run-jobs list` → `pending: 1`; reenviar invoke; checkpoint ainda válido |
| `complete` sem `resume` | Job `completed`, nó `waiting`; só `run-engine --resume` |
| `LINEAGE_MISMATCH` (evidence `run_id`/`node_id`) | `run-jobs reopen --run-id <id>` → worker corrige evidence → `complete` → `resume` |
| Checkpoint HMAC inválido | Novo `feature_id` ou restaurar chave; não simular sucesso |
| `simulated_evidence` em capability sem provider | IR sem provider real (ex.: `api-contract` no fixture completo); usar subgrafo ou provider futuro |

## Limites

- CEO **não** substitui gates markdown (`gate.testing.json` no Evidence Bus) quando o fluxo é `/evolve` puro sem engine.
- Hook `stop` em desktop emite o mesmo corpo que `invoke` (L1); em Cloud o CEO enfileira o follow-up explicitamente.
- PDA (`Task`, `GATE_BUNDLE`) continua no contrato `orquestrar`; o engine só cobre capabilities com `provider.yaml` + `cursor-skill`.

## Referências

- `orchestrator/src/jobs/job-pickup.ts` — `buildPickupPrompt`
- `orchestrator/README.md` — CLI jobs / resume
- `.cursor/skills/orquestrar/SKILL.md` — SSOT e Matriz
