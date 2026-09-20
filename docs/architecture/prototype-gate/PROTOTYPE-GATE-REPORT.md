# Prototype Gate Report

## Executive Summary

Prototype Gate completed a **read-only preflight** of PT-001 and PT-002 against baseline `baseline-v1-2026-09-18`.

| Prototype | Decision | Execution authorized |
|-----------|----------|----------------------|
| PT-001 | **BLOCKED** | NO |
| PT-002 | **NEEDS_MORE_EVIDENCE** | NO |

```text
Prototype execution authorized: 0 / 2
Prototypes executed: NO
Runtime modified: NO
Baseline modified: NO
ADRs modified: NO
Dependencies installed: NO
```

`READY_FOR_GATE` ≠ executable. Specs are hardened; the environment/policy gaps block authorization.

## PT-001

Live host catalog budget measurement (ADR-DR-0002).

- Spec quality: adequate for gating  
- Host injection: **unavailable**  
- `live_task_success`: **not collectable**  
- Tokenizer policy document: **missing**  
- Offline fallback: **does not answer** the live question → no `APPROVED_WITH_CONSTRAINTS`  
- Decision: **BLOCKED** / risk **HIGH**

## PT-002

OS-kill job-path STATE_WRITE resume (ADR-DR-0001).

- Spec quality: adequate; jobs APIs present; `/tmp` OK; owned-PID TERM works without sudo  
- Kill-signal policy: **undefined** (open question)  
- OS_kill_harness: **missing**  
- Post-restart job completion procedure: **undefined**  
- Decision: **NEEDS_MORE_EVIDENCE** / risk **HIGH**  
- Not REJECTED — remains a valid future campaign once evidence gaps close

## Hard Blockers

**PT-001**

- Missing live host catalog injection  
- Required `live_task_success` unavailable  
- Missing tokenizer policy document  

**PT-002**

- Undefined kill-signal policy (kill available ≠ safe policy)  
- Missing OS_kill_harness  
- Undefined post-restart external job completion  

## Conditional Approvals

None.

Offline PT-001 was considered and rejected under gate §39 (constrained scope must still answer the prototype question).

## Environment Limitations

- Live Cursor/evolve catalog control not available here  
- No live task oracle / gold labels for PT-001  
- `prototypes/workspaces/` absent (mitigated by `/tmp`)  
- OS sandbox NOT_IMPLEMENTED (not required by either prototype; not pretended)  
- `.cursor/skills` and `orchestrator/src` writable by user (procedural `must_not_change` only)  
- DRY_RUN_UNAVAILABLE for both  

## Security Findings

- No sudo-free root escalation path used or required for owned-PID signals  
- PT-002 process scope declared (prototype PID only) but **policy incomplete** → do not authorize  
- Do not treat path confinement as OS sandbox  

## Rollback Findings

Both specs define rollback strategy, scope, verification, and failure handling. Operationally plausible for ephemeral `/tmp` workspaces. **Not verified by execution** (gate forbids running prototypes to discover rollback).

## Isolation Findings

Declared isolation is honest. Contaminable trees are writable — enforcement must remain absolute if a future gate ever approves execution.

## Measurement Findings

- PT-001 required metrics cannot be collected now  
- PT-002 metrics are well-defined but harness-dependent; harness missing  

## Reproducibility Findings

- Baseline + critical fingerprints OK  
- Spec hashes recorded  
- Live/host factors UNKNOWN for PT-001  
- Kill method UNKNOWN for PT-002 until policy fixed  

## What Can Be Executed

```text
Nothing from {PT-001, PT-002}
```

## What Must Remain Blocked

- PT-001 until live host injection + live task oracle + tokenizer policy exist  
- PT-002 until kill policy + OS_kill_harness + post-restart completion procedure are fixed (via authorized revision outside this gate)  
- Any claim that gate approval equals prototype success  
- EV-F-001 / EV-F-003 remain non-executable pending their own prerequisites  

## Next Step

```text
Prototype Gate
    ↓
(no Prototype Execution for PT-001/PT-002)
    ↓
Revise missing environment/policy evidence
    ↓
Re-enter Prototype Gate when prerequisites change
```

Do **not** skip to implementation. Do **not** edit ADRs. Do **not** run PT-001/PT-002 from this report alone.
