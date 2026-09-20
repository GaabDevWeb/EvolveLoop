# Final Architecture State

**Baseline V1:** `baseline-v1-2026-09-18` — **unchanged**  
**Baseline V2:** **NONE** (no approved runtime implementation)  

## Correspondence check

> Does the real system match what the ADRs say exists?

**Yes.** ADRs claim KEEP (job-path) + DEFER (budget/sandbox/stuck/compaction) with `NOT_IMPLEMENTED` for deferred items. Runtime observation matches: jobs present; sandbox/stuck/routing/compaction absent; no `max_skills` engine field.

## What this pipeline changed

| Area | Change |
|------|--------|
| Runtime `orchestrator/src` | **NO** |
| Skills | **NO** |
| Baseline V1 | **NO** |
| ADRs finalization files | **NO** |
| Historical eval results | **NO** |
| Evolution docs | **YES** (this directory) |
| Prototype gate docs | preexisting (referenced) |

## Gaps still open

Sandbox, stuck semantics, model routing, live task_success, OS-kill resume, global exactly-once, Evidence Bus ≠ Evidence[], preexisting tsc build FAIL.
