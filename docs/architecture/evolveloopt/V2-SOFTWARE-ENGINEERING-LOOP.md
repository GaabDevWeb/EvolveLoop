# V2 Software Engineering Loop

**Status:** DESIGNED (loop); **SE-01 + SE-02 + SE-03 IMPLEMENTED**  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Depends on:** A01–A04, B01, B04, AgentExecutor, ReasoningProvider  
**SE-01:** `V2-SE01-REQUIREMENTS-CONTRACT.md` / `orchestrator/src/requirements/`  
**SE-02:** `V2-SE02-ARCHITECTURE-CONTRACT.md` / `orchestrator/src/architecture/`  
**SE-03:** `V2-SE03-TASK-GRAPH.md` / `orchestrator/src/tasks/`

---

## North Star

```text
BRIEF → WORKING SOFTWARE
```

Given:

```text
Brief + PRD + authorized workspace + constraints
```

EvolveLoop should eventually produce:

```text
Working repository + tests + evidence + documentation
```

without human intervention between steps **not** classified `HUMAN_REQUIRED` by policy.

**This milestone does not implement that path.** It designs the layer that will sit **above** the Runtime.

---

## Goals

1. Formalize **Software Engineering Autonomy** as a bounded loop over existing Runtime.
2. Reuse `AgentExecutor`, `PlanEmitter`, `CapabilityGraph`, A03/A04/B01/B04, Evidence, KnowledgeBackend.
3. Separate **proposal** (agents) from **authority/execution** (runtime).
4. Separate **repair** from **replan**; **testing** from **validation**; **software factory** from **self-evolution**.
5. Define CRM MVP as the proving benchmark (later).

---

## Non-Goals (this milestone)

- No new agents, code executors, CI, CRM build, workspace mutation.
- No ExecutionEngine / A0x / B0x changes.
- No default LLM selection.
- No second orchestrator, policy engine, IR, or RAG.
- No push / merge / `main` edits.

---

## Software Engineering Autonomy (definition)

```text
Software Engineering Autonomy
= ability to transform a sufficiently specified software objective
  into a validated working repository
  through bounded autonomous execution.
```

Covered phases: understand → plan → decompose → delegate → implement → test → observe → repair → replan → validate → document → deliver.

---

## Existing Components Audit

| Component | Already solves | Gap / integration only |
|-----------|----------------|------------------------|
| **AgentExecutor / ReasoningProvider** | Structured decisions; live Ollama opt-in | Engineering decision modes (REQUIREMENTS, ARCHITECTURE, …) |
| **PlanEmitter / StructuredIntent** | Intent → CapabilityIR | Emit from ArchitectureSpec / EngineeringTaskGraph |
| **CapabilityGraph (IR)** | Executable DAG, DoD, deps | Carry `requirement_id`, task ownership, file scope metadata |
| **ExecutionEngine** | Run IR under policy | Project/milestone orchestration wrappers (not a second engine) |
| **Capability / Provider registries** | Discovery, selection | Engineering capabilities: `workspace.edit`, `git.*`, `test.run`, `build` (governed) |
| **PolicyEngine / CapabilityAuthority / A03** | Authorize effects | Stage gates as gateContext / policy overlays |
| **A04 Replanner** | Bounded replan | Map CODE_BUG→repair vs ARCHITECTURE_ERROR→project replan |
| **B01** | Budgets, timeouts, concurrency | Conceptual hierarchy project→task→invocation |
| **B04** | Crash recovery | Extend identity to milestone/project (design only) |
| **Evidence / EventBus** | Proof + telemetry | Code-change / test / validation / delivery evidence kinds |
| **KnowledgeBackend** | Retrieval | Project conventions, architecture docs (no new RAG) |
| **AgentContextAssembler** | Least-privilege context | Task-scoped + revision/hash for stale context |
| **EvolveLoop (longitudinal)** | Self-evolution signals | **Separate** from SE factory |
| **Cursor skills/agents** (`architect`, `testing`, `debugger`, `backend`, `frontend-pro`, …) | Role/prompt behavior | Map role→skill→capabilities; **SKILL ≠ executor** |

**Verdict:** Prefer **integration** of existing seams over parallel systems. Missing pieces are **contracts** (RequirementsSpec, ArchitectureSpec, EngineeringTask, Delegation, ValidationResult, DeliveryResult) and **workflows**, not a new runtime.

---

## Architectural Boundary

```text
Agent                          → decide / propose
Software Engineering Layer     → coordinate engineering intent
Runtime                        → authorize + execute + persist
Provider                       → perform effect
```

```text
Supervisor ≠ Orchestrator
Agent role ≠ authority
Implementation claim ≠ TASK_COMPLETED
tests pass ≠ requirements satisfied
Git commit ≠ B04 checkpoint
Software factory ≠ self-evolution
```

---

## End-to-End Flow (future)

```text
                   USER
                    │
                  PRD
                    ↓
             Requirements Agent
                    ↓
             RequirementsSpec
                    ↓
             Architecture Agent
                    ↓
             ArchitectureSpec
                    ↓
             Task Decomposer
                    ↓
          Engineering Task Graph
              (CapabilityGraph + metadata)
                    ↓
              Supervisor
             ↙    ↓     ↘
      Backend   Frontend   Database
       Agent      Agent      Agent
          ↓         ↓         ↓
             IMPLEMENTATION (capabilities)
                    ↓
                 TESTING
                    ↓
                VALIDATION (independent)
                    ↓
             FAIL? ─ YES → REPAIR (same plan)
                │            ↓ (if needed)
                │         REPLAN (A04 / higher)
                └────────────┘
                    ↓
                 DELIVERY
```

Beside it:

```text
              RUNTIME
                 │
     ┌───────────┼───────────┐
     ↓           ↓           ↓
   Policy      Evidence   Checkpoint
     ↓           ↓           ↓
 Authorization / Execution / Recovery
```

---

## Requirements Stage

```text
Brief → PRD → RequirementsSpec
```

| Actor | Role |
|-------|------|
| Agent | Extract requirements; flag ambiguity; propose clarifications / safe assumptions |
| Runtime | Persist identity, version, status, traceability; gate progression |
| Capability | Optional retrieval/read of PRD artifacts |
| Evidence | Requirements extraction evidence (not “LLM said OK”) |

### Ambiguity disposition

| Class | Meaning |
|-------|---------|
| `AUTO_RESOLVE` | Deterministic rule / known convention |
| `SAFE_ASSUMPTION` | Explicit assumed default; recorded on requirement |
| `NEED_INFORMATION` | AgentDecision; pause task |
| `HUMAN_REQUIRED` | Policy gate |
| `BLOCKED` | Cannot proceed |

Critical requirements **must not** be invented silently — any assumption is typed `SAFE_ASSUMPTION` with `assumption_id`.

### Traceability lineage

```text
requirement_id
  → prd_section_ref
  → task_id(s)
  → code change evidence
  → test evidence
  → validation evidence
  → delivery evidence
```

Missing link → `UNVERIFIED REQUIREMENT` at Validation/Delivery gates.

---

## Architecture Stage

**Architecture Agent** (reuse skill/agent `architect` as role source) proposes **ArchitectureSpec** (structured, not prose-only):

- components, interfaces, dependencies  
- technology choices, constraints, NFRs  
- testing strategy, deployment posture  

Runtime validates:

```text
schema → semantic → policy (approved stack, capabilities, budget, workspace)
```

Invalid ArchitectureSpec → **no Task Graph emission**.

---

## Task Decomposition

```text
ArchitectureSpec → EngineeringTask[] → CapabilityGraph
```

**Decision:** Prefer **CapabilityGraph** as the executable Task Graph. Add engineering metadata on nodes (`requirement_ids`, `preferred_agent_role`, `file_scope`, `task_owner`). Do **not** invent `SoftwareTaskGraph` unless CapabilityGraph proves semantically insufficient (GAP to revisit only with evidence).

Each **EngineeringTask** (node-level contract):

```text
task_id, objective, inputs, outputs, dependencies,
required_capabilities, preferred_agent_role,
definition_of_done[], risk, requirement_ids[],
file_scope / ownership, budget_slice
```

**Dependencies:** `A → B` means B cannot start until A's required outputs exist **and** are validated (not merely “A claimed done”).

**Parallelism:** allowed when DAG permits; still subject to B01 concurrency, A03, **file ownership**, and workspace conflicts. `max_parallel` alone is insufficient.

---

## File Ownership & Workspace Locking (design boundary)

Future need (not implemented):

```text
workspace revision
file / directory ownership per active task
lock or exclusive lease on write scopes
conflict = explicit FAIL, not last-writer-wins
```

Stale context: after peer mutations, refresh via revision/hash before critical writes (extend AgentContextAssembler conceptually).

---

## Delegation

```text
Supervisor → DelegationRequest → child AgentExecutor turn → DelegationResult
```

Fields (conceptual): `parent_task`, `child_task`, `agent_id`, `role`, `scope`, `budget`, `deadline`, `required_outputs`, `delegation_depth`.

- Role does **not** grant permissions.  
- Authority = task scope ∪ workspace authority ∪ policy ∪ capabilities.  
- Track `task_owner`, `delegated_from`, `delegation_depth` for accountability/recovery.

**Supervisor:** proposes next work / interprets results / requests replan. **Never** executes capabilities, bypasses policy, raises budgets, or declares completion without Validation.

---

## Implementation

**Implementation Agent** (roles: `backend`, `frontend-pro`, `database`, …):

```text
task → inspect scoped workspace (knowledge + reads)
    → propose file/capability actions
    → Runtime A03/B01 executes capabilities
    → tests (capability)
    → structured ImplementationResult
```

Agent verbal “success” ≠ `TASK_COMPLETED`. Runtime requires: code state + tests + DoD + evidence.

**Code change evidence** (provider/runtime produced): files changed, diff summary, commands, test results, artifacts — not “model said it edited X”.

Generated code execution path:

```text
proposal → authorized workspace → policy (A03) → budget (B01)
  → [future sandbox] → execute → capture result/evidence
```

Never: `LLM → arbitrary shell`.

Migrations / schema changes = high-risk side effects (dedicated DoD + confirmation/policy), not “just another file”.

---

## Testing

**Testing Agent** (reuse `testing` skill as role): inspect, propose tests, interpret failures, propose fixes. **Commands remain Runtime capabilities.**

TestResult (conceptual): `test_command`, `exit_code`, `duration`, stdout/stderr summary, pass/fail counts, artifacts.

**Testing ≠ Validation:** green suite does not prove requirements coverage, security, or architecture fit.

---

## Validation

**Validation Agent** (independent of Implementation):

Evaluates requirements ↔ implementation ↔ tests ↔ architecture ↔ evidence.  
Cannot be satisfied solely by Implementation Agent self-check.

Gate outputs: pass / `UNVERIFIED REQUIREMENT` / fail with codes.

---

## Repair vs Replan

| Mode | Meaning | Seam |
|------|---------|------|
| **Repair** | Change implementation within same task/plan | Same IR node / local edit loop; count under B01 retries |
| **Replan** | Change strategy/plan/graph | **A04** `Replanner` → validateExecutableIR → A03 → B01 |

Examples: test failure → repair; architecture contradiction → replan (possibly escalate to project-level replan).

**No parallel RepairBudget** — use B01 (`max` retries / iterations / feature time). Policy may expose `max_repair_attempts` as an alias over existing counters.

### Failure classification (future)

`CODE_BUG` | `TEST_BUG` | `ENVIRONMENT_FAILURE` | `DEPENDENCY_FAILURE` | `ARCHITECTURE_ERROR` | `REQUIREMENT_ERROR` | `POLICY_BLOCKED` | `RESOURCE_EXHAUSTED` | `UNKNOWN`

`UNKNOWN` → bounded: diagnose / retry / human / stop — **not** `REPLAN_ANYWAY`.

Map to: repair | retry | fallback | replan | human | stop (reuse A04 dispositions).

**Debugger** skill = reusable role for diagnose/repair proposals, not a second runtime.

---

## Replanning Hierarchy

```text
task repair
 → task replan (A04)
 → milestone replan
 → project replan
```

Escalate only when failure class / policy says so.

---

## Delivery

`DELIVERY_COMPLETE` ≠ “agents stopped”. It means:

```text
requirements satisfied (coverage matrix)
tests + required validation passed
evidence complete
artifacts persisted
workspace consistent
```

Delivery artifact bag: repository state, test report, ArchitectureSpec, requirements matrix, evidence index, known limitations, change summary.

---

## Quality Gates (reuse A03)

| Stage gate | Severity default |
|------------|------------------|
| Requirements | RISK_BASED_CONFIRM if critical ambiguity |
| Architecture | AUTO after schema/policy; HUMAN if novel stack |
| Planning / Task Graph | AUTO if IR validates |
| Implementation | AUTO per task DoD |
| Testing | AUTO |
| Validation | AUTO / RISK_BASED on coverage gaps |
| Delivery | RISK_BASED / HUMAN for deploy |
| Deploy / publish | HUMAN_REQUIRED until production gate exists |

Severity: `AUTO` | `RISK_BASED_CONFIRM` | `HUMAN_REQUIRED`. Not everything is HITL.

---

## Knowledge / Context

- Use **KnowledgeBackend** only (no second RAG).  
- Levels: global → project → task → execution evidence (≠ Memory).  
- Implementation context = task-scoped, workspace-scoped, evidence-scoped — **not** whole repo by default.  
- Context refresh on workspace revision change.

---

## Git (future capabilities)

Governed: `diff`, `status`, `branch`, `commit`, constrained rollback.  
No default arbitrary history rewrite (`force push`, rebase destroy).  

Commit concepts: task / milestone / validation / delivery — **complement** B04; never replace execution checkpoints.

---

## Recovery

Extend B04 conceptually:

```text
crash → project recovery → active milestone → active task
     → agent invocation identity → continue AT_LEAST_ONCE-safe
```

Git commit ≠ EngineCheckpoint.

---

## Budget & Policy Hierarchy (conceptual)

```text
B01: Project → Milestone → Task → Agent invocation → Provider
Policy: global mandatory ≥ project ≥ task ≥ role constraints
```

Lower levels **cannot** relax global mandatory restrictions. Agents cannot self-escalate policy/budget/permissions/gates.

---

## Evidence & Telemetry Hierarchy

Evidence: decision → execution → test → validation → delivery (correlated by `decision_id` / `execution_id` / `task_id` / `requirement_id`).

Telemetry (EventBus): project → task → agent → invocation → capability → provider.

---

## Security (summary)

Threats: malicious PRD, prompt/repo injection, supply chain, scope escalation, credential leak, workspace escape, fake validation, test bypass, runaway exec, git destruction, deploy abuse.

- Dependency install / `npm build` / test / package / deploy = **governed capabilities** with rising risk.  
- Network/timeout/workspace for builds and tests.  
- Self-modification of EvolveLoop = **separate evolution workflow**, not SE factory.

See `V2-SOFTWARE-ENGINEERING-THREAT-MODEL.md`.

---

## CRM Benchmark (future)

**Input only:** PRD + constraints + workspace + policy (no step-by-step implementation script).

**Target product:** CRM MVP — auth, users, companies, contacts, pipeline, deals, tasks, dashboard, REST API, DB, frontend, tests, docs.

**Success metrics (separate, not one score):** requirements coverage, architecture coherence, task graph validity, implementation correctness, test/integration quality, repair/replan quality, policy compliance, evidence completeness, delivery correctness — not merely “build succeeds”.

---

## Live Eval Baseline (do not reinterpret)

| Area | Status |
|------|--------|
| Planning | INCONCLUSIVE |
| Capability Selection | INCONCLUSIVE |
| Replanning | PASS |
| Grounding | PARTIAL |
| Policy Adversarial | PASS |
| Current live model | Ollama (tested ≠ default) |
| Default provider | UNDECIDED |

Promotion ladder (future, manual): `EXPERIMENTAL` → `EVAL_ONLY` → `CONTROLLED` → `AUTONOMOUS`. No auto-promotion.

---

## Deployment Posture

```text
BUILD → TEST → VALIDATE → PACKAGE → DEPLOY
```

Rising risk; production deploy remains human/risk-gated until a formal production gate exists.

---

## Roadmap

| ID | Milestone | Why order |
|----|-----------|-----------|
| **SE-01** | Requirements Contract | Traceability root; without it no coverage/validation |
| SE-02 | Architecture Contract | Needs requirements IDs |
| SE-03 | Task Graph / Decomposition | Needs ArchitectureSpec + IR metadata |
| SE-04 | Supervisor + Delegation | Needs tasks |
| SE-05 | Implementation Agent | Needs scoped tasks + authority |
| SE-06 | Testing / Repair Loop | Needs implementation + A04 mapping |
| SE-07 | Project Validation | Needs evidence + coverage |
| SE-08 | Delivery | Needs validation |
| SE-09 | CRM Benchmark | Proves full loop |

### Next implementation target: **SE-01 Requirements Contract**

**Why not jump to “agent edits code”:** without requirement identity, DoD, workspace scope, and validation hooks, code mutation is ungoverned and unmeasurable. SE-01 establishes the spine for every later stage.

---

## Remaining Questions

1. Exact metadata schema on CapabilityIR nodes for engineering tasks (extend vs thin wrapper type).  
2. File-lock mechanism (lease vs VCS branch-per-task).  
3. When SAFE_ASSUMPTION becomes HUMAN_REQUIRED by risk tier.  
4. Criteria set for default ReasoningProvider (still UNDECIDED).  
5. Sandbox timeline relative to SE-05 (process isolation still NOT IMPLEMENTED).

---

## Final Review Checklist

- [x] Software Factory above Runtime  
- [x] Agent ≠ Runtime; Supervisor ≠ second Orchestrator  
- [x] Implementation is capability-mediated  
- [x] Validation independent of Implementation  
- [x] Repair ≠ Replan; Project ≠ Task ≠ Agent  
- [x] Role ≠ authority  
- [x] Requirements traceable; Architecture structured; Task Graph = CapabilityGraph (+ metadata)  
- [x] A03 / B01 / B04 preserved  
- [x] Evidence ≠ claims; Knowledge ≠ Memory  
- [x] Self-evolution separate  
- [x] Security + CRM designed  
- [x] No implementation / main untouched  
