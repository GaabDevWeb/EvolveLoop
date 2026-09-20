# Audit Impact

Impacto da reconciliação CursorSKILLS ↔ AGENTS/Cursor sobre conclusões em `docs/audit/*`.

```yaml
impact:

  - previous_claim: "CursorSKILLS orchestrator tree incomplete: src/jobs/ missing"
    affected_by: "Confirmed; only structural src gap vs AGENTS; 47/48 other src files identical"
    impact: NONE
    new_status: CONFIRMED_STRENGTHENED
    evidence:
      - "diff -rq src: Only in AGENTS: jobs; only content diff run-jobs.ts"
      - "AGENTS npm test 103/103"

  - previous_claim: "Full-cycle integration tests cannot load here (missing jobs)"
    affected_by: "Reproduced on CS; AGENTS full-cycle 5/5 pass"
    impact: NONE
    new_status: CONFIRMED
    evidence:
      - "CS vitest load errors for jobs imports"
      - "AG full-cycle.test.ts passed"

  - previous_claim: "103 tests green / jobs resume not reproducible on CursorSKILLS"
    affected_by: "103 is AGENTS SSOT claim; reproduced on AGENTS; still not on CS"
    impact: LOW
    new_status: SCOPE_CLARIFIED
    evidence:
      - "IMPLEMENTATION-STATUS: SSOT testes AGENTS/Cursor/orchestrator"
      - "AGENTS npm test 103 passed"
      - "Ambiguity only if reader ignores SSOT line"

  - previous_claim: "Measured slice 43 pass / 2 fail (evidence validator drift)"
    affected_by: "Full suite now 89 pass / 3 fail (+ load fails); evidence 2 fails still TEST_DRIFT"
    impact: LOW
    new_status: SUPERSEDED_BY_FULL_SUITE_MEASUREMENT
    evidence:
      - "docs/reconciliation/TEST-RECONCILIATION.md"
      - "validator.ts identical; CS evidence.test.ts has +2 asserts"

  - previous_claim: "JOB_PENDING → waiting code present; job store/checkpoint ABSENT in this tree"
    affected_by: "execution-engine identical to AGENTS; modules exist only in AGENTS and are reachable there"
    impact: NONE
    new_status: CONFIRMED
    evidence:
      - "JOBS-RECONCILIATION.md reachability"

  - previous_claim: "HITL / resume / checkpoint fragile or unproven on this tree"
    affected_by: "Proven on AGENTS via job-resume + full-cycle; still unproven on CS without jobs"
    impact: MEDIUM
    new_status: SPLIT_BY_TREE
    evidence:
      - "AGENTS job-resume tests pass"
      - "CS cannot load those tests"

  - previous_claim: "Syncing or restoring src/jobs/ is prerequisite before PROVEN resume/HITL on this package copy"
    affected_by: "Reconciliation: sync warranted (Q5 YES) but merge run-jobs/evidence-test deltas"
    impact: LOW
    new_status: CONFIRMED_WITH_MERGE_CAVEAT
    evidence:
      - "REPOSITORY-RECONCILIATION.yaml recommendation"

  - previous_claim: "Orchestrator core IR→Scheduler→Registry→Provider real on CursorSKILLS"
    affected_by: "Shared src identical for those modules; jobs gap does not invalidate unit-level core"
    impact: NONE
    new_status: CONFIRMED
    evidence:
      - "47 identical shared src files including engine/scheduler/registry paths"

  - previous_claim: "Evidence builders/validators PARTIALLY_IMPLEMENTED; 2 evidence tests failing"
    affected_by: "Classified as TEST_DRIFT (tests ahead), not implementation divergence between trees"
    impact: MEDIUM
    new_status: RECLASSIFIED_TEST_DRIFT
    evidence:
      - "validator.ts/builders.ts identical AG↔CS"
      - "only evidence.test.ts differs"

  - previous_claim: "Research ALREADY_PRESENT for Orchestrator weakened by missing jobs"
    affected_by: "Same; plus clarity that complete implementation lives in sibling AGENTS tree"
    impact: HIGH
    new_status: CONFIRMED_PLUS_SIBLING_SSOT
    evidence:
      - "Relationship SAME_SYSTEM_DIFFERENT_VERSION"
      - "Canonical role split BOTH"

  - previous_claim: "RunState / durable HITL product UX"
    affected_by: "Engine+jobs in AGENTS implement waiting/checkpoint/resume path; not product UX; CS missing jobs"
    impact: MEDIUM
    new_status: PARTIAL_ON_AGENTS_ABSENT_ON_CS
    evidence:
      - "checkpoint.ts + ExecutionEngine wait/resume path"

  - previous_claim: "Policy / Authority / Sandbox / Evidence Bus findings"
    affected_by: "Not driven by jobs tree split; still apply to shared code"
    impact: NONE
    new_status: UNCHANGED
    evidence:
      - "Those modules identical or CS-superset; jobs orthogonal"

  - previous_claim: "contract-prototype 7/7 passed"
    affected_by: "Consistent with AGENTS suite inclusion; contracts independent of jobs"
    impact: NONE
    new_status: CONFIRMED
    evidence:
      - "TEST-RECONCILIATION.md"

  - previous_claim: "Recommended next: Diff/sync jobs from AGENTS"
    affected_by: "Reconciliation forbids auto-sync but finds YES sufficient evidence to plan sync"
    impact: LOW
    new_status: ESCALATED_TO_DECISION_NOT_AUTO_IMPLEMENT
    evidence:
      - "decision_gate Q5 YES with merge caveat"
```

## Priority areas (summary)

| Area | Impact on prior audit |
|------|------------------------|
| Orchestrator core | Unchanged (real); completeness split by tree |
| RunState / HITL / Checkpoint | **HIGH clarification:** implemented+tested in AGENTS; broken references in CS |
| Evidence | **MEDIUM:** failures = TEST_DRIFT, not jobs |
| Policy | Unchanged |
| Full-cycle | Confirmed CS fail / AGENTS pass |
| 103 tests | **Scope clarified** → AGENTS only |

## Net effect

A auditoria de implementação **não estava errada** sobre CS. Estava **incompleta** quanto à relação factual entre árvores: CS e AGENTS são o **mesmo sistema**; AGENTS é o SSOT **executável** para jobs/testes; claims “103/resume” descrevem AGENTS (quando a linha SSOT é respeitada), não o tree CS incompleto.
