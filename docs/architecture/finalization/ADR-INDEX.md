# ADR Index (Finalized)

| ADR | Status | Decision | Evidence scope | Limitations | Related prototype | Implementation |
|-----|--------|----------|----------------|-------------|-------------------|----------------|
| ADR-DR-0001 | ACCEPTED | KEEP job-path resume; DEFER exactly-once | E-005 job-path STATE_WRITE; same Node process; n=15 | OS kill / full HITL / external side effects not established | PT-002 | NOT_IMPLEMENTED |
| ADR-DR-0002 | ACCEPTED | DEFER production skill budget; KEEP runtime | E-001 offline; PROXY tokens; 176 tasks | live task_success / host injection NOT_MEASURED | PT-001 | NOT_IMPLEMENTED |
| ADR-DR-0003 | ACCEPTED | DEFER sandbox; DEFINE SECURITY MODEL FIRST | E-002 BLOCKED; audit path≠sandbox | Security checklist unanswered | — | NOT_IMPLEMENTED |
| ADR-DR-0004 | ACCEPTED | DEFER StuckDetector; DEFINE SEMANTICS FIRST | E-003 BLOCKED; maxIterations only | Semantics unanswered | — | NOT_IMPLEMENTED |
| ADR-DR-0005 | ACCEPTED | DEFER compaction; ARCHITECTURE FIRST | E-004 BLOCKED; Checkpoint distinct in E-005 | Ownership unanswered (future ADR) | — | NOT_IMPLEMENTED |

Canonical finalized files: `docs/architecture/finalization/adrs/`  
Original drafts (historical): `docs/architecture/decision-review/adr-drafts/` (not rewritten)
