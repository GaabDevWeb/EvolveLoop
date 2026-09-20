# EvolveLoop Independent Audit — Starting State

**Audit started:** 2026-09-19T15:17Z (agent session)  
**Mode:** PHASE A — read-only reconciliation (no product code changes during this document’s production)  
**Evidence priority:** executed behavior > tests run > source > contracts > artifacts > docs > prior agent report

## Environment (OBSERVED)

| Field | Value |
|-------|-------|
| OS | Linux 6.12.88+deb13-amd64 (x86_64) |
| Node | v24.15.0 |
| Package manager | npm |
| Runtime | Node ESM (`"type":"module"`) |
| Test runner | vitest 2.1.9 |
| Architecture | amd64 |
| Working tree | `/home/gaab/Downloads/CursorSKILLS/orchestrator` |

## Repository layout (OBSERVED)

- Longitudinal package: `orchestrator/src/evolveloop/**`
- Episodic controller still present: `controller.ts`, `store.ts`, detectors
- Longitudinal additions: `longitudinal-controller.ts`, `persistence/`, `aggregation/`, `lifecycle/`, `outcome/`, `diagnosis/`, `adapters/`
- Docs: `docs/architecture/evolveloopt/` + prior `docs/architecture/evolution/`
- Schemas dir `docs/architecture/evolveloopt/schemas/` exists but is **empty** (OBSERVED)
- Wiki (GaabWiki scout): **no EvolveLoop contracts** — GAP; validation is code-local

## Prior agent claims (DOCUMENTED — not yet verified as correct)

From `LONGITUDINAL-STATUS.yaml` / implementation report:

- Persistent observation / cross-run / need / RCA / candidates: IMPLEMENTED
- Core candidate: IMPLEMENTED_HOLD
- Outcome / closed-loop: IMPLEMENTED_WITH_LIMITATIONS
- Tests 135/135, contracts 7/7, full-cycle 5/5
- Final: SUCCESS_WITH_LIMITATIONS
- Self-noted gaps: empty-after IMPROVED risk; lifecycle overwrite; analyze() whole-store; adapters mostly NOT_CONNECTED

## Baselines (MEASURED checksums from each baseline directory)

| Baseline | Path | Self-checksum | Critical fingerprints vs current `orchestrator/` |
|----------|------|---------------|--------------------------------------------------|
| V1 | `docs/evals/baseline` (id `baseline-v1-2026-09-18`) | PASS | 20 OK, **1 DRIFT** `src/index.ts` (expected post-V1 exports) |
| V2 | `docs/evals/baseline-v2-2026-09-19` | PASS | Episodic evolveloop OK; **DRIFT** `src/evolveloop/index.ts`, `src/index.ts` (longitudinal exports) |
| V3 | `docs/evals/baseline-v3-2026-09-19` | PASS | All listed files **OK** including longitudinal core |

Naming note: claim `baseline-v1-2026-09-18` maps to folder `docs/evals/baseline` (OBSERVED).

## Tests at audit start (EXECUTED)

```
vitest run → Test Files 29 passed; Tests 135 passed (135)
```

EvolveLoop suites: `evolveloop.test.ts` 17 + `longitudinal.test.ts` 15 = 32 (OBSERVED).

## Component map (IMPLEMENTED names in source)

| Role | Class / module |
|------|----------------|
| Signal mining | `SignalMiner` |
| Episodic patterns | `PatternDetector` |
| Persistent store | `PersistentSignalStore` |
| Cross-run aggregation | `CrossRunAggregator` |
| Need + lifecycle | `LongitudinalNeedDetector` |
| RCA | `RootCauseAnalyzer` (+ table map) |
| Registry-aware advice | `diagnoseWithInventory` (injected inventory) |
| Candidates | `EvolutionCandidateGenerator` + `CandidateValidator` |
| Handoff | `buildEvolutionRequest` / `submitEvolutionRequest` |
| Outcome | `OutcomeTracker` |
| Controller | `LongitudinalEvolveLoop` (`ingest` → `analyze` → `recordOutcome`) |
| Adapters | `ADAPTER_REGISTRY` + `adaptJsonlEventsFile` |

## Eight focus findings — preliminary (to be confirmed in AUDIT-MATRIX)

See adversarial harness results in `/tmp/evolveloop-adversarial-findings.json` (EXECUTED outside tree via `vite-node`).

## Audit artifact target

`docs/architecture/evolveloopt/validation/`
