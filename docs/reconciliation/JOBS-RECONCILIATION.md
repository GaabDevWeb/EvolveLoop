# Jobs Reconciliation

## What Exists in AGENTS/Cursor

Path: `/home/gaab/Documentos/gitHub/AGENTS/Cursor/orchestrator/src/jobs/`

| File | LOC | Purpose | Key exports |
|------|-----|---------|-------------|
| `job-store.ts` | 74 | Persistência FS de `SkillJob` + `SkillJobResult` | `JobStore`, `SkillJob`, `SkillJobResult` |
| `job-pickup.ts` | 118 | Plano HITL / prompt de pickup / escrita de artefactos | `invokePickup`, `buildPickupPrompt`, `resolvePendingJob`, `writePickupArtifacts`, `PickupPlan` |
| `job-resume.ts` | 48 | Converter resultado externo → `ExecuteResult` | `jobResultToExecuteResult`, `loadEvidenceFile` |
| `checkpoint.ts` | 44 | Snapshot do grafo para `--resume` | `saveCheckpoint`, `loadCheckpoint`, `clearCheckpoint`, `EngineCheckpoint` |

**State model:** jobs como JSON em `jobsDir` (`{run_id}.json` + `{run_id}.result.json`); checkpoints em `jobsDir/checkpoints/{featureId}.json`.

**Serialization:** JSON filesystem; sem DB.

**HITL / interrupt / resume:** pickup CLI + engine `waiting` + poll `JobStore` + `jobResultToExecuteResult`; checkpoint save quando há nós `waiting`.

## What Exists in CursorSKILLS

- **Diretório `src/jobs/`:** inexistente.
- **Call sites idênticos:** `execution-engine.ts`, `index.ts`, `cli/run-jobs.ts`, `cli/run-engine.ts`, plugins com `JOB_PENDING`.
- **Testes** que importam jobs: presentes (discovery JobStore, job-pickup, job-resume, full-cycle).
- **Equivalente semântico com outro nome:** **não encontrado** (varredura de src: only_ag = exatamente estes 4 ficheiros).

## Import Graph

```text
run-engine / ExecutionEngine
  → jobs/checkpoint (save/load/clear)
  → jobs/job-store (poll completed)
  → jobs/job-resume (jobResultToExecuteResult)
  → JobFileExecutor / CursorSkillProvider (JOB_PENDING)

run-jobs CLI
  → jobs/job-store
  → jobs/job-pickup (invokePickup)

index.ts (public API)
  → re-exports all four modules

tests
  → same modules
```

Em **ambas** as árvores o grafo de imports é o mesmo. Em CursorSKILLS os targets estão **quebrados**.

## Runtime Reachability

### AGENTS/Cursor — REACHABLE

- `ExecutionEngine` importa e chama `JobStore`, checkpoint, `jobResultToExecuteResult` no path de `waiting` / `--resume` / `wait_for_jobs`.
- `npm test`: **103/103**; `full-cycle.test.ts` **5/5**; `job-resume.test.ts` passa.
- Conclusão: **não é dead code** — participa do execution path real e está coberto por testes.

### CursorSKILLS — UNREACHABLE (broken)

- Mesmo `execution-engine.ts` (byte-identical).
- Módulos ausentes → Vitest/Vite falha ao carregar suites; runtime não resolve imports.
- `run-jobs.ts` em CS tem **guard extra** de evidence path, mas ainda depende de `JobStore`/`invokePickup` ausentes.

## Tests

| Suite | AGENTS | CursorSKILLS |
|-------|--------|--------------|
| unit/job-pickup | pass | FAIL load |
| unit/discovery (JobStore) | pass | 1 fail (load JobStore) |
| integration/job-resume | pass | FAIL load |
| integration/full-cycle | pass | FAIL load |

## Git History

**Indisponível.** AGENTS `.git` sem commits; CS sem `.git`.  
Evidência temporal filesystem apenas: jobs ~Jul 2026; maior parte do CS `src` tocada/copiada ~2026-09-17 **sem** pasta jobs.

## Semantic Equivalents

```yaml
equivalence:
  source_a: AGENTS/Cursor/orchestrator/src/jobs/*
  source_b: CursorSKILLS/orchestrator/src/jobs/* (missing)
  semantic_role: external job store + HITL pickup + resume + engine checkpoint
  equivalence: DIFFERENT  # absence vs presence
  # No alternate module in CS fulfills JobStore/checkpoint APIs
  evidence:
    - only_ag file list = 4 job modules
    - identical callers in CS without callees
```

`run-jobs.ts` (ambos):

```yaml
equivalence:
  source_a: AGENTS/.../cli/run-jobs.ts
  source_b: CursorSKILLS/.../cli/run-jobs.ts
  semantic_role: CLI for list/pickup/invoke/complete
  equivalence: SUPERSET  # CS adds evidence file existence check on success
  evidence: unified diff (existsSync + artifact_missing)
```

## Competing Hypotheses

| ID | Status | Notes |
|----|--------|-------|
| H1 never ported | **SUPPORTED** | Missing dir + identical callers |
| H2 intentional removal | **REJECTED** | Exports/tests/docs still expect jobs |
| H3 other branch | **REJECTED** | No usable git history |
| H4 other project | **REJECTED** | Same package/engine |
| H5 incomplete copy | **SUPPORTED** | 47/48 identical; jobs omitted |
| H6 AG later version | **WEAK** | AG more complete; CS newer mtimes on other files |
| H7 AG experimental | **REJECTED** | SSOT + 103 green |
| H8 architectural divergence | **PLAUSIBLE** only for Agents/contracts packaging; **not** for jobs |
| H9 dual SSOT workflow | **PLAUSIBLE** | Explicit SSOT line in CS docs |

## Conclusion

`jobs/` em AGENTS/Cursor **pertence ao mesmo runtime** que o orchestrator de CursorSKILLS. Em CS a ausência é uma **lacuna de cópia/port**, não um redesign. O módulo está **integrado e testado** em AGENTS; em CS as referências existem mas o código não.

Sincronizar é **tecnicamente justificado** para integridade do runtime; deve preservar o delta CS em `run-jobs.ts` e tratar `evidence.test.ts` à parte.

## Confidence

**HIGH** para: same system; jobs required by CS imports; AG jobs reachable; CS broken without them.  
**MEDIUM** para: exact historical copy event (no git).  
**HIGH** para: não há equivalente semântico em CS.
