# Patterns

## Window

Default rolling **168 hours** (`EVOLVE_THRESHOLDS.pattern_window_hours`).

Rationale: recurrence must be temporally local; ancient + today’s failures are not automatic recurrence.

## Minimum frequency

**3** signals/executions (`min_pattern_frequency`) — blocks one-off false positives.

## Scope class

| Condition | Class |
|-----------|-------|
| Single user / single project | USER_LOCAL |
| ≥3 users or ≥2 projects (cross-pass) | CORE_CANDIDATE |
| Else | UNKNOWN_SCOPE |

CORE_CANDIDATE **does not** auto-deploy to Core.
