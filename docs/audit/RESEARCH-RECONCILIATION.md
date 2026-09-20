# RESEARCH-RECONCILIATION

**Date:** 2026-09-18  
**Inputs:** `docs/research/DECISION-MATRIX.md`, `DO-NOT-CHANGE.md`, this audit  
**Rule:** Do not silently rewrite research artifacts; this file records reconciliation only.

```yaml
reconciliation:
  - mechanism: Capability + Provider registries
    previous_decision: ALREADY_PRESENT
    audit_status: IMPLEMENTED
    reconciliation: CONFIRMS
    explanation: selectWithEvidence + manifests + unit tests OBSERVED
    evidence_ids: [EA-0002, EA-0010]

  - mechanism: Orchestrator + Capability IR
    previous_decision: ALREADY_PRESENT
    audit_status: PARTIALLY_IMPLEMENTED
    reconciliation: WEAKENS
    explanation: Core loop code present but this tree missing src/jobs/ breaks engine load / full-cycle
    evidence_ids: [EA-0001, EA-0003]

  - mechanism: Policy Engine
    previous_decision: ALREADY_PRESENT
    audit_status: PARTIALLY_IMPLEMENTED
    reconciliation: REFINES
    explanation: Split ExecutionPolicy (schedule) vs CapabilityAuthority (enforce on deterministic only)
    evidence_ids: [EA-0004, EA-0005]

  - mechanism: Evidence Bus
    previous_decision: ALREADY_PRESENT
    audit_status: PARTIALLY_IMPLEMENTED
    reconciliation: WEAKENS
    explanation: EvolveLoop FS bus ≠ engine Evidence[]; do not equate
    evidence_ids: [EA-0006, EA-0007]

  - mechanism: Skills SKILL.md packages
    previous_decision: ALREADY_PRESENT
    audit_status: IMPLEMENTED
    reconciliation: CONFIRMS
    explanation: Packages on disk; relation to providers is JobFile/CursorSkill not Skill=Capability
    evidence_ids: [EA-0008]

  - mechanism: Wiki Knowledge
    previous_decision: ALREADY_PRESENT
    audit_status: PARTIALLY_IMPLEMENTED
    reconciliation: REFINES
    explanation: KnowledgeStore + optional wiki subprocess; degraded/UNAVAILABLE possible
    evidence_ids: [EA-0009]

  - mechanism: MCP via host / reject reimplement
    previous_decision: ADOPT host / REJECT reimplement
    audit_status: NOT_IMPLEMENTED (in orchestrator) — expected
    reconciliation: CONFIRMS
    explanation: No MCP transport in package; correct per DO-NOT-CHANGE
    evidence_ids: [EA-0011]

  - mechanism: Reject foreign runtime embed
    previous_decision: REJECT
    audit_status: NOT_IMPLEMENTED (no LangGraph/etc.)
    reconciliation: CONFIRMS
    explanation: No embed observed
    evidence_ids: []

  - mechanism: Progressive disclosure / skill budgets
    previous_decision: ADAPT + PROTOTYPE
    audit_status: NOT_IMPLEMENTED (orchestrator)
    reconciliation: CONFIRMS (still prototype)
    explanation: Host/skill concern; no engine catalog budget
    evidence_ids: []

  - mechanism: OS sandbox
    previous_decision: PROTOTYPE
    audit_status: NOT_IMPLEMENTED
    reconciliation: CONFIRMS / WEAKENS baseline PARTIAL
    explanation: Path confinement ≠ sandbox; research PROTOTYPE still correct
    evidence_ids: [EA-0012]

  - mechanism: Stuck detector
    previous_decision: PROTOTYPE
    audit_status: NOT_IMPLEMENTED (semantic)
    reconciliation: CONFIRMS
    explanation: Only maxIterations bound
    evidence_ids: [EA-0013]

  - mechanism: HITL RunState / checkpoint
    previous_decision: PROTOTYPE
    audit_status: DEAD_OR_UNREACHABLE (this tree)
    reconciliation: WEAKENS
    explanation: Designed around jobs/; module missing → experiment blocked
    evidence_ids: [EA-0003, EA-0014]

  - mechanism: Compaction reinject
    previous_decision: PROTOTYPE
    audit_status: NOT_IMPLEMENTED
    reconciliation: CONFIRMS
    explanation: No engine compaction
    evidence_ids: []

  - mechanism: DO-NOT-CHANGE registries/runtime/Evidence intent
    previous_decision: DO_NOT_CHANGE
    audit_status: mixed
    reconciliation: REFINES
    explanation: Keep registries/IR; refine Evidence meaning; fix jobs sync before claiming PROVEN resume
    evidence_ids: [EA-0006]
```
