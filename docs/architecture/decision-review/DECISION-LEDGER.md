# Decision Ledger

**Review date:** 2026-09-19  
**Baseline:** `baseline-v1-2026-09-18`  
**Implementation performed this phase:** NO

## Confirmed Decisions

| ID | Topic | Decision | Confidence |
|----|-------|----------|------------|
| DR-001 | Job-path resume/checkpoint | **KEEP** current mechanism for tested failure class | HIGH |
| DR-008 | Single Capability/Provider registries + orchestrator | **KEEP** (DO-NOT-CHANGE) | HIGH |
| DR-009 | Evidence ≠ Telemetry; EvolveLoop bus ≠ engine Evidence[] | **KEEP** boundary | HIGH |

## Decisions Refined By Experiments

| ID | Topic | Refinement |
|----|-------|------------|
| DR-001 / HITL jobs | Research PROTOTYPE + audit WEAKENS (missing jobs) | After sync + **E-005**, job-path wait/persist/resume is **CONFIRMED** for fixture scope; product HITL stays **PARTIALLY_OBSERVED** |
| DR-003 | Progressive disclosure / skill budgets | Offline **E-001** supplies association evidence; elevates awareness but **does not** elevate to production `max_skills` |

## Decisions Weakened By Experiments

None formally weakened. E-001/E-005 did not contradict DO-NOT-CHANGE or baseline mechanism statuses in a way that removes an existing KEEP.

## Decisions Still Insufficient

| Topic | Why |
|-------|-----|
| Production skill budget API | No live task_success / host injection |
| Global exactly-once | Fixture-scoped only |
| Authority on all providers | Not experimented |
| Model routing | NOT_IMPLEMENTED / not experimented |

## Deferred Changes

- OS Sandbox / posture labels (E-002) — define security model first  
- Semantic StuckDetector (E-003) — define stuck semantics first  
- Context compaction/reinject (E-004) — define ownership first  
- Production catalog budget / max_skills  
- Global exactly-once architecture  
- Broad Policy/Authority rewiring (no new experiment evidence)

## Proposed Prototypes

None **authorized for implementation now**. Prototype queue entries are gated:

- Optional **live** catalog-budget experiment (not engine feature) before any budget prototype  
- Optional OS-kill resume experiment before expanding recovery claims  

See `PROTOTYPE-QUEUE.yaml` (all `implementation_allowed_now: false`).

## Explicitly Rejected Changes (this review)

Not “forever reject research ideas,” but **reject as next action**:

- Implement `max_skills` / budget governor from E-001 alone  
- Claim exactly-once from E-005  
- Fake sandbox posture labels without enforcement  
- Second registry / second orchestrator / second evidence SSOT  
- Treating E-005 as full HITL completion  

## Questions Requiring Future Experiments

See `FUTURE-EXPERIMENTS.yaml` (live E-001 host, OS kill E-005, confirm-path mutate, stuck semantics fixtures, compaction ownership prototypes).
