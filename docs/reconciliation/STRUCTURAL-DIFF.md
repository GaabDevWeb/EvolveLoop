# Structural Diff

## Executive Summary

`CursorSKILLS` e `AGENTS/Cursor` hospedam o **mesmo pacote** `@agents/orchestrator@2.0.0`. No `orchestrator/src`, **47/48** ficheiros TypeScript partilhados são **byte-idênticos**; a única pasta exclusiva em AGENTS é `src/jobs/` (4 módulos); a única diferença de conteúdo partilhado é `cli/run-jobs.ts`. Fora do `src`, CursorSKILLS é **superset** (mais Agents, contracts, providers, docs). **Git lineage útil não existe** (CS sem `.git`; AGENTS com `.git` vazio, zero commits).

## Repository Identity

| | CursorSKILLS | AGENTS/Cursor |
|--|--------------|---------------|
| Path | `/home/gaab/Downloads/CursorSKILLS` | `/home/gaab/Documentos/gitHub/AGENTS/Cursor` |
| Package | `@agents/orchestrator` 2.0.0 | identical |
| Scripts/deps | identical `package.json` | identical |
| Git | **absent** | parent `AGENTS/.git` **empty** (no commits, all untracked) |
| Self-declared SSOT | IMPLEMENTATION-STATUS aponta testes para AGENTS | IMPLEMENTATION-STATUS antigo (2026-07-02, “79+”) |

**Classificação:** `SAME_SYSTEM_DIFFERENT_VERSION` (+ natureza de **PARTIAL_COPY** no `orchestrator/src`).

## Git Lineage

- **CursorSKILLS:** sem repositório git → sem branch/HEAD/remotes/tags.
- **AGENTS:** `git status` → `main`, “No commits yet”; conteúdo `Cursor/`, `chatbot/`, etc. untracked.
- **Origem de `jobs/`:** não há commit de criação. Evidência só de filesystem: diretório `jobs/` ~2026-07-02; ficheiros ~2026-07-19.
- **Não se pode provar** remoção em CS, merge parcial, ou cherry-pick via git.

## Directory Differences

### orchestrator/src (crítico)

| | Count |
|--|-------|
| Common `.ts` | 48 |
| Identical content | 47 |
| Content differ | 1 (`cli/run-jobs.ts`) |
| Only AGENTS | 4 (`jobs/*.ts`) |
| Only CursorSKILLS | 0 |

### orchestrator (além de src)

- **Only CS:** vários `contracts/*.yaml`, providers (`code-reviewer`, `debugger`, `documentation`, `validator`, …), schemas extras.
- **Differ:** `IMPLEMENTATION-STATUS.md`, alguns `providers/*/provider.yaml`, `tests/unit/evidence.test.ts`.
- **Only AG:** `src/jobs/`.

### Workspace top-level

| Area | CS | AG |
|------|----|----|
| orchestrator | yes | yes |
| Agents | yes (superset) | yes |
| docs | yes (audit/research heavy) | yes |
| memory / scripts / mcp | CS only | — |
| Rules / GLOBAL-SETUP | both | both |

Ignorados como ruído: `node_modules`, caches, `.git` vazio.

## Runtime-Critical Differences

1. **`orchestrator/src/jobs/` ausente em CS** — `ExecutionEngine`, `index.ts`, CLIs e testes importam estes módulos → **load failure**.
2. **`run-jobs.ts`** — CS adiciona validação de ficheiro `--evidence` quando `--success`; AG não.
3. **`evidence.test.ts` (CS)** — 2 asserts novos sem mudança no `validator.ts` partilhado → falhas de teste (não bloqueiam load do engine se jobs existisse).

## Jobs Difference

Ver `JOBS-RECONCILIATION.md`. Resumo: quatro módulos (~284 LOC) só em AGENTS; **reachability real** no engine AG (checkpoint / JobStore / resume); CS tem o **mesmo** `execution-engine.ts` que chama APIs inexistentes localmente.

## Import Differences

Imports **iguais** nos dois trees para paths `../jobs/...`. Em CS esses targets **não resolvem**. Não há alias/workspace alternativo que remapeie `jobs`.

```yaml
broken_reference:
  source: CursorSKILLS/orchestrator/src/engine/execution-engine.ts
  target: ../jobs/job-store.js | job-resume.js | checkpoint.js
  exists_in: AGENTS/Cursor
  does_not_exist_in: CursorSKILLS
  impact: CRITICAL
```

## Test Differences

| | AGENTS | CursorSKILLS |
|--|--------|--------------|
| `npm test` (2026-09-18) | **103 passed** / 27 files | **89 passed**, **3 failed**, **92 collected**; 7 files failed |
| full-cycle | 5/5 pass | FAIL (load `jobs`) |
| evidence unit | 3 pass | 5 tests, 2 fail (drift) |
| job-pickup / job-resume | pass | load fail |

Ficheiros de teste: quase todos idênticos; **único diff** relevante: `evidence.test.ts`.

## Dependency Differences

`package.json` name/version/scripts/dependencies/devDependencies: **iguais**. `vitest` 2.1.9 presente em ambos (`node_modules` já instalado). Sem drift de lock relevante para explicar ausência de `jobs/`.

## Documentation Differences

- CS `IMPLEMENTATION-STATUS.md` (2026-09-17): SSOT testes = AGENTS; claim **103**; evolução platform Fases 2–7.
- AG `IMPLEMENTATION-STATUS.md` (2026-07-02): “79+”; ainda menciona retomada automática `run-jobs` na tabela antiga.
- Docs de audit em CS já assinalavam missing `jobs/` — **confirmado e reforçado**.

Claims “103” / “resume” **sem ler a linha SSOT** = `AMBIGUOUS_SCOPE` (parecem descrever CS, mas o texto aponta AGENTS).

## Other Architectural Differences

- Expansão de Agents/contracts em CS: **CONFIGURATION / DOCUMENTATION**, não substitui `jobs/`.
- Core IR→Scheduler→Registry→Provider: **idêntico** no `src` partilhado.
- Sem evidência de redesign que elimine a necessidade de `jobs/` em CS.

## Unknowns

- Quém/como copiou CS em 2026-09-17 sem `jobs/`.
- Se AGENTS `builders.ts` mtime 2026-09-18 reflete sync manual recente (conteúdo = CS).
- Remotes futuros / intenção de monorepo.
- Se existe outra cópia canónica fora destas duas árvores.
