# PT-002 Prototype Gate

## Question

After a **true OS process termination** mid job-path wait, does resume from durable `jobsDir` checkpoint complete with **observed_mutations = 1** (no duplicate JobFileExecutor STATE_WRITE) and defined `resume_success`?

## Environment

| Item | Observed |
|------|----------|
| OS | Linux 6.12.88+deb13-amd64 x86_64 |
| Node | v24.15.0 |
| Python | 3.13.5 |
| User | gaab (uid 1000) |
| sudo nopass | false (password required) |
| `/tmp` | writable |
| `jobs/` APIs | present; fingerprints OK |
| E-005 harness | present (same-process only) |
| OS_kill_harness | **MISSING** |
| Kill signal policy | **UNDEFINED** (open question in spec) |
| Baseline checksums | OK |
| Dry-run runner | DRY_RUN_UNAVAILABLE |

## Preconditions

| Precondition | Status |
|--------------|--------|
| ADR-DR-0001 ACCEPTED | PASS |
| E-005 fixture conceptually reproducible | PASS |
| Ability to SIGKILL/terminate Node under harness | PARTIAL — owned-PID TERM works; campaign policy missing |
| Disposable jobsDir | PASS (`/tmp`) |
| Mutation instrumentation equivalent to E-005 | UNKNOWN until OS-kill harness exists |

## Dependency Check

| Dependency | Status |
|------------|--------|
| jobs resume/checkpoint APIs | AVAILABLE |
| disposable jobsDir | AVAILABLE |
| own-PID signal capability | AVAILABLE |
| OS_kill_harness | MISSING |
| kill signal policy fixed | MISSING |
| post-restart job completion procedure | MISSING |

## Process Control

| Item | Finding |
|------|---------|
| who can stop | current user for owned PIDs |
| what process | must be prototype Node PID only (spec) |
| privilege | no sudo required for owned PID |
| termination request | **policy not fixed** (SIGKILL vs SIGTERM open) |
| after termination | new process + resume (specified) |
| cleanup | disposable jobsDir removal (specified) |
| state preserved | checkpoint in disposable jobsDir (specified) |

`kill` available ≠ safe kill policy.

## Policy of Kill

```text
STATUS: UNDEFINED
```

Hardened spec Open Questions still ask which signal to use and who completes the external job after restart. Gate must not invent the policy (§40/§49).

Authority/security checklist:

| Check | Status |
|-------|--------|
| authority | UNKNOWN until PID-file/campaign procedure defined |
| process scope | PASS (declared: prototype PID only) |
| filesystem scope | PASS (disposable jobsDir) |
| network scope | PASS (NOT_REQUIRED) |
| secret exposure | PASS (no secrets in plan) |
| cleanup | PASS (defined) |
| rollback | PASS (defined) |

## Isolation

Disposable jobsDir + feature id prefix + kill-only-prototype-PID declared.  
OS sandbox = NOT_IMPLEMENTED — not required and not pretended.

Checklist: **PASS** (declared)

## Rollback

Remove disposable jobsDir; kill leftover prototype PIDs; verify baseline checksum + src hash. Defined and operationally plausible. Not exercised (no execution).

Checklist: **PASS** (defined)

## State Safety

Uses existing jobs/checkpoint/RunState paths under disposable jobsDir. No new State system. Production default jobs path forbidden by isolation.

Checklist: **PASS**

## Measurement

Required metrics (`os_kill_performed`, `process_restart`, mutations, resume_success) are well-defined, but collection requires an OS-kill harness that does not exist yet.

Checklist: **UNKNOWN** / effectively blocked for collection now

## Reproducibility

OS/node/kill method/jobsDir/feature_id must be recorded. Kill method not fixed → **UNKNOWN**.

## Safety

| Item | Status |
|------|--------|
| unbounded process kill | FAIL risk if policy unclear |
| baseline contamination | PASS if disposable path enforced |
| sudo/capabilities escalation | not required for owned PID |
| sandbox pretense | PASS (none claimed) |

Overall safety for authorization: **FAIL** until kill policy + harness + completion procedure exist.

## Baseline Protection

Checksums OK. Spec forbids baseline mutation.  
Checklist: **PASS**

## Hard Blockers

1. Unsafe / undefined process-control policy (SIGKILL vs SIGTERM unresolved)  
2. OS_kill_harness missing  
3. Post-restart external job completion procedure undefined  

## Constraints

None issued for approval. Cannot use “kill carefully” as a substitute policy.

## Final Decision

```text
NEEDS_MORE_EVIDENCE
```

```text
execution authorized: NO
risk: HIGH
```

Not REJECTED — the prototype remains meaningful once policy/harness/procedure are fixed in a later hardening/revision phase (outside this gate’s write scope).

## Evidence

PF-001, PF-002, PF-005, PF-006, PF-007, PF-008, PF-009, PF-010, PF-011, PF-013, PF-014, PF-015 — see `PREFLIGHT-EVIDENCE.yaml`.

## Open Questions

- Exact kill signal policy (SIGKILL vs SIGTERM)  
- Who completes the external job after restart  
- OS-kill harness location and PID containment file format  
