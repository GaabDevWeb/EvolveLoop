# Test Reconciliation

## Commands and configuration

| Tree | Cwd | Command | Config |
|------|-----|---------|--------|
| AGENTS/Cursor | `.../AGENTS/Cursor/orchestrator` | `npm test` → `vitest run` | package.json scripts identical |
| CursorSKILLS | `.../CursorSKILLS/orchestrator` | `npm test` → `vitest run` | identical |

**Commit:** N/A (sem commits utilizáveis em ambas).

**Date measured:** 2026-09-18.

## Test counts (full suite)

| Metric | AGENTS/Cursor | CursorSKILLS |
|--------|---------------|--------------|
| Test files | 27 passed | 7 failed / 20 passed |
| Tests collected | 103 | 92 |
| Passed | **103** | **89** |
| Failed (assertions) | 0 | **3** |
| Suites failing at load | 0 | full-cycle, engine-scenarios, job-resume, persistence (integration), job-pickup |

Diferença ~11 testes: suites que em CS **não chegam a registar** casos por falha de resolução `src/jobs/*`.

## Claim: “103 tests”

| Field | Value |
|-------|-------|
| Origin doc | `CursorSKILLS/orchestrator/IMPLEMENTATION-STATUS.md` (também `docs/architecture-current.md`) |
| Exact wording | `AGENTS \`npm test\` \| **103** passed` |
| SSOT line | `SSOT testes: AGENTS/Cursor/orchestrator` |
| Tree | **AGENTS/Cursor only** |
| Reproduced | **YES** — `npm test` → `Tests 103 passed (103)` |
| Not a property of | CursorSKILLS tree as currently on disk |

## Claim: “43 pass / 2 fail”

| Field | Value |
|-------|-------|
| Origin | `docs/audit/IMPLEMENTATION-AUDIT-EXECUTIVE.md` (Implementation Auditor, 2026-09-18) |
| Scope | **Selected unit slice**, not full `npm test` |
| Failures cited | `evidence.test.ts` drift (2) |
| Full suite now | 89 pass / 3 fail assertions (+ load failures reducing collected count) |
| Classification | Prior number = **partial run**; still consistent with evidence drift subset |

## Claim: “full-cycle”

| Tree | Result | Reason |
|------|--------|--------|
| AGENTS | **PASS** (5/5) | jobs modules present |
| CursorSKILLS | **FAIL** (file load) | `Failed to load url ../../src/jobs/...` |

## Claim: “contracts 7/7”

- Ficheiro: `tests/contracts/contract-prototype.test.ts` (presente em ambos).
- Incluído no suite AGENTS 103 (7 tests no ficheiro, suite verde).
- Auditoria anterior: 7/7 no slice de contracts em CS — **compatível** (contracts não dependem de `jobs/`).

## Tests only / common

| Category | Finding |
|----------|---------|
| Only in one tree | **Nenhum** ficheiro de teste exclusivo relevante; lists alinhadas |
| Common with different content | **`tests/unit/evidence.test.ts`** only |
| Same tests, different outcome | Jobs-dependent suites: pass AG / fail-load CS |

### evidence.test.ts drift

```text
AG (Jul): 3 tests — all pass with shared validator.ts
CS (Sep): +2 tests expecting artifact_path_missing / artefact path on gate evidence
validator.ts: IDENTICAL across trees
builders.ts: IDENTICAL
```

**Classification:** `TEST_DRIFT` (testes CS à frente da implementação partilhada).  
Não é `TREE_DIVERGENCE` da validator; não é bug de jobs.

## Evidence drift vs jobs failures

| Failure | Class |
|---------|-------|
| Missing `jobs/` load errors | `TREE_DIVERGENCE` / incomplete copy |
| 2 evidence asserts | `TEST_DRIFT` |
| discovery JobStore case | consequence of missing `job-store.ts` |

## Passing / failing inventory (CursorSKILLS full run)

**Assertion failures (3):**

1. `discovery.test.ts` › JobStore › lists and completes pending jobs (module missing)
2. `evidence.test.ts` › requires gate artefact path
3. `evidence.test.ts` › accepts gate evidence with artefact path

**Load-level file failures:** full-cycle, engine-scenarios, job-resume, integration/persistence, job-pickup.

## Confidence

**HIGH** na atribuição do “103” a AGENTS e na reprodução.  
**HIGH** na causa jobs para full-cycle CS.  
**HIGH** em TEST_DRIFT para evidence.  
**MEDIUM** no número exacto “43” histórico (slice não re-executado byte-a-byte; executive doc é a fonte).
