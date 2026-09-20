# Skill Telemetry Report

**Generated:** 2026-09-19  
**Instrumentation status:** INSTALLED (observe-only)

## Observation window

```yaml
observation_window:
  started_at: 2026-09-19T21:23:00Z  # first unit-test emissions
  ended_at: 2026-09-19T21:23:30Z
  executions_observed: synthetic_test_only
  tasks_observed: 0_production
  coverage: harness_unit_tests
  confidence: low_for_production_frequency
```

## Sample size

| Source | Records |
|--------|--------:|
| Unit tests (`skill-telemetry.test.ts`) | exercised LOADED/EXECUTED/ACTIVATED/GATE_* |
| Production MegaBrain sessions | **0** collected in this window |
| Historical frequency | **NOT_MEASURED** (pre-instrumentation) |

## Interpretation rules

- Production frequency claims remain **NOT_MEASURED** until a real observation window accumulates JSONL under `telemetry/events/skill-lifecycle-*.jsonl`.
- Conditional gates (`grill-me`, `image-to-code`) may show low activation and still be **CRITICAL**.
- `REFERENCED` / docs hits ≠ `ACTIVATED`.

## Skills with measured activation (this window)

| skill_id | Measured? | Notes |
|----------|-----------|-------|
| demo (test fixture) | yes | CursorSkillProvider hook |
| grill-me | gate logic tested | policy helper; no prod ACTIVATED yet |
| others | NOT_MEASURED | awaiting live window |

## How agents should emit (Tier3 / Cursor path)

When activating a Tier3 skill or satisfying a gate, append:

```json
{"event":"SkillLifecycle","event_type":"ACTIVATED","skill_id":"grill-me","timestamp":"…","flow":"megabrain","command":"/grill-me"}
```

to `memory/<feature_id>/evidence/skill-activations.jsonl` **and/or** rely on Evidence Bus gate files for hard gates.
