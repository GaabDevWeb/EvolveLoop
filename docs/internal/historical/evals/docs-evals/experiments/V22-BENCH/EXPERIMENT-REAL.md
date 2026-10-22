# V22-BENCH — corpus real EvolveLoop

## Classificação

| Bateria | Classificação | Raw |
|---------|---------------|-----|
| `synth-repo` | `PROVISIONAL_SYNTHETIC` | `raw/battery/` |
| Monorepo `/workspace` | `OFFICIAL_BASELINE` | `raw/battery-real/` |

## Tarefas congeladas (`tasks-real-frozen.json`)

| ID | Pergunta | Gabarito (file:line) |
|----|----------|----------------------|
| R01 | Algoritmo integridade checkpoint | `orchestrator/src/jobs/checkpoint.ts:10` → `HMAC-SHA256` |
| R02 | Env chave HMAC | `orchestrator/src/jobs/checkpoint.ts:12` → `EVOLVELOOP_CHECKPOINT_HMAC_KEY` |
| R03 | `RAG_REPO_MISSING` | `orchestrator/src/knowledge/backend/wiki-backend.ts:141` |
| R04 | ADR adia compaction | `docs/architecture/finalization/adrs/ADR-DR-0005-context-ownership-before-compaction.md:23` |
| R05 | memory no default | `profiles/default.yaml:12` → `enabled: false` |
| R06 | GATE_BUNDLE ausente | `.cursor/skills/orquestrar/references/gate-bundle.md:4` → `missing_gate_bundle` |

## B1 (mecanismo declarado)

- **Usado:** pacote `.ai/` em `fixtures/evolveloop-project-knowledge/` (ranking por keywords + `source_paths`).
- **Não medido:** `ground.sh` / vault (`WIKI_ROOT` ausente no VM).

## Continuidade (cenários 3 e 7)

Fixture `fixtures/continuity-s37/` — mini-repo com `.ai/pages/decision-freeze-pin.md` e ruído `rg`.

| ID | Braços | Gabarito |
|----|--------|----------|
| S03 | B0, B1 | `.ai/pages/decision-freeze-pin.md:8` → `release/v2.1-freeze-preparation` |
| S07 | B1 | mesma linha + página citada em `paths_read` |
