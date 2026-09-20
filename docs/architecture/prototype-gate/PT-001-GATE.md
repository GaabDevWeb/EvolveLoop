# PT-001 Prototype Gate

## Question

Does **controlled live host catalog size/truncation** change **live skill activation** and **live task_success** relative to a full-catalog CONTROL, without modifying orchestrator catalog APIs?

## Environment

| Item | Observed |
|------|----------|
| OS | Linux 6.12.88+deb13-amd64 x86_64 |
| Node | v24.15.0 |
| Python | 3.13.5 |
| User | gaab (uid 1000) |
| `/tmp` | writable |
| `prototypes/workspaces/` | missing (spec allows `/tmp/pt-001-*`) |
| Live host catalog injection | **unavailable** |
| Tokenizer policy document | **missing** |
| Live task oracle | **missing** |
| Baseline checksums | OK |
| Critical runtime fingerprints | OK |
| Dry-run runner | DRY_RUN_UNAVAILABLE |

## Preconditions

| Precondition | Status |
|--------------|--------|
| ADR-DR-0002 ACCEPTED | PASS |
| Offline E-001 complete | PASS |
| Ability to control live catalog injection | **FAIL** |
| Tokenizer policy documented | **FAIL** |
| Writable ephemeral workspace | PASS (`/tmp`) |

Spec rule: if host cannot control injection → **BLOCKED**.

## Dependency Check

| Dependency | Status |
|------------|--------|
| live_host_catalog_injection | MISSING |
| live_task_oracle | MISSING |
| tokenizer policy document | MISSING |
| ephemeral workspace | AVAILABLE |

## Isolation

Declared isolation is honest (no false OS-sandbox). Filesystem/runtime/state boundaries are specified.  
Contamination surface note: `.cursor/skills` and `orchestrator/src` are **writable** by the current user — enforcement is procedural (`must_not_change`), not OS isolation.

Checklist: **PASS** (as designed) with elevated contamination risk if executed without discipline.

## Rollback

Strategy/scope/verification/failure_handling are defined in the hardened spec (ephemeral delete + host pointer restore + hash verify). Operational rollback is only meaningful if a campaign runs — not exercised (no execution).

Checklist: **PASS** (defined and operationally plausible for ephemeral + `/tmp`).

## Measurement

| Metric | available_now |
|--------|---------------|
| catalog_size | no |
| live_task_success (required) | no |
| token_estimate_or_vendor | no (no policy doc) |
| skills_activated | no |

Checklist: **FAIL**

## Reproducibility

Host version / model provider / live variance unknown without host control → **UNKNOWN**.

## Safety

No privilege escalation required for ephemeral workspace. Live model calls would need documented provider. PRODUCTION_STATUS remains NOT_IMPLEMENTED.  
Checklist: **PASS** for declared safety constraints; do not execute while environment fails.

## Baseline Protection

`BASELINE-CHECKSUMS.sha256` OK; critical fingerprints OK. Spec forbids baseline mutation.  
Checklist: **PASS**

## Hard Blockers

1. Live host catalog injection unavailable (critical missing dependency)  
2. Required metric `live_task_success` unavailable  
3. Tokenizer policy document missing  

## Constraints

None applicable for approval. Offline fallback **does not** answer the live question → not `APPROVED_WITH_CONSTRAINTS`.

## Final Decision

```text
BLOCKED
```

```text
execution authorized: NO
risk: HIGH
```

## Evidence

PF-001, PF-002, PF-003, PF-004, PF-010, PF-011, PF-012, PF-015 — see `PREFLIGHT-EVIDENCE.yaml`.

## Open Questions

- Exact host injection API when/if environment gains control  
- Gold labels for live tasks  
- Tokenizer policy choice (vendor vs labeled PROXY)  

These remain for a future revision **outside** this gate (gate does not edit the prototype).
