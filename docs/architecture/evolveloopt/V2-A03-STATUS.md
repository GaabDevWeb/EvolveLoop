# V2 A03 — Status

```text
A03: IMPLEMENTED
```

Branch: `evolve-v2` (main untouched).

## Checklist

| Criterion | Status |
|-----------|--------|
| Authorization before effects (Engine path) | PASS |
| Policy/deny on hot path | PASS |
| Required gates enforceable via RuntimeGateContext | PASS |
| Denial prevents provider execute | PASS |
| Replan re-evaluated | PASS |
| Confirmation structured | PASS |
| Confirmation revalidated on plan_hash | PASS |
| Evidence can block | PASS |
| Grounding can block when required | PASS |
| Workspace path authority | PASS |
| Direct provider outside engine | LIMITED (documented) |
| Autonomous/external pre-job | PASS / EXTERNAL LIMITED |
| Mock cannot bypass policy on Engine | PASS |
| Gate evidence + telemetry | PASS |
| Adversarial tests | PASS |
| A04 × A03 e2e | PASS |

## Known unenforced surfaces

- Policy budget/timeout/fail_fast/fallback fields → **B01**
- Process sandbox → **NOT IMPLEMENTED**
- External agent after job file written → **EXTERNAL_EXECUTION_LIMITATION**

## Next

```text
GAP-B01 — Policy Enforcement / Resource Budgets
```
