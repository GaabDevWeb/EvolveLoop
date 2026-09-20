# V2 B04 — Status

```text
B04: IMPLEMENTED
```

Autonomy impact:

```text
Before: process crash → manual/partial recovery
After:  process crash → persisted v2 checkpoint → runtime recovery → bounded continuation
```

Claim: **CRASH RECOVERABLE** (not crash-proof).

## Critical tests

| Test | Result |
|------|--------|
| Real process kill | PASS |
| Real process restart | PASS |
| Preserve completed nodes | PASS |
| Accounting / policy snapshot | PASS |
| Two-worker claim | PASS |
| Lease expiration | PASS |
| Corrupt checkpoint | SAFE |
| Crash during replan lineage | PASS |

## Next

```text
AGENTEXECUTOR / LLM REPLANNER DESIGN
```

Still not implemented: process sandbox, hard provider cancel, AgentExecutor, LLM Replanner.
