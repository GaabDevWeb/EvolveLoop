# Experiment → Decision Traceability

## E-005

```text
Research: HITL / jobs / checkpoint PROTOTYPE
   ↓
Hypothesis: interrupt→resume without duplicate mutate; secrets=0
   ↓
Baseline V1: Jobs/Resume OBSERVED; HITL PARTIALLY_OBSERVED; duplicate_mutate previously NOT_MEASURED
   ↓
Audit: jobs missing (fragile) → Runtime Sync restores jobs/
   ↓
Experiment E-005 fixture: CONTROL + SAME_ENGINE + NEW_ENGINE
   ↓
Result: SUPPORTED (HIGH, scoped)
   - resume_success=1.0
   - duplicate_mutate=false (15/15 mutation=1)
   - STATE_WRITE integrity MEASURED
   - same-process MEASURED; OS kill NOT_MEASURED
   ↓
Supported claims:
   - job-path resume works under fixture
   - no second JobFileExecutor STATE_WRITE mutation observed
Unsupported claims:
   - global exactly-once
   - full HITL product
   - OS/process crash recovery
   - external side-effect idempotency
   ↓
Decision DR-001: KEEP current job-path resume design
Decision DR-002: DEFER global exactly-once claim
   ↓
ADR-DR-0001 (DRAFT)
```

### Same-process clarification (OPEN ambiguity resolved)

| Term | Measured in E-005? | Meaning |
|------|--------------------|---------|
| same Node process | YES | All arms |
| SAME_ENGINE | YES | Same `ExecutionEngine` instance |
| NEW_ENGINE | YES | New `ExecutionEngine`, **same** Node process — **not** OS kill |
| process restart | NO | — |
| OS termination / SIGKILL | NO | Explicitly NOT_MEASURED |
| `engine.pause()` | NO | Not used as interrupt |

Interrupt = end of `run(wait_for_jobs_ms=0)` then `run(resume=…)`.

---

## E-001

```text
Research: progressive disclosure / catalog budget ADAPT+PROTOTYPE
   ↓
Hypothesis: max_skills / max_description_tokens improve activation + lower tokens @ similar task_success
   ↓
Baseline: Skills packages exist; no engine budget API
   ↓
Triage: READY_AFTER_HARNESS (offline; no max_skills required)
   ↓
Harness enablement → READY
   ↓
Experiment battery (offline): 4 conditions × 5 reps
   ↓
Result: SUPPORTED (MEDIUM, offline scoped)
   - size ↓ → activation_precision ↑ (DIRECT offline)
   - size/truncation ↓ → token_estimate ↓ (PROXY)
   - task_success NOT_MEASURED
   - live injection NOT_MEASURED
   ↓
Token reconciliation:
   CONTROL 1673 | T5 382 (−77%) | T10 789 (−53%) | T_TOKENS_40 1010 (−~40%)
   (~40% = T_TOKENS_40 only; not T5/T10)
   ↓
Supported claims:
   - offline catalog composition affects activation ranking + whitespace prefix size
Unsupported claims:
   - live agent quality improvement
   - production performance win
   - requirement to implement max_skills now
   ↓
Decision DR-003: DEFER production budget
Decision DR-004: ADAPT optional docs guidance (LOW)
   ↓
ADR-DR-0002 (DRAFT) — defer production budget / keep runtime unchanged
```

### What was really proven? (answers)

| Question | Answer |
|----------|--------|
| Catalog size changes activation behavior? | **YES** (offline DIRECT) |
| Catalog size changes token/context proxy? | **YES** (PROXY) |
| Catalog size changes latency? | **PARTIAL** (wall_clock of harness only; not agent latency) |
| Catalog size improves task success? | **UNKNOWN** (NOT_MEASURED) |
| Production optimization requirement? | **INSUFFICIENT** |

---

## E-002 / E-003 / E-004

```text
Research PROTOTYPE
   ↓
Baseline NOT_IMPLEMENTED (or bound-only)
   ↓
Triage BLOCKED_BY_ARCHITECTURE / RUNTIME
   ↓
No experiment executed
   ↓
Decision: DEFER + prerequisite ADR drafts (security / stuck semantics / ownership)
```

---

## Principles vs experiments

| Principle | Effect |
|-----------|--------|
| Knowledge ≠ Memory ≠ Checkpoint | **CONFIRM** (E-004 still needs ownership; E-005 uses Checkpoint distinctly) |
| Evidence ≠ Telemetry | **CONFIRM** (unchanged) |
| Agent ≠ Capability ≠ Provider | **CONFIRM** |
| Policy Decision ≠ Enforcement | **CONFIRM** (E-005 does not close authority wiring gap) |
| DO-NOT-CHANGE registries/runtime | **CONFIRM** |

## Anti-patterns

| ID | Effect of E-001/E-005 |
|----|----------------------|
| AP-001 duplicate registries | **DO_NOT_AFFECT** (still reject) |
| AP-002 soft policy | **DO_NOT_AFFECT** (gap remains) |
| AP-003 over-agentization | **DO_NOT_AFFECT** |
| AP-004 context/tool explosion | **REFINE** awareness via E-001 offline; not proof of production explosion fix |
| AP-005 uncontrolled auto-approve | **DO_NOT_AFFECT** |
| AP-006 dual orchestration | **CONFIRM** keep single path (E-005 used existing jobs) |
| AP-007 memory as SSOT pollution | **DO_NOT_AFFECT** |
| AP-008 nested unbounded multi-agent | **DO_NOT_AFFECT** |
