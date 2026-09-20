# Runtime baseline — EvolveLoop V6

- **Date:** 2026-09-19
- **Tests:** 184/184 (Vitest local)
- **Contracts:** 7/7
- **Full-cycle:** 5/5
- **EvolveLoop source tree hash:** `a2a44ba4f4d9aaff6da380c9b8e704f2268113297bb25b6524055530eb873107`
- **Closed-loop path:** EventBus → observer → cadence → analyze → need/candidate → handoff → (fixture gate) → observation window → outcome → `afterOutcome` → analyze
- **CLI:** `--evolve` opt-in, default OFF
- **Not claimed:** production Prototype Gate; production traffic; fully autonomous self-modification

## Performance (harness smoke)

| Mode | Notes |
|------|-------|
| Vitest full suite | ~1.6–1.7s wall on this host |
| Observation overhead | EventBus subscribe + ingest; try/catch non-blocking |
| Analysis overhead | Synchronous in tests (`sync: true`); production path uses `queueMicrotask` |
| Storage | JSONL append; growth unbounded without retention policy (limitation) |

## Storage growth

Simulated scale not load-tested in this baseline. Expected: O(n) JSONL lines for signals/outcomes. Limitation: no compaction/TTL in-package.
