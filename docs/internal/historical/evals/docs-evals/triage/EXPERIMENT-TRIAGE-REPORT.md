# Experiment Triage Report

**Date:** 2026-09-18  
**Agent:** Experiment Triage & Enablement (read-only)  
**Baseline:** `baseline-v1-2026-09-18` (untouched; checksums verified)  
**Prior run:** `docs/evals/experiments/` (PARTIAL)

## Executive Summary

Only **E-005** has empirical results. Of the four blocked experiments, **E-001** can move to `READY_AFTER_HARNESS` without a new orchestrator primitive (research already framed it as host/catalog shaping). **E-002 / E-003 (full) / E-004** require either a new runtime primitive and/or an architectural decision; enabling them via fake labels or rebranding `maxIterations` would produce false security or false “stuck detection.” **E-005** residual gaps are mostly **fixture/observability** on the existing jobs path; full “confirm-waits-then-resume” semantics would be a separate architectural choice.

## Current Experiment State

| ID | Runner status | Result |
|----|---------------|--------|
| E-001 | BLOCKED | BLOCKED |
| E-002 | BLOCKED | BLOCKED |
| E-003 | BLOCKED | BLOCKED |
| E-004 | BLOCKED | BLOCKED |
| E-005 | PARTIALLY_READY | SUPPORTED (job-path, MEDIUM) |

## E-001

**Hypothesis:** Budgeting skill catalog prefix (`max_skills` / `max_description_tokens`) improves activation precision and lowers prefix tokens at similar success.

**Exists today:** `.cursor/skills/**/SKILL.md` (+ evals JSON); provider discovery scans skills for manifests (`provider-discovery.ts`). **Missing:** any catalog-budget API in orchestrator; no host harness that varies injected catalog and scores activation.

**Blockers:** `HARNESS_GAP` + `OBSERVABILITY_GAP` (+ host `ENVIRONMENT_GAP` for live Cursor injection). **Not** primarily `RUNTIME_PRIMITIVE_GAP` for orchestrator — research text: “prompt shaping; no new runtime.”

**Minimum enablement:** Offline/minimal harness: CONTROL=full catalog description set vs TREATMENT=subsets; measure approximate prefix tokens; score activation against existing eval prompts / distractors (offline or scripted). Live MegaBrain budget API = optional later productization, not required to answer the hypothesis offline.

**Next state:** `READY_AFTER_HARNESS` · Recommend `ENABLE_WITH_HARNESS`  
**Architecture decision required?** No (for offline harness). Yes only if productizing in-host budget as production feature.  
**Cost:** MINIMAL–MODERATE

## E-002

**Hypothesis:** Posture enum `{enforced_sandbox, host_unknown, refused}` + refuse-unenforceable → `false_safe_label_rate → 0`.

**Exists:** `CapabilityAuthority` flags + `assertWithinWorkspace` path confinement. **Missing:** OS isolation; posture enum; enforceability attestation.

**Blockers:** `RUNTIME_PRIMITIVE_GAP` + `ARCHITECTURAL_DECISION_GAP` (security boundary: what “enforced” means).  

**False security:** Any enablement that only emits labels without process/FS/network isolation = `DOES_NOT_PROVE_SANDBOX`. Research failure criteria: do not fake labels.

**Next state:** `BLOCKED_BY_ARCHITECTURE` (and runtime) · Recommend `DEFER` / `REQUIRES_ARCHITECTURAL_DECISION`  
**Cost:** ARCHITECTURAL

## E-003

**Hypothesis:** Semantic stuck detector (tool-signature window + zero delta) reduces thrash vs max-turns-only.

**Exists:** `maxIterations=500` operational stop; `blocked_reason` strings. **Missing:** StuckDetector; thrash heuristic; false_stuck metrics.

**Split:**
1. **Characterize current thrash under maxIterations** → `MINIMAL_HARNESS` / `READY_AFTER_HARNESS` (does **not** test detector).
2. **Full E-003 metrics** (`false_stuck_rate`) → `NEW_RUNTIME_PRIMITIVE` + define “stuck” (`ARCHITECTURAL_DECISION_GAP`).

**Next state (full E-003):** `BLOCKED_BY_RUNTIME` · Recommend `DEFER` until architecture defines stuck semantics  
**Optional characterization:** `READY_AFTER_HARNESS` as a **different**, weaker experiment — must not be labeled as E-003 detector success.

**Cost:** characterization MINIMAL; full detector ARCHITECTURAL

## E-004

**Hypothesis:** On compact events, reinject Policy+skill pin → higher constraint survival.

**Exists:** Memory/Knowledge/Checkpoint; `summarizeExecutionTrace` (observability wording “compact”). **Missing:** context compaction pipeline and reinject hooks.

**Blockers:** `RUNTIME_PRIMITIVE_GAP` (+ likely `ARCHITECTURAL_DECISION_GAP` for host vs orchestrator ownership). Checkpoint ≠ compaction.

**Next state:** `BLOCKED_BY_RUNTIME` · Recommend `DEFER` / `NOT_WORTH_ENABLING` until a real compact surface exists  
**Cost:** ARCHITECTURAL

## E-005

**Proven:** job-path wait → checkpoint → new-engine resume; `resume_success=1.0`; secrets scan 0 (n=5).

**Not proven:** OS kill; `duplicate_mutate_count`; confirm-wait approval UX; full product HITL.

**Remaining blockers:** `FIXTURE_GAP` + `OBSERVABILITY_GAP` for mutate counting; optional `ARCHITECTURAL_DECISION_GAP` if requiring confirm-to-wait (today confirm **fails fast** in DeterministicProvider).

**Minimum enablement:** Fixture: mutating `filesystem.write` (or job-scripted write) + interrupt/resume + count writes on disk. Prefer jobs/HITL wait path already proven over inventing confirm-wait.

**Next state:** `READY_AFTER_FIXTURE` · Recommend `READY_AFTER_FIXTURE`  
**Cost:** MINIMAL–MODERATE

## Harness Gaps

- E-001 catalog subset + token/activation scoring
- E-003 optional thrash characterization (not detector)
- E-005 mutate/duplicate fixture

## Runtime Primitive Gaps

- E-002 OS sandbox / enforceability signal
- E-003 semantic StuckDetector (full experiment)
- E-004 compaction + reinject

## Architectural Decision Gaps

- E-002: security model / what “enforced” means; refuse-unenforceable policy
- E-003: definition of stuck vs explore
- E-004: where compaction lives (host vs engine)
- E-005 (optional): confirm-fail vs confirm-wait vs jobs-as-HITL SSOT

## Fixture / Observability Gaps

- E-001: activation labels for CONTROL/TREATMENT
- E-005: write counters, stronger secret schema scan, optional real process kill

## Experiments That Can Become READY

- **E-005** after mutate/duplicate fixture (+ optional OS-kill harness)
- **E-001** after offline catalog-budget harness
- *(Optional non-E-003)* thrash characterization harness

## Experiments That Should Remain Blocked

- **E-002** until sandbox architecture decided
- **E-003** (detector form) until stuck definition + primitive
- **E-004** until compaction exists

## Experiment Dependency Graph

See `EXPERIMENT-DEPENDENCIES.md`.

## Recommended Next Sequence

```text
1. E-005 fixture completion (duplicate_mutate)     ← lowest risk, raises confidence
2. E-001 offline catalog-budget harness            ← no orchestrator primitive
3. (optional) E-003 characterization-only harness  ← label clearly ≠ detector
4. Architecture reviews for E-002 / E-003-full / E-004  ← no enablement build yet
```

## Unknowns

- Whether host Cursor can inject subset skill catalogs without product changes (affects live E-001).
- Whether OS-level kill of Node process is required for E-005 confidence or simulated boundary suffices.
- Product owner preference: jobs-as-HITL SSOT vs confirm-wait loop.
