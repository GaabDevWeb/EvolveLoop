# ADR — E2E Benchmark Composition (SE-07)

## Status

Accepted for EvolveLoop V2 (`evolve-v2`).

## Context

SE-01..SE-06 proved individual engineering contracts. SE-07 must prove they compose into a closed loop without duplicating Runtime / Supervisor / Worker / Review / Evidence / Telemetry.

## Decision

1. Add a thin **project composition** layer (`SoftwareEngineeringProject`) that:
   - calls existing pipelines (`runRequirementsFromText` → `runArchitectureFromRequirements` → `runTaskGraphFromSpecs`);
   - drives `Supervisor` → `AgentExecutor` → `EngineeringWorker` → `EngineeringReviewer` → `buildValidationResult`;
   - owns only **project phase** + **delivery artifact** + **project checkpoint**.
2. Use a **brownfield MiniCRM fixture** with a known recoverable defect (email stub) and a known strategy break (`forbid:mongodb`) for repair + replan.
3. Prefer **email-first scheduling** when the brownfield stub makes `npm test` fail globally — composition policy, not Runtime magic keyed on project name.
4. Keep Live LLM evaluation **out of band** (`NOT_MEASURED` unless measured separately).

## Consequences

- Positive: no second architecture; seams are auditable; failures reuse A03/A04/B01/B04.
- Negative: project layer still chooses which tasks are “delivery-required” via title/scope heuristics — document as composition policy, not universal planner intelligence.
- Forbidden: `if (project === "SE07")` success shortcuts; fake test/review success; claiming sandbox.

## Alternatives considered

- Full autonomous execution of every generated task including out-of-fixture frontend — rejected for deterministic CI cost; delivery subset + OOS frontend constraint preferred.
- New “ProjectRuntime” — rejected; duplicates Execution Engine.
