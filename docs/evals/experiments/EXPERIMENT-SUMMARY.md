# Experiment Summary

## Baseline

- **ID:** `baseline-v1-2026-09-18` (V1)
- **Preserved:** YES (`sha256sum -c BASELINE-CHECKSUMS.sha256` OK after runs)
- **Post-run invariants:** tests **103/103**, contracts **7/7**, full-cycle **5/5**
- **Regressions:** NO
- Temporary E-005 harness file removed from `orchestrator/tests/evals/`

## Experiments Executed

| ID | Scope |
|----|--------|
| E-005 | Job-path + duplicate_mutate fixture (15 runs; see E-005-RESULT.md) |
| E-001 | Offline catalog-budget battery (20 runs; see E-001-RESULT.md) |

## Experiments Blocked

| ID | Reason |
|----|--------|
| E-002 | Sandbox + posture enum not implemented (must not fake) |
| E-003 | Semantic stuck detector not implemented |
| E-004 | No compaction/reinject pipeline |

## Experiments Not Applicable

None separately labeled; E-004 also fits research NOT_APPLICABLE-until-hook, recorded as **BLOCKED**.

## Results

| ID | Hypothesis | Status | Result | Confidence |
|----|------------|--------|--------|------------|
| E-001 | Catalog budget improves precision / lowers tokens | EXECUTED | **SUPPORTED** (offline scoped) | MEDIUM |
| E-002 | Posture labels → false_safe=0 | BLOCKED | BLOCKED | HIGH |
| E-003 | Stuck heuristic reduces thrash | BLOCKED | BLOCKED | HIGH |
| E-004 | Reinject after compact improves survival | BLOCKED | BLOCKED | HIGH |
| E-005 | Job wait→persist→resume; secrets=0; duplicate_mutate=0 | FIXTURE COMPLETE | **SUPPORTED** (job-path STATE_WRITE) | HIGH |

## Key Evidence

- E-005: `resume_success=1.0`; `duplicate_mutate=false` (15/15 mutation=1); `secret_exfiltration_in_state=0`; same-process interrupt MEASURED; OS kill NOT_MEASURED
- E-001: CONTROL P=0.335 / tok=1673; T_SKILLS_5 P=0.511 / tok=382; T_SKILLS_10 P=0.420 / tok=789; T_TOKENS_40 P=0.341 / tok=1010; `task_success=NOT_MEASURED`; raw under `raw/battery/`
- E-002…E-004: absence probes in each `raw/`

## Contradictory Results

None vs baseline claims. E-005 **does not** contradict “HITL PARTIALLY_OBSERVED” — it strengthens job-path evidence only.

## Limitations

- E-001 offline only; live host injection and live task_success unmeasured; token_estimate is PROXY
- LOW_SAMPLE on E-005; process kill simulated; `duplicate_mutate_count` not measured
- No ADRs issued

## Hypotheses Supported

- E-005 (scoped): job-path resume + checkpoint integrity + no secret patterns in checkpoint sample
- E-001 (scoped offline): smaller catalog budgets associated with higher offline activation precision and lower whitespace token estimates

## Hypotheses Weakened

- None formally (full E-005 product HITL remains unproven — scope limited, not weakened by contrary data)

## Hypotheses Refuted

- None

## Inconclusive Questions

- Live host catalog-budget effect (E-001 live gap)
- Sandbox posture efficacy (E-002)
- Semantic stuck detection (E-003)
- Compaction reinject (E-004)
- OS process kill + confirm-wait mutate (E-005 out of fixture scope)

## Architecture-Relevant Findings

1. Restored `jobs/` path is **empirically effective** for interrupt/resume under tested fixtures — decision input toward keeping/hardening job HITL, not an ADOPT of external frameworks.
2. Sandbox / stuck / compaction remain **implementation gaps** (E-002…E-004 BLOCKED).
3. E-001 offline evidence is **decision input only** — Architecture Decision Review (2026-09-19) **DEFERs** production `max_skills` / catalog optimizer; see `docs/architecture/decision-review/`.
4. Do not equate job-path SUCCESS with full HITL product readiness.
5. Decision review: **KEEP** job-path resume (scoped); **no runtime implementation** authorized from E-001/E-005 alone.
