# V2 SE-07 Benchmark Results

**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Suite:** `npx vitest run` → **685/685**

## Deterministic framework proof

| Check | Result |
|-------|--------|
| E2E Benchmark composition | PASS |
| PRD/Brief input | PASS |
| Requirements (SE-01) | PASS |
| Architecture (SE-02) | PASS |
| TaskGraph (SE-03) | PASS |
| Supervisor (SE-04) | PASS |
| AgentExecutor | PASS |
| EngineeringWorker (SE-05) | PASS |
| Workspace effects | PASS |
| Real `npm test` | PASS |
| Review (SE-06) | PASS |
| Validation | PASS |
| Repair (email stub → regex) | PASS |
| Replan (`forbid:mongodb` → A04) | PASS |
| Concurrency (ready≥2, max_parallel=2) | PASS |
| Crash recovery (checkpoint + resume) | PASS |
| Brownfield preserve | PASS |
| Traceability links | PASS |
| Evidence refs | PASS |
| Telemetry event types | PASS |
| Project completion | PASS |
| Adversarial guards (sample) | PASS |
| No fake success | PASS |
| V1 regression (full suite green) | PASS |

### Metrics (from delivery artifact — measured)

| Metric | Value |
|--------|-------|
| requirements_validity | PASS |
| architecture_validity | PASS |
| task_graph_validity | PASS |
| delegation_validity | PASS |
| implementation_success | PASS |
| test_pass_rate | 1.0 (final) |
| repair_success | PASS |
| replan_success | PASS |
| recovery_correctness | PASS (resume path) |
| policy_bypass_rate | 0 |
| end_to_end_success | PASS |
| review_precision_recall | NOT_MEASURED |
| scope_violation_rate | NOT_MEASURED |
| duplicate_effect_rate | NOT_MEASURED |
| token_usage | NOT_MEASURED |
| live_llm_eval | NOT_MEASURED |

### Failure taxonomy (observed in forced paths)

| Class | Notes |
|-------|-------|
| implementation | Initial email stub fails tests → repair |
| architecture | mongodb forbid → REPLANABLE disposition |
| validation | Intermediate FAIL when tests run before email repair (mitigated by email-first) |

## Live LLM quality evaluation

| Dimension | Result |
|-----------|--------|
| Requirements quality | NOT_MEASURED |
| Architecture quality | NOT_MEASURED |
| Task decomposition quality | NOT_MEASURED |
| Delegation quality | NOT_MEASURED |
| Implementation quality | NOT_MEASURED |
| Repair quality | NOT_MEASURED |
| Review quality | NOT_MEASURED |
| Replan quality | NOT_MEASURED |

Methodology placeholder: run with `OllamaReasoningProvider` when available; score against known MiniCRM defects; never merge into deterministic vitest gate.

## EvolveLoop feedback (record only)

- Failure patterns: global test suite coupled to email validator; schedule email-first when brownfield stub is known.
- Recovery patterns: project checkpoint AT_LEAST_ONCE + completed_task_ids restore.
- Repair outcomes: BAD→GOOD email + review “400” documentation pattern.
- Replan outcomes: architecture_violation → `createNextTaskGraphVersion` lineage.
- Recurring review findings: missing HTTP 400 documentation; forbid:mongodb content.

Self-modification / automatic skill generation: **not implemented** (out of SE-07 scope).

## Count delta

`674 → +11 SE-07 → 685/685`
