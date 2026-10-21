# CEO Controller — ritual externo para `/evolve` + Execution Engine

Este documento descreve como um **CEO Agent** (controlador externo) dirige o ciclo EvolveLoop **sem código novo no CEO**, reutilizando apenas mecanismos já presentes no repositório: `run-engine`, `run-jobs invoke|complete|reopen`, checkpoints HMAC, Evidence Bus e `.agent_history.md`.

## Papéis

| Papel | Responsabilidade |
|--------|------------------|
| **CEO** | Policy, SSOT (`[ESTADO ATUAL]`), `run-engine`, `invoke`, follow-ups, `resume`, Matriz `continuar\|corrigir\|replanejar` |
| **Worker Cloud** | Executa `current-job.md` / pickup: lê `SKILL.md`, produz evidence real, `run-jobs complete` |
| **Engine (TS)** | DAG, `JOB_PENDING`, checkpoint em `jobs/checkpoints/<feature_id>.json` |

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `ORCHESTRATOR_ROOT` | Raiz do pacote `orchestrator` (onde correr `npm run run-jobs` / `run-engine`). Os comandos em `current-job.md` usam `cd $ORCHESTRATOR_ROOT && …`. Se omitida, o CLI usa `process.cwd()`. |
| `EVOLVELOOP_CHECKPOINT_HMAC_KEY` | HMAC do checkpoint (`jobs/checkpoints/<feature_id>.json`). Gravar em ficheiro (ex. `/tmp/<missão>/.hmac-key`); **nunca** commitar nem imprimir em relatórios. |
| `ORCHESTRATOR_JOBS_DIR`, `ORCHESTRATOR_PROMPT_DIR`, `AGENTS_ROOT` | Opcionais via `~/.cursor/agents.env` (não substituem flags CLI). |

**Cloud Agent:** exportar explicitamente, por exemplo:

```bash
export ORCHESTRATOR_ROOT=/workspace/orchestrator
export EVOLVELOOP_CHECKPOINT_HMAC_KEY="$(cat /tmp/ceo-real/.hmac-key)"
cd "$ORCHESTRATOR_ROOT"
```

## Ritual completo (dois SkillJobs — backend → testing)

IR de referência: subgrafo `be-auth` + `test-suite` (mesmo padrão que `discovery-skilljobs`), por exemplo em `/tmp/<missão>/memory/<feature_id>/plan.ir.yaml`.

### 1. Arranque (CEO)

```bash
cd "$ORCHESTRATOR_ROOT"
npm run run-engine -- \
  --ir "/tmp/<missão>/memory/<feature_id>/plan.ir.yaml" \
  --feature-id <feature_id> \
  --jobs-dir "/tmp/<missão>/jobs" \
  --discovery
```

**Esperado:** `blocked_reason: awaiting_external_jobs`, `success: false`, **exit code 1** (handoff normal).

### 2. Pickup (CEO)

```bash
npm run run-jobs -- invoke \
  --jobs-dir "/tmp/<missão>/jobs" \
  --prompt-dir "/tmp/<missão>/pickup"
```

Enfileirar follow-up ao worker com `prompt_path` (`current-job.md`). O markdown inclui `cd $ORCHESTRATOR_ROOT && npm run run-jobs -- complete …`.

### 3. Worker (cada job)

1. Ler `SKILL.md` indicado no pickup.
2. Executar briefing com evidence **honesta** (comandos reais de verificação).
3. Gravar evidence em `/tmp/<missão>/memory/<feature_id>/evidence/` com `metadata.run_id` e `metadata.node_id` iguais ao SkillJob.
4. Correr o comando **literal** da linha “Sucesso” em `current-job.md` (ou equivalente com o mesmo `run-id` e `--evidence`).

### 4. Resume (CEO)

```bash
npm run run-engine -- \
  --resume \
  --ir "/tmp/<missão>/memory/<feature_id>/plan.ir.yaml" \
  --feature-id <feature_id> \
  --jobs-dir "/tmp/<missão>/jobs" \
  --discovery
```

Repetir **invoke → worker → complete → resume** até `success: true`, `state: completed`, **exit code 0**.

### 5. Shutdown

Quando o grafo termina com sucesso, o ficheiro `jobs/checkpoints/<feature_id>.json` é **removido**. Uma nova missão com o mesmo IR exige **`run-engine` inicial** (sem `--resume`), novo `feature_id` ou diretório `jobs` limpo.

## Estado da missão

| Artefacto | Caminho |
|-----------|---------|
| IR | `memory/<feature_id>/plan.ir.yaml` (ou path absoluto em `/tmp/…`) |
| Evidence Bus | `memory/<feature_id>/evidence/*.json` |
| SkillJobs | `<jobs-dir>/<run_id>.json` + `<run_id>.result.json` após `complete` |
| Checkpoint DAG | `<jobs-dir>/checkpoints/<feature_id>.json` (enquanto a feature não concluiu) |
| Pickup | `<prompt-dir>/current-job.md` |
| Decisões | `.agent_history.md` (append-only) |

## Falhas e recuperação

| Situação | Acção CEO / worker |
|----------|-------------------|
| Follow-up perdido | `run-jobs list` → `pending: 1`; `invoke` de novo; checkpoint ainda válido |
| `complete` sem `resume` | Job `completed`, nó `waiting`; só `run-engine --resume` |
| Worker interrompido (job `pending`) | `resume` **não** avança o DAG; **não** duplica job se o nó continua `waiting` com o mesmo `run_id` |
| `LINEAGE_MISMATCH` (`run_id` / `node_id` na evidence ≠ job) | `complete` grava ficheiro, mas `resume` **não** satisfaz o nó → `run-jobs reopen --run-id <id>` → worker corrige evidence → `complete` → `resume` |
| `reopen` em job já `pending` | **Exit code 2**, mensagem `REOPEN_NOT_ALLOWED` (stderr). Reopen só para jobs `completed` ou `failed`. |
| Checkpoint HMAC inválido | Novo `feature_id` ou restaurar chave; não simular sucesso |
| `api-contract` sem provider | IR com nó `api-contract` no fixture completo não tem provider `cursor-skill`; usar **subgrafo** (ex. só `backend-implementation` + `testing`) ou provider futuro |

## Desktop vs Cloud

| Ambiente | Pickup |
|----------|--------|
| **Cursor Desktop** | Hook `stop` pode emitir o mesmo corpo que `invoke` (L1); ver `orchestrator-job-pickup.sh`. |
| **Cloud Agent** | CEO deve **`invoke`** e enfileirar follow-up ao worker explicitamente (não há hook `stop`). |

## Limites

- CEO **não** substitui gates markdown (`gate.testing.json` no Evidence Bus) quando o fluxo é `/evolve` puro sem engine.
- PDA (`Task`, `GATE_BUNDLE`) continua no contrato `orquestrar`; o engine só cobre capabilities com `provider.yaml` + `cursor-skill`.

## Referências

- `orchestrator/src/jobs/job-pickup.ts` — `buildPickupPrompt`, `resolveOrchestratorRoot`
- `orchestrator/src/cli/run-engine-env.ts` — `ORCHESTRATOR_ROOT`
- `orchestrator/README.md` — CLI jobs / resume
- `.cursor/skills/orquestrar/SKILL.md` — SSOT e Matriz
