# Eval Coverage Matrix

Baseline: `baseline-v1-2026-09-18`  
Catalog version: 1  

| Property | Evidence | Experiment | Eval | Status |
| -------- | -------- | ---------- | ---- | ------ |
| Runtime IR→execute path | Baseline tests | — | EV-001 | READY |
| Capability/Provider resolution | Baseline tests | — | EV-002 | READY |
| Registry correctness | Baseline tests | — | EV-003 | READY |
| Authority enforcement (deterministic) | Baseline tests | — | EV-004 | READY |
| Engine Evidence[] integrity | Baseline tests | — | EV-005 | READY |
| Resume success (job-path) | E005-EV-* | E-005 | EV-006 | READY_AFTER_FIXTURE |
| Duplicate STATE_WRITE | E005-EV-* | E-005 | EV-006 | READY_AFTER_FIXTURE |
| State integrity (fixture) | E005-EV-* | E-005 | EV-006 | READY_AFTER_FIXTURE |
| Offline skill activation | E001-EV-* | E-001 | EV-007 | READY |
| token_estimate (PROXY) | E001-EV-* | E-001 | EV-008 | READY |
| Regression invariants 103/7/5 | Baseline | E-001/E-005 post-checks | EV-009 | READY |
| Live task success | — | — | EV-F-001 | NOT_MEASURED / BLOCKED_BY_ENVIRONMENT |
| Live host catalog injection | — | — | — | NOT_MEASURED |
| Vendor tokenizer | — | — | — | NOT_MEASURED |
| Global exactly-once | — | — | EV-F-002 | NOT_EVALUABLE |
| OS kill recovery | — | — | EV-F-003 | READY_AFTER_FIXTURE (PT-002) |
| Sandbox | — | E-002 BLOCKED | EV-F-004 | BLOCKED |
| Stuck detection | — | E-003 BLOCKED | EV-F-005 | BLOCKED |
| Compaction | — | E-004 BLOCKED | EV-F-006 | BLOCKED |
| Full HITL | — | — | — | NOT_MEASURED |
| Authority on Mock/Skill/JobFile | audit gap | — | — | PARTIAL (EV-004 scoped) |
