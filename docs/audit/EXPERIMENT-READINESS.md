# EXPERIMENT-READINESS

**Date:** 2026-09-18  
**Experiments:** `docs/research/experiments/E-001` … `E-005`  
**Rule:** Do not implement primitives to unblock experiments.

```yaml
experiments:

  - id: E-001
    title: Skill catalog budget
    status: BLOCKED  # or PARTIALLY_READY if host-only experiment allowed
    status_detail: BLOCKED_BY_IMPLEMENTATION_GAP
    prerequisites:
      - Ability to configure host skill catalog injection (Cursor / skill loader)
      - MegaBrain does not currently expose max_skills / max_description_tokens API
    existing_components:
      - `.cursor/skills/**/SKILL.md` packages
      - skill eval JSON under some skills (optional fixtures)
    missing_components:
      - Catalog budget controller in MegaBrain/orchestrator
      - Observable prefix_tokens metric hook
    observable_outputs:
      - activation_precision/recall on fixed task set
      - prefix token counts
    evidence:
      - research E-001 text
      - audit: no catalog budget symbols in orchestrator/src

  - id: E-002
    title: Sandbox posture labels
    status: BLOCKED
    status_detail: BLOCKED_BY_IMPLEMENTATION_GAP
    prerequisites:
      - Named posture (read-only / network-off / etc.) enforced at execution boundary
    existing_components:
      - CapabilityAuthority allowShell/allowWrite/allowNetwork flags
      - path confinement assertWithinWorkspace
      - DeterministicProvider shell.execute (unsandboxed spawn)
    missing_components:
      - OS sandbox / seatbelt / container
      - refuse-if-unenforceable hard stop across all providers
    observable_outputs:
      - denied escapes; posture label on RunResult/evidence
    evidence:
      - EA-0012
      - deterministic-capabilities tests (authority only)

  - id: E-003
    title: Stuck detector heuristic
    status: BLOCKED
    status_detail: BLOCKED_BY_IMPLEMENTATION_GAP
    prerequisites:
      - Progress/stuck heuristic beyond maxIterations
    existing_components:
      - ExecutionEngine maxIterations=500
      - blocked_reason strings
    missing_components:
      - StuckDetector / thrash / no-progress heuristic
    observable_outputs:
      - stuck classification event + early stop
    evidence:
      - EA-0013

  - id: E-004
    title: Compaction reinject
    status: NOT_APPLICABLE  # until host compaction exists to instrument
    status_detail: BLOCKED_BY_IMPLEMENTATION_GAP
    prerequisites:
      - Context compaction pipeline with reinject hooks
    existing_components: []
    missing_components:
      - Compaction / condenser in orchestrator or instrumented host
    observable_outputs:
      - skill instructions present post-compact
    evidence: []

  - id: E-005
    title: HITL RunState fixture
    status: BLOCKED
    status_detail: BLOCKED_BY_IMPLEMENTATION_GAP
    prerequisites:
      - src/jobs/ checkpoint + JobStore on THIS package tree
      - Authority confirm path that waits (not only fail) OR job waiting path
      - npm test job-resume green
    existing_components:
      - JOB_PENDING handling in ExecutionEngine (code present)
      - JobFileExecutor
      - Sibling AGENTS/.../src/jobs/* (not in CursorSKILLS)
      - CapabilityAuthority confirm → CONFIRMATION_REQUIRED fail
    missing_components:
      - CursorSKILLS/orchestrator/src/jobs/
      - Interactive confirm resume loop
    observable_outputs:
      - resume_success; duplicate_mutate_count=0 after kill/restore
    evidence:
      - EA-0003, EA-0014
```

## Ordering implication (factual)

Before any HITL/sandbox experiment authorization: restore or sync `src/jobs/` and re-run full test suite; decide Evidence Bus vocabulary (engine vs MegaBrain FS).
