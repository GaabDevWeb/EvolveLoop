# V2 A02 — Skill Execution Autonomy

**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Status:** `IMPLEMENTED` (handler-backed autonomous path)  
**Gap:** GAP-A02  

## Existing Problem

```text
CursorSkillProvider → JobFileExecutor → JOB_PENDING
  → manual run-jobs pickup/invoke
  → human/agent runs skill
  → run-jobs complete
  → engine resume
```

Creating a job was not executing a skill. Pickup wrote prompts — not execution.

## Existing Job Architecture

| Piece | Role |
|-------|------|
| `JobFileExecutor` | EXTERNAL mode — writes SkillJob JSON, returns `JOB_PENDING` |
| `JobStore` | Persist jobs + results |
| `run-jobs pickup/invoke/complete` | External completion path |
| `CallbackSkillExecutor` | Test-only in-process callback |

## Executor Discovery

Investigated:

| Candidate | Result |
|-----------|--------|
| `@cursor/sdk` / `Agent.prompt` | Not a package dependency; no API key in env |
| `cursor agent` CLI | Not a usable programmatic subcommand in this environment |
| SKILL.md alone | Instructions only — not an executor |
| `run-jobs invoke` | Writes prompt files — **not** execution |
| `child_process` / deterministic providers | Real, but not the cursor-skill path |
| Declared `spec.plugin.autonomous` Node module | **Chosen** — real side effects, no LLM fake success |

## Chosen Execution Backend

```text
AutonomousSkillExecutor (SkillExecutor kind=autonomous)
  → dynamic import of manifest.spec.plugin.autonomous.module
  → handler(ctx) → structured result + Evidence
  → validateEvidenceV21 before success
```

LLM-only skills (e.g. `testing`, `backend`) **without** `autonomous` block:

```text
EXECUTOR_UNAVAILABLE
```

Never: prompt-written → success.

## Autonomous Execution Flow

```text
StructuredIntent
  → PlanEmitter → CapabilityGraph
  → bootstrapProviders(skillExecutor: "autonomous")
  → CursorSkillProvider
  → AutonomousSkillExecutor
  → handler.mjs (real)
  → Evidence + side effect
  → ExecutionEngine continues DAG
```

No pickup. No complete. No resume required on this path.

## Job Lifecycle

```text
pending → claimed → running → completed | failed | cancelled
```

Compatible with legacy `pending|completed|failed` for external complete.

## Claim / Lease

- Exclusive lock file (`wx`) per `run_id`
- Fields: `claimed_at`, `worker_id`, `attempt`, `lease_until`
- One active claim per job while lease valid
- Expired lease → reclaimable (**at-least-once**)

## Failure Semantics

| Code | Meaning |
|------|---------|
| `EXECUTOR_UNAVAILABLE` | No handler / module missing / load failure |
| `EXECUTOR_TIMEOUT` | Exceeded timeout |
| `EXECUTOR_CANCELLED` | AbortSignal / cancel() |
| `EXECUTOR_FAILED` | Handler threw or returned failure |
| `INVALID_EXECUTOR_RESULT` | Evidence failed DoD validation |
| `EVIDENCE_MISSING` | Incomplete evidence |
| `SKILL_NOT_FOUND` | SKILL.md missing |
| `JOB_PENDING` | EXTERNAL mode only |

## Evidence

Success requires `validateEvidenceV21` pass. Exit code alone is insufficient. Handler must supply DoD checks (or side_effects used to build worker evidence that still validates).

## Authority Boundaries

- Handlers receive `authorized_workspace`
- Proof handler rejects path escape (`AUTHORITY_DENIED`)
- **Path restriction ≠ OS sandbox** — documented limitation
- Autonomous mode does not grant shell/network by default

## External Mode

```text
--skill-executor external   # default
+ --jobs-dir ./jobs
→ JobFileExecutor (unchanged V1 path)
```

## Mock Mode

```text
--provider-mode mock
```

Orthogonal to skill-executor. Never used to “prove” A02.

## Concurrency

- `JobStore.claimJob` prevents dual active claims
- Tests: two workers same job → one wins
- `SkillWorker` concurrency / maxJobs / poll / idle exit / SIGTERM release

## Recovery Semantics

**At-least-once:** worker death after side effect but before `completeJob` may allow lease reclaim and re-execution. Handlers should be idempotent when possible. Not exactly-once.

Graceful shutdown: in-flight claims released to `pending` (not fake success).

## Known Limitations

1. Production LLM skills without handlers → `EXECUTOR_UNAVAILABLE` until Cursor SDK (or equivalent) is wired as an optional backend.
2. No full process sandbox — workspace path checks only.
3. Cancel aborts in-process handler wait; cannot hard-kill arbitrary native children of a handler.
4. GAP-A04 replan not implemented — failures surface as NodeFailed / retries only.

## Test Evidence

```text
npm test → 449/449
```

Includes:

- Real file write via `test.autonomous-write` handler
- Intent → engine e2e without pickup/complete/resume
- EXECUTOR_UNAVAILABLE for LLM-only testing skill
- EXECUTOR_TIMEOUT
- Duplicate claim protection
- Lease reclaim
- SkillWorker completes job
- External JobFileExecutor still `JOB_PENDING`
- Prior V1 + foundation tests green

## Fake Autonomy Check

| Question | Answer |
|----------|--------|
| Does the autonomous worker actually execute the skill? | **YES** — `handler.mjs` writes a verified file |
| Could this worker report success without the intended side effect? | **NO** for the proof skill — missing file / failed DoD → not success |

## Remaining Gaps

- Wire optional `@cursor/sdk` backend for LLM skills (future)
- GAP-A04 automatic bounded replanning
- GAP-B02 universal authority on all execute paths
- Stronger sandbox if required by policy

## CLI

```bash
# Autonomous (in-process handlers)
npm run run-engine -- --ir plan.ir.yaml --provider-mode real --skill-executor autonomous

# External (legacy jobs)
npm run run-engine -- --ir plan.ir.yaml --provider-mode real --skill-executor external --jobs-dir ./jobs

# Autonomous worker over job files
npm run run-jobs -- worker --jobs-dir ./jobs --workspace "$PWD" --idle-exit-polls 5
```
