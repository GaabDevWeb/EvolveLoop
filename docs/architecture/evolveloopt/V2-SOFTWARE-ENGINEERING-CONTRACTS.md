# V2 Software Engineering Contracts

**Status:** SE-01 + SE-02 + SE-03 IMPLEMENTED; later stages still DESIGNED  
**Branch:** `evolve-v2`  
**Canonical seams:** CapabilityIR, AgentDecision, Evidence, EventBus, ReplanInput, **RequirementsSpec**, **ArchitectureSpec**, **EngineeringTaskGraph**  
**Code:** `orchestrator/src/requirements/`, `orchestrator/src/architecture/`, `orchestrator/src/tasks/`

**Design rule:** Agents produce proposals/specs. Runtime authorizes, executes, and persists.  
`ImplementationResult ≠ AgentDecision` · `TestResult ≠ ValidationResult` · `DeliveryResult ≠ “agents idle”`

---

## RequirementsSpec

| Aspect | Definition |
|--------|------------|
| **Purpose** | Versioned, traceable model of what must be built |
| **Input** | Brief, PRD refs, constraints, prior RequirementsSpec (diff) |
| **Output** | `requirements[]` with ids, statements, priority, status, assumptions, links to PRD |
| **Authority** | None — agent proposes (`REQUIREMENTS_PROPOSAL`); Runtime validates, versions, baselines |
| **Side effects** | None until Runtime writes artifact store |
| **Evidence** | `buildRequirementsEvidence` (planning-shaped) |
| **Telemetry** | `RequirementsExtractionStarted` / `RequirementsProposalProduced` / `RequirementsValidationFailed` / `RequirementsBaselineCreated` / `RequirementsVersionCreated` |
| **Failure** | Ambiguity → HUMAN_REQUIRED; conflicts → NOT_READY; policy hostility → POLICY_BOUNDARY |
| **Persistence** | YAML `requirements://{id}@{version}` — immutable once written |

### Types (implemented)

| Type | Role |
|------|------|
| `RequirementsSpec` | Top-level artifact (`kind`, `apiVersion`, `requirements_id`, `version`, …) |
| `Requirement` | Single requirement (`REQ-*`, priority, status, source, acceptance_criteria, …) |
| `RequirementSource` | Provenance (`PRD`, `BRIEF`, `INFERENCE`, …) |
| `RequirementVersion` | Encoded as `version` + `parent_version` + baseline flags |
| `RequirementChange` / `RequirementsChangeSet` | Diff: added / removed / modified / status_changed |
| `RequirementValidationResult` | `ok`, `readiness`, errors, warnings, conflicts, duplicates |
| `RequirementConstraint` | Explicit constraints separate from functional REQs |
| `RequirementAssumption` | Non-auto-approved assumptions |
| `OpenQuestion` | Clarifications; `BLOCKING` gates architecture |

**AgentDecision:** `REQUIREMENTS_PROPOSAL` + `proposed_requirements_spec` (never `REQUIREMENTS_EXECUTION`).

---

## ArchitectureSpec

| Aspect | Definition |
|--------|------------|
| **Purpose** | Structured architecture proposal for validation before tasking |
| **Input** | RequirementsSpec baseline, constraints, existing paths/knowledge |
| **Output** | Components, interfaces, deps, tech choices, NFRs, test/deploy posture |
| **Authority** | None — agent proposes (`ARCHITECTURE_PROPOSAL`); Runtime validates/baselines |
| **Side effects** | None until Runtime writes artifact store |
| **Evidence** | `buildArchitectureEvidence` |
| **Telemetry** | `ArchitectureGenerationStarted` / `ArchitectureProposalProduced` / `ArchitectureValidationFailed` / `ArchitectureBaselineCreated` / `ArchitectureVersionCreated` |
| **Failure** | Schema/semantic/policy/scope/unmapped MUST → no Task Graph |
| **Persistence** | YAML `architecture://{id}@{version}` — immutable once written |

### Types (implemented)

| Type | Role |
|------|------|
| `ArchitectureSpec` | Top-level artifact bound to `requirements_reference` |
| `ArchitectureComponent` | `CMP-*` with responsibility, deps, origin EXISTING/PROPOSED |
| `ArchitectureInterface` | `IF-*` provider/consumer/protocol |
| `ArchitectureDecision` | `ADR-*` chosen/alternatives/tradeoffs |
| `ArchitectureChange` / `ArchitectureChangeSet` | Version diff + brownfield `architecture_delta` |
| `ArchitectureValidationResult` | readiness + errors/warnings + unmapped_must |
| `ArchitectureFeedback` | Non-mutating requirement feedback proposals |
| `TechnologyChoice` | CONSTRAINT vs ARCHITECTURAL_PROPOSAL |

**AgentDecision:** `ARCHITECTURE_PROPOSAL` + `proposed_architecture_spec` (never execution).

---

## EngineeringTask

| Aspect | Definition |
|--------|------------|
| **Purpose** | One schedulable unit of engineering work (definition, not execution) |
| **Input** | ArchitectureSpec slice, requirement_ids |
| **Output** | Declared outputs + DoD + evidence requirements |
| **Authority** | None — Runtime authorizes later |
| **Side effects** | Declared as metadata only in SE-03 |
| **Evidence** | Declared requirements; produced at execution time |
| **Telemetry** | Via TaskGraph events |
| **Failure** | Validation reject / future execution fail |
| **Persistence** | Node inside EngineeringTaskGraph artifact |

### Types (implemented)

`EngineeringTask`, `TaskDependency`, `TaskArtifactRef`, `TaskEvidenceRequirement`

---

## EngineeringTaskGraph

| Aspect | Definition |
|--------|------------|
| **Purpose** | Validatable DAG of engineering tasks bound to REQ+ARCH baselines |
| **Input** | RequirementsSpec + ArchitectureSpec |
| **Output** | EngineeringTaskGraph (not CapabilityIR) |
| **Authority** | None until future PlanEmitter + A03 |
| **Side effects** | None in SE-03 |
| **Evidence** | `buildTaskGraphEvidence` |
| **Telemetry** | `TaskGraphGenerationStarted` / `ProposalProduced` / `ValidationFailed` / `BaselineCreated` / `VersionCreated` |
| **Failure** | BLOCKED/INVALID health → no execution planning |
| **Persistence** | YAML `taskgraph://{id}@{version}` |

### Types (implemented)

| Type | Role |
|------|------|
| `EngineeringTaskGraph` | Top-level work graph |
| `TaskGraphValidationResult` | health + errors/warnings + coverage gaps |
| `TaskGraphChange` / `TaskGraphChangeSet` | Version diff |
| `CoverageJustification` | Explicit non-task coverage |

**AgentDecision:** `TASK_GRAPH_PROPOSAL` + `proposed_task_graph`.

**Boundary:** CapabilityGraph remains Runtime IR — see `ADR-TASK-GRAPH-BOUNDARY.md`.

---

## DelegationRequest / DelegationResult

### DelegationRequest

| Aspect | Definition |
|--------|------------|
| **Purpose** | Supervisor asks Runtime to assign a child reasoning/execution scope |
| **Input** | parent_task, child objective, agent_id/role, scope, budget slice, deadline, required outputs |
| **Output** | Accepted delegation id or reject |
| **Authority** | Runtime enforces depth/budget/scope; agent cannot self-approve |
| **Side effects** | None until child capabilities run |
| **Evidence** | Delegation accepted/rejected record |
| **Telemetry** | Future `DelegationStarted` / reuse OrchestratorDecision |
| **Failure** | Depth exceeded, budget, scope illegal, agent unavailable |
| **Persistence** | Link parent↔child task ids |

### DelegationResult

| Aspect | Definition |
|--------|------------|
| **Purpose** | Structured outcome of delegated work (not self-success claim) |
| **Input** | Child AgentExecutionResult + Runtime execution/evidence |
| **Output** | status, artifacts refs, open failures, recommendation (repair/replan/done) |
| **Authority** | None |
| **Side effects** | None |
| **Evidence** | Pointers only |
| **Failure** | Malformed child output, timeout, AGENT_UNABLE |

---

## ImplementationResult

| Aspect | Definition |
|--------|------------|
| **Purpose** | Runtime-observed outcome of implementation capabilities |
| **Input** | ExecuteResults from edit/test/build providers |
| **Output** | files_changed, diff_summary, commands, artifacts, provider ids |
| **Authority** | Produced by Runtime/providers — **not** by AgentDecision alone |
| **Side effects** | Already occurred under A03/B01 |
| **Evidence** | Mandatory code-change + command evidence |
| **Telemetry** | NodeCompleted / NodeFailed |
| **Failure** | Provider fail, policy deny, conflict, DoD incomplete |
| **Persistence** | Evidence store + optional git task commit (future) |

---

## TestResult

| Aspect | Definition |
|--------|------------|
| **Purpose** | Observable test command outcome |
| **Input** | test capability execution |
| **Output** | command, exit_code, duration, summary streams, pass/fail counts, artifacts |
| **Authority** | Runtime/provider |
| **Side effects** | Process execution (risk: build/test = code exec) |
| **Evidence** | Test evidence kind |
| **Telemetry** | NodeCompleted with usage |
| **Failure** | Nonzero exit, timeout, env failure |
| **Persistence** | Artifacts + evidence |

Does **not** imply ValidationResult pass.

---

## ValidationResult

| Aspect | Definition |
|--------|------------|
| **Purpose** | Independent assessment vs requirements/architecture/DoD/evidence |
| **Input** | RequirementsSpec, ArchitectureSpec, ImplementationResult(s), TestResult(s), evidence index |
| **Output** | verdict, coverage matrix, gaps (`UNVERIFIED REQUIREMENT`), findings |
| **Authority** | Gate progression; Implementation Agent cannot sole-approve |
| **Side effects** | None (read/analyze); Runtime may emit gate events |
| **Evidence** | Validation evidence |
| **Telemetry** | GateAllowed / GateDenied / future ValidationCompleted |
| **Failure** | Coverage gaps, contradiction, fake/missing evidence |
| **Persistence** | Versioned validation report |

---

## DeliveryResult

| Aspect | Definition |
|--------|------------|
| **Purpose** | Project/milestone delivery package |
| **Input** | All prior specs + validation pass + workspace consistency check |
| **Output** | `DELIVERY_COMPLETE` or blocked; artifact bundle refs |
| **Authority** | Runtime + policy (deploy separate and higher risk) |
| **Side effects** | Persist delivery manifest; deploy only if separately authorized |
| **Evidence** | Delivery evidence set |
| **Telemetry** | FeatureCompleted / FeatureBlocked |
| **Failure** | Incomplete coverage, inconsistent workspace, policy |
| **Persistence** | Delivery manifest + evidence index |

`DELIVERY_COMPLETE` requires: requirements satisfied, tests + required validation, evidence complete, artifacts persisted, workspace consistent — not merely agent quiescence.

---

## Related existing contracts (do not duplicate)

| Existing | Relation |
|----------|----------|
| `AgentExecutionRequest/Result/Decision` | Reasoning turns for all SE agent roles |
| `ExecuteRequest/Result` | Capability effects |
| `ReplanInput/Result` | A04 plan changes |
| `StructuredIntent` | Bridge into PlanEmitter |
| `Evidence` | Proof objects |
| `EngineCheckpoint` | B04 recovery |

---

## Ambiguity & assumption records

Attached to RequirementsSpec items:

```text
assumption_id, requirement_id, disposition (SAFE_ASSUMPTION|…),
text, made_by (agent_id), made_at, review_status
```

Critical invented requirements without assumption record → validation FAIL.
