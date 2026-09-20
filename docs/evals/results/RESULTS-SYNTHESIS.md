# Results & Evidence Synthesis

## Scope

Canonical consolidation of experimental evidence for CursorSKILLS Agent System under baseline `baseline-v1-2026-09-18`. Focus: **E-001**, **E-005**. Catalog: E-002/E-003/E-004 as **BLOCKED** (not executed).

## Baseline Reference

- ID: `baseline-v1-2026-09-18`  
- Invariants after experiments: 103/103, 7/7, 5/5  
- Baseline directory: **immutable** (not modified by consolidation)

## E-001

| Item | Value |
|------|--------|
| Status | EXECUTED (offline) |
| Conditions | 4/4 |
| Control runs | 5 |
| Treatment runs | 15 |
| Result | SUPPORTED (MEDIUM, offline scoped) |
| token ~40% | **T_TOKENS_40 only** (1010 vs 1673) |

See CLAIMS CLM-E001-* and METRIC-LEDGER E001-M-*.

## E-005

| Item | Value |
|------|--------|
| Status | COMPLETED_FIXTURE |
| Runs | 15/15 |
| resume_success | 1.0 |
| duplicate_mutate | false |
| Side effect | STATE_WRITE |
| OS kill | NOT_MEASURED |
| Result | SUPPORTED (HIGH, fixture scoped) |

## Cross-Experiment Findings

E-001 and E-005 address **different** properties (catalog shaping vs job resume). No causal cross-link asserted.

## Measured Properties

- E-001: catalog_size, activation_precision/recall, skills_activated_*, wall_clock (harness)  
- E-005: resume_success, duplicate_mutate, observed_mutations, state_integrity, same_process interruption  

## Proxy Measurements

- E-001 `token_estimate` (whitespace)

## Not Measured

- E-001: task_success, skills_loaded/invoked, live host injection, vendor tokenizer  
- E-005: OS kill, external side effects beyond STATE_WRITE, global exactly-once, full HITL  

## Supported Claims

See `CLAIMS.yaml` (CLM-E001-001/002; CLM-E005-001/002/003).

## Unsupported Claims

See `CLAIMS.yaml` unsupported_claims_explicitly_rejected + `CLAIM-BOUNDARIES.md`.

## Contradictions

One resolved interpretive issue (CX-001 token ~40%). See `CONTRADICTIONS.md`.

## Evidence Quality

| Experiment | Overall |
|------------|---------|
| E-001 | MEDIUM |
| E-005 | HIGH |
| E-002…E-004 | UNKNOWN (BLOCKED) |

## Limitations

Preserve all experiment limitations; consolidation does not strengthen claims.

## Open Questions

- Live catalog budget effect (E-001-LIVE)  
- OS-kill resume (E-005-OS-KILL)  
- Confirm-path side effects  
- Security / stuck / compaction prerequisites  

## Input to Evals

Consume `docs/evals/results/*` ledgers; see `EVAL-HANDOFF.md`.
