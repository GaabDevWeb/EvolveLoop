# EvolveLoop Implementation Report

## Starting State

baseline-v1-2026-09-18; 103/103 tests; no prior evolveloop code; PatternAggregator in-run only.

## Architecture Reconciliation

Placed in `orchestrator/src/evolveloop/`. Reused telemetry/evidence/events/learning conceptually; no second registry/evidence/RAG.

## Signal System

`SignalMiner` — normalize + dedupe RawObservation → NeedSignal. Synthetic flagged.

## Pattern Detection

`PatternDetector` — rolling 168h window; min frequency 3; USER_LOCAL vs CORE_CANDIDATE cross-pass.

## Need Detection

`NeedDetector` — confidence from frequency + source diversity; LOW → INSUFFICIENT_EVIDENCE.

## Root Cause Analysis

`RootCauseAnalyzer` — primary + alternatives + uncertainties (suspected, not proven).

## Evolution Candidates

Prefer KNOWLEDGE/SKILL/CAPABILITY before AGENT/RUNTIME; always NO_CHANGE alternative when evolving.

## User vs Core Evolution

USER_LOCAL → may SUBMIT_TO_PROTOTYPE_GATE. CORE_CANDIDATE → **HOLD** (no auto Core).

## Autonomy Model

Ceiling **PROPOSE**. `mutates_core` / `mutates_runtime` always false at this layer.

## Agent / Skill / Capability Authoring Integration

Candidates target `agent_authoring` / `skill_authoring` / `capability_registry` as handoff labels — no direct authoring execution.

## Architecture Pipeline Integration

`EvolutionRequest` JSON → existing Prototype Gate / architecture evolution path. No parallel workflow.

## Evaluation Harness

SyntheticFixtures + 17 tests including EV-EVOLVE-001, FP/FN, scope, dedupe, adversarial depth.

## Adversarial Testing

Independent review: PASS_WITH_LIMITATIONS. Mitigated CORE HOLD + source diversity; remaining: parallel PatternAggregator, evidence-as-IDs, handoffDir path trust.

## End-to-End Results

Synthetic e2e produces signal→…→request without unauthorized mutation.

## Regression Results

**120/120** tests (7 contracts, 5 full-cycle within suite).

## Final Architecture

Docs under `docs/architecture/evolveloopt/`. Code matches docs for gated proposal loop.

## Security

Read-heavy; no self-grant; no policy bypass; core HOLD.

## Limitations

- Not fully autonomous implementation
- LLM not used in deterministic core (optional future)
- Live production telemetry adapters beyond synthetic fixtures are thin (adapters can wrap JSONL later)
- PatternAggregator (in-run) not yet composed into EvolveLoop offline path

## Unsupported Claims

See updated `docs/architecture/evolution/UNSUPPORTED-CLAIMS.yaml` (+ EvolveLoop claims).

## Open Questions

Historical gaps unchanged + EvolveLoop→live telemetry wiring.

## Baseline

- V1: preserved
- V2: `baseline-v2-2026-09-19`

## Final Status

```text
SUCCESS_WITH_LIMITATIONS
```
