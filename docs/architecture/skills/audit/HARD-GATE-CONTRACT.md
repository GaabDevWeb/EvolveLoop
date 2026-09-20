# HARD-GATE Contract — MegaBrain Policy Gates

**Date:** 2026-09-19  
**Status:** PRE_PRUNING

## Shared semantics

```text
gate_required = true AND gate_not_satisfied → BLOCK_TRANSITION (fail-closed)
policy hard gate ≠ TS Execution Engine enforcement (current architecture)
```

Evidence lives under `memory/<feature_id>/evidence/`.

Helpers (evals only): `orchestrator/src/policy/skill-gates.ts`

---

## grill-me

```yaml
id: grill-me
version: "2.0.0"
role: upstream
purpose: Stress-test requirements/design before executable planning
trigger_conditions:
  - phase05_active + docs_approved
  - risk_tier standard|sensitive with new RF
  - significant_scope_change
  - Policy require[] includes grill-me
hard_gate: true
required_before: [/planejar, plan.ir.yaml material execution]
required_after: [/prd approval when Fase 0.5]
inputs: [prd_package, design_notes, user_answers]
outputs: [GRILL_ME_RESULT, gate.grill-me.json]
minimum_valid_output:
  - problem_understood
  - requirements_challenged
  - user_confirmed_shared_understanding
  - readiness_for_planning
failure_behavior: BLOCKED — never soft-continue to planner
evidence: memory/<feature_id>/evidence/gate.grill-me.json
telemetry: GATE_REQUIRED | GATE_SATISFIED | BLOCKED | FAILED
exemptions:
  - hotfix without new RF
  - trivial_non_design
  - fully_specified_execution
  - explicit user skip + exempt evidence
dependencies: []
non_responsibilities: [prd authoring, implementation, ADR authority]
authority_note: "grill-me IS the operational skill; no separate grilling package in CursorSKILLS"
```

## image-to-code

```yaml
id: image-to-code
version: existing
role: visual-generation
purpose: Image-first UI implementation when user attaches images
trigger_conditions: [image_attachment true]
hard_gate: true
required_before: [UI implement / Vision build]
required_after: []
inputs: [attached_image]
outputs: [analysis, UI artifacts]
minimum_valid_output: [read SKILL.md, analyze attachment, implement aligned]
failure_behavior: policy BLOCK — no implement-by-eye
evidence: SSOT image_attachment_gate + Vision workflow
telemetry: GATE_REQUIRED | GATE_SATISFIED | BLOCKED
exemptions: none when image attached
dependencies: []
non_responsibilities: [browser QA as substitute for Vision]
enforcement: policy_agent_not_ts_engine
```

## Comparison table

| Gate | Condição | Enforcement | Evidence | Fail-Closed | Status |
|------|----------|-------------|----------|-------------|--------|
| image-to-code | imagem anexada | policy/agent | SSOT + Vision | yes (policy) | KEEP / DO_NOT_REMOVE |
| grill-me | design/planning scope | policy/agent + Evidence Bus | gate.grill-me.json | yes (required) | OPERATIONAL HARD-GATE |
| gaabwiki | Fase 0 técnico | policy/agent | grounding.json | yes | KEEP |
| prd approval | docs | policy/HITL | docs:aprovado | yes | KEEP |
