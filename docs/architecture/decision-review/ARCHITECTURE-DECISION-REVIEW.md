# Architecture Decision Review

**Date:** 2026-09-19  
**Baseline:** `baseline-v1-2026-09-18` (unchanged)  
**Code changes:** NONE  
**Implementation:** NONE  

## Executive Summary

Evidence from Baseline V1, Runtime Sync, E-001 (offline), and E-005 (job-path) supports **keeping** the restored job-path resume design and **deferring** production skill budgets, sandbox, stuck detection, and compaction. No runtime change is justified now.

```text
CURRENT mechanisms
   ↓
MEASURED evidence (scoped)
   ↓
KEEP / DEFER decisions
   ↓
ADR DRAFTS (not implementation)
   ↓
future experiments if stronger claims are needed
```

## Evidence Quality

| Source | Quality | Notes |
|--------|---------|-------|
| Baseline V1 | HIGH | 103/7/5 frozen |
| E-005 | HIGH within scope | STATE_WRITE job-path; not global |
| E-001 | MEDIUM | Offline DIRECT activation; PROXY tokens; live gaps |
| E-002…E-004 | N/A | BLOCKED — architecture/runtime prerequisites |

## E-001 Review

### Token reconciliation (gate)

Resolved in `E-001-TOKEN-RECONCILIATION.md`:

| Condition | token_estimate | vs CONTROL |
|-----------|---------------:|-----------:|
| CONTROL | 1673 | — |
| T_SKILLS_5 | 382 | −77.17% |
| T_SKILLS_10 | 789 | −52.84% |
| T_TOKENS_40 | 1010 | **−39.63% (~40%)** |

`~40%` refers **only** to T_TOKENS_40. Not a raw-data error.

### Proven / not proven

| Question | Answer |
|----------|--------|
| Activation behavior changes with catalog size? | YES (offline DIRECT) |
| Token/context proxy changes? | YES (PROXY) |
| Latency (agent)? | PARTIAL (harness wall_clock only) |
| Task success? | UNKNOWN / NOT_MEASURED |
| Production budget required? | INSUFFICIENT |

### Decision

**DEFER** production catalog budget; **KEEP** runtime unchanged (`ADR-DR-0002`).

## E-005 Review

### Proven

- resume_success 1.0  
- no duplicate STATE_WRITE mutation (15/15)  
- checkpoint/resume integrity under fixture  
- SAME_ENGINE and NEW_ENGINE in **same Node process**

### Not proven

- exactly-once global  
- OS kill recovery  
- confirm-path / external side effects  
- full HITL product  

### Same-process meaning

Interrupt = `wait=0` end-of-run + resume. NEW_ENGINE ≠ OS kill (explicit raw note).

### Decision

**KEEP** current job-path resume (`ADR-DR-0001`); **DEFER** global exactly-once. HITL stays **PARTIALLY_OBSERVED**.

## Decisions Supported By Evidence

- KEEP job-path resume/checkpoint for tested class  
- KEEP single registries / orchestrator (DO-NOT-CHANGE)  
- KEEP Evidence ≠ Telemetry / Knowledge ≠ Memory ≠ Checkpoint  
- DEFER production skill budget despite E-001 SUPPORTED offline  

## Decisions Not Yet Supported

- Implement sandbox / stuck / compaction  
- Implement max_skills / budget governor  
- Upgrade HITL to fully observed  
- Exactly-once architecture  

## Existing Mechanisms Confirmed

- Capability IR → Scheduler → Registry → Provider loop  
- Jobs store / pickup / resume / checkpoint (post-sync + E-005)  
- Skills as SKILL.md packages (host), without equating to Capability  

## Changes Explicitly Deferred

See “What We Will NOT Change Yet.”

## Proposed ADR Drafts

| ADR | Topic |
|-----|-------|
| ADR-DR-0001 | Keep job-path resume (scoped) |
| ADR-DR-0002 | Defer production skill budget |
| ADR-DR-0003 | Security model before sandbox |
| ADR-DR-0004 | Stuck semantics before detector |
| ADR-DR-0005 | Context ownership before compaction |

All status **DRAFT**; implementation **NOT IMPLEMENTED**.

## Prototype Queue

`PROTOTYPE-QUEUE.yaml` — PT-001 (live catalog), PT-002 (OS kill). Both `implementation_allowed_now: false`.

## Future Experiments

`FUTURE-EXPERIMENTS.yaml` — E-001-LIVE, E-005-OS-KILL, E-005-CONFIRM-SIDE-EFFECT, E-002-SEC-MODEL, E-003-STUCK-DEF, E-004-OWNERSHIP.

## Architecture Risks

1. Over-claiming E-005 as exactly-once / full HITL  
2. Implementing max_skills from offline PROXY evidence  
3. Sandbox theater via posture labels  
4. Compaction without ownership → memory SSOT pollution  
5. Ignoring Authority soft-policy gap because jobs resume succeeded  

## Open Questions

- Live catalog budget effect size?  
- OS-kill resume behavior?  
- Security model shape?  
- Stuck operational definition?  
- Compaction ownership diagram?  

## What We Will NOT Change Yet

Explicit non-changes justified by current evidence:

```text
- production skill budget / max_skills / pruning governor
- OS sandbox implementation
- posture labels without enforcement attestation
- semantic stuck detector
- context compaction / reinject pipeline
- global exactly-once semantics
- model routing
- second Capability/Provider/Agent registry
- second orchestrator
- second Evidence SSOT
- merging MegaBrain Evidence Bus into engine Evidence[]
- upgrading HITL status beyond PARTIALLY_OBSERVED
- runtime/src changes from this review
- baseline V1 contents
```

## Final Architecture State

```text
Jobs/RunState/Checkpoint
   ↓ E-005 MEASURED (job-path)
   ↓ KEEP CURRENT + DEFER exactly-once
   ↓ no runtime change now

Skills catalog (host packages)
   ↓ E-001 MEASURED offline (PROXY tokens)
   ↓ DEFER production budget
   ↓ no max_skills now

Sandbox / Stuck / Compaction
   ↓ BLOCKED experiments
   ↓ DEFINE MODEL / SEMANTICS / OWNERSHIP first
   ↓ no implementation now
```
