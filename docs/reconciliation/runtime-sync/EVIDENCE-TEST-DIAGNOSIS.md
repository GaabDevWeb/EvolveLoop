# evidence.test.ts — Diagnosis (pre-change)

## Paths

- CS: `orchestrator/tests/unit/evidence.test.ts` (5 tests)
- AG: `orchestrator/tests/unit/evidence.test.ts` (3 tests)

## Observations

1. `validateEvidence` → `validateEvidenceV21` in `builders.ts` — **identical** AG↔CS.
2. `validateEvidenceV21` reasons include: `evidence_incomplete`, `confidence_below_threshold`, `critical_gaps_declared`, `dod_failed:*`, `gate_verdict_missing`, `gate_rejected`.
3. **No** `artifact_path_missing` string exists anywhere in orchestrator `src/`.
4. `buildGateEvidence` sets `artifacts: []` and does **not** populate `spec.artifacts` with paths.
5. CS tests added Sep 2026 expect:
   - empty artifacts → `valid: false`, `reason: "artifact_path_missing"`
   - default `buildSuccessEvidence(gate)` → `artifacts[0].path` truthy
6. AGENTS SSOT suite (103/103) uses the 3-test file without those asserts.

## Answers

| Question | Answer |
|----------|--------|
| implementation changed? | No (validator/builders identical across trees) |
| contract changed in code? | No — gate artefact path not enforced |
| test outdated / ahead? | **Ahead** — asserts unimplemented rule |
| expected behavior changed? | Only in CS test file, not in runtime |
| tree divergence? | Test-only on CS |

## Classification

```text
TEST_IS_STALE
```

relative to the **implemented** Evidence contract (AGENTS runtime SSOT).  
Not `IMPLEMENTATION_IS_WRONG` for this sync — implementing `artifact_path_missing` would be a **contract behavior change** outside Controlled Runtime Sync scope.

## Reconciliation decision

- Align active `evidence.test.ts` to AGENTS proven 3-test suite (restore coherence with implemented validator).
- Archive the two aspirational CS asserts under `runtime-sync/DEFERRED-evidence-gate-artefact-asserts.md` so intent is not lost.
- Do **not** modify `builders.ts` / `validator.ts` in this operation.
