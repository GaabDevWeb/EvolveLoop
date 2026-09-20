# EvolveLoop V1 — Operations

**Mode:** Observation-first. Default **OFF**. Architecture **frozen** at `baseline-v7-2026-09-19`.

## Enable

```bash
cd "$ORCHESTRATOR_ROOT"   # …/CursorSKILLS/orchestrator
npm run build             # if using dist CLI
node dist/cli/run-engine.js \
  --ir path/to/ir.yaml \
  --evolve \
  --evolve-scope-type USER \
  --evolve-scope-id <user-id> \
  [--jobs-dir ./jobs] \
  [--data-dir ./data]
```

SYSTEM scope:

```bash
--evolve --evolve-scope-type SYSTEM --evolve-scope-id system --evolve-authorize-system
```

**Required on events:** for USER attach, payloads must include `user_id`. Missing identity → deferred (not stamped).

## Disable

Omit `--evolve` (default). Or construct `ExecutionEngine` without `evolveLoop` / `evolveCoordinator`. Runtime continues normally.

## Observation-first policy (first real use)

Enable EvolveLoop to:

1. Observe EventBus failures/blocks/retries  
2. Persist signals  
3. Auto-analyze when cadence fires  
4. Propose `EvolutionRequest` (PROPOSE ceiling)  

Do **not**:

- Auto-approve / apply core or runtime mutations  
- Treat ControlledGateFixture as production gate  
- Treat unlabeled `.gate.json` as trusted  

## Where state lives

Under `evolutionDir` (CLI: `<dataDir|jobsDir>/evolveloop` or temp):

| Artifact | Path (typical) |
|----------|----------------|
| Signals | `signals.jsonl` (via PersistentSignalStore) |
| Needs | needs store file under evolution dir |
| Outcomes | outcomes append |
| Observation windows | `observation-windows.jsonl` |
| Handoff requests | `handoffDir/<requestId>.json` |
| Gate results | `handoffDir/<requestId>.gate.json` |
| Gate provenance | `handoffDir/<requestId>.gate.provenance.json` |

Exact filenames follow `PersistentSignalStore` / loop options — inspect the configured `evolutionDir`.

## Inspect

There is **no** separate `evolve status|inspect` CLI. Use:

1. Read JSONL / store files under `evolutionDir`  
2. Programmatic: `loop.getStore().query({ user_id })`, `loadNeeds()`, `loadOutcomes()`  
3. Coordinator: `getLastResult(scope)`, `getWindows().list()`  

## Safe reset

Delete or archive a **single** `evolutionDir` used for an experiment.

**Never delete:**

- `docs/evals/baseline-v*`  
- Architecture docs under `docs/architecture/evolveloopt/`  
- Evidence under `memory/*/evidence/`  

## Failure modes

| Symptom | Action |
|---------|--------|
| No signals | Confirm `--evolve` and payload `user_id` / scope identity |
| Deferred identity | Events missing required ids — fix emitters |
| Analysis boom | Non-blocking; check `onAnalysisFailed` / logs |
| Untrusted gate | Add explicit `gate_source` / fixture note before opening windows |

## Real-world loop (controlled)

```text
REAL TASK → REAL EVENT → SIGNAL → HISTORY → PATTERN → NEED
→ CANDIDATE → EvolutionRequest → EXTERNAL GATE (human/policy)
→ (only if trusted APPROVED) WINDOW → OUTCOME → afterOutcome → NEXT ANALYSIS
```

First real evolution must carry: originating need, evidence, candidate, gate decision, rollback plan, evaluation, post-change observation.
