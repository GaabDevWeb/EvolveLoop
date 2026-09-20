# Evals

## EV-EVOLVE-001

Implemented in `tests/unit/evolveloop/evolveloop.test.ts`.

Criteria:

- signal detected
- pattern detected
- need scoped
- root cause represented
- candidate generated with provenance
- handoff path without unauthorized mutation

## Suites covered

false positive (one-off), false negative (repeated), scope USER/CORE, dedupe, root-cause diversity, agent vs skill, capability vs agent, no-change, e2e handoff, max depth, policy block.
