# Experiment Readiness — After Runtime Sync

Source prior: `docs/audit/EXPERIMENT-READINESS.md`  
Update scope: jobs restoration impact only (2026-09-18).

| ID | After sync | Notes |
|----|------------|-------|
| E-001 | PARTIALLY_READY | Host/skill concerns remain; orchestrator runtime no longer blocked by missing jobs |
| E-002 | BLOCKED | Depends on primitives still NOT_IMPLEMENTED / host (per prior audit) — jobs restore does not unblock |
| E-003 | BLOCKED | Same — not jobs-gated |
| E-004 | BLOCKED | Compaction still absent |
| E-005 | PARTIALLY_READY | Prior block was missing `jobs/` on CS — **lifted** for resume/checkpoint/job path; full product HITL UX still not claimed |

## Observed after sync

- Job resume + checkpoint: **OBSERVED** in `job-resume.test.ts`
- Full-cycle with jobs path: **OBSERVED** in `full-cycle.test.ts`
- Sandbox / routing / stuck: unchanged NOT_IMPLEMENTED — do not run those experiments yet
