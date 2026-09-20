# Claim Coverage

**Baseline:** `baseline-v1-2026-09-18`  
Complete only with measured data. Empty cells = not applicable / not present.

| Claim | Experiment | Eval | Evidence | Verdict | Scope |
| ------------------------------------- | ---------- | ------ | -------- | ------------ | ------------ |
| Smaller catalog alters offline activation | E-001 | EV-007 | yes | SUPPORTED (subclaim) | offline |
| Smaller catalog / truncation reduces token_estimate | E-001 | EV-008 | yes (PROXY) | SUPPORTED (subclaim) | offline PROXY |
| Smaller catalog improves live task success | — | — | no | INCONCLUSIVE | live |
| Live host catalog injection behaves like offline | — | — | no | INCONCLUSIVE | host |
| Resume restores job state | E-005 | EV-006 | yes | SUPPORTED (subclaim) | job-path |
| No duplicate STATE_WRITE | E-005 | EV-006 | yes | SUPPORTED (subclaim) | STATE_WRITE |
| Global exactly-once | — | — | no | INCONCLUSIVE | global |
| External side-effect exactly-once | — | — | no | INCONCLUSIVE | external |
| OS-kill / process restart recovery | — | — | no | INCONCLUSIVE | OS |
| Full product HITL validated | — | — | no | INCONCLUSIVE | product HITL |
| Sandbox is effective / refuse-if-unenforceable works | E-002 BLOCKED | — | no | INCONCLUSIVE | OS/sandbox |
| Stuck detector cuts thrash cost | E-003 BLOCKED | — | no | INCONCLUSIVE | thrash |
| Compaction preserves constraints | E-004 BLOCKED | — | no | INCONCLUSIVE | compact |

## Parent hypothesis roll-up

| Hypothesis | Roll-up verdict | Confidence |
|------------|-----------------|------------|
| H-001 | WEAKENED | MEDIUM |
| H-002 | INCONCLUSIVE | UNKNOWN |
| H-003 | INCONCLUSIVE | UNKNOWN |
| H-004 | INCONCLUSIVE | UNKNOWN |
| H-005 | WEAKENED | MEDIUM |
