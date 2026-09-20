# Pre-Pruning Decision

**Status:** `PRE_PRUNING_READY`  
**Date:** 2026-09-19  
**Skills removed / archived:** **0**

## Checklist

| Criterion | Met? |
|-----------|------|
| Critical drift repaired or explicitly accepted | YES — DRIFT-REPAIR-REPORT |
| grill-me operational HARD-GATE conditional | YES — skill v2 + gate + command + evidence |
| grill-me flow verifiable | YES — gate.grill-me.json + tests |
| grilling wrapper no longer broken | YES — Case C self-authority |
| Telemetry installed | YES — skill-telemetry + EventBus SkillLifecycle |
| Activation tests exist | YES — megabrain-skill-gates + skill-telemetry |
| Hard gates documented | YES — HARD-GATES-V2 + CONTRACT |
| Matrix V2 updated | YES |
| Pruning candidates documented | YES — REMOVAL-CANDIDATES-V2 |
| No skill removed | YES |
| Regression green | YES — 212/212 |

## Canonical flow (document once)

```text
INPUT → ROUTING → BRAINSTORMING? → PRD → GRILL-ME [HARD when applicable]
  → PLANNER → PDA → TESTING → DEBUGGER? → GATES → VALIDATOR? → DOCUMENTATION
```

## Next phase (separate)

```text
PRE_PRUNING_READY → controlled PRUNE of PRUNE_CANDIDATE only → validation → rollback plan
```

Do **not** prune on frequency until observation_window has production sample_size > 0.
