# Revision Required

**Gate date:** 2026-09-19  
**Blocking NEEDS_REVISION ADRs:** none

This file records **non-blocking** completeness improvements for ADRs gated as `VALID_WITH_LIMITATIONS`. They do **not** prevent accepting the decisions as architecture decisions of type KEEP/DEFER. They should be addressed before any future implementation ADRs.

---

## ADR-DR-0001

### Problem

Missing explicit `reversible? / migration cost / state compatibility / rollback strategy` block.

### Evidence Missing

None for KEEP decision itself.

### Overclaim

None detected.

### Scope Problem

None.

### Architecture Conflict

None.

### Required Changes (non-blocking)

Add a short section:

```text
Reversibility: N/A (no change)
Migration cost: none
Rollback: N/A
implementation: NOT_STARTED / KEEP current
```

### Validation Needed

None beyond existing E-005 reproduction.

---

## ADR-DR-0002

### Problem

Same missing reversibility block; optional docs ADAPT is underspecified (LOW confidence).

### Evidence Missing

Live task_success / host injection (already acknowledged; correctly DEFERs).

### Overclaim

None detected. Token axes correctly separated.

### Required Changes (non-blocking)

- Add reversibility N/A block  
- If optional docs ADAPT remains, mark it explicitly out-of-scope of this ADR or require separate docs ADR  

---

## ADR-DR-0003

### Problem

Security-model checklist incomplete vs gate §16.

### Evidence Missing

Named open decisions for: trust boundary, execution identity, secret exposure, escape/bypass (partially implied only).

### Overclaim

None.

### Required Changes (non-blocking)

Expand Open Questions to enumerate full security-model checklist before any sandbox/posture prototype.

### Validation Needed

ARCHITECTURAL_DECISION_REQUIRED before implementation (already stated).

---

## ADR-DR-0004

### Problem

Stuck semantics checklist incomplete vs gate §17.

### Required Changes (non-blocking)

Add explicit dimensions: progress, recovery boundary, false positives, false negatives (alongside existing list).

---

## ADR-DR-0005

### Problem

Ownership questions listed but unanswered (by design).

### Required Changes (non-blocking)

Add sentence: “Answering ownership is out of scope of this ADR; a future ownership ADR is required before E-004 experiments/prototypes.”

### Validation Needed

Future ownership ADR must answer gate §18 questions before compaction work.
