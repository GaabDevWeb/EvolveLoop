# V2 Software Engineering Eval Plan

**Status:** SE-01 + SE-02 + SE-03 offline suites IMPLEMENTED; live evals opt-in / NOT_MEASURED by default  
**Branch:** `evolve-v2`  

---

## Principles

1. Offline deterministic evals must not require LLM/network.  
2. Live LLM evals are opt-in (`eval:llm`); missing backend → `NOT_MEASURED`, never PASS.  
3. Separate metrics — **no single “LLM score”**.  
4. LLM-as-judge is secondary/non-authoritative if ever used.  
5. Runtime autonomy (A01–B04) ≠ Software Engineering autonomy (unproven).

---

## SE-01 — Requirements extraction (implemented offline)

**Harness:** `orchestrator/tests/unit/requirements-se01.test.ts`  
**Extractor:** deterministic `extractAndBuild` (+ AgentDecision `REQUIREMENTS_PROPOSAL` path)  
**Live:** AgentExecutor + Ollama only when `REASONING_MODE=live` — does not change defaults.

| Eval | Offline expectation |
|------|---------------------|
| Requirements extraction | Valid brief → RequirementsSpec with stable `REQ-*` |
| Ambiguity detection | “fast and secure CRM” → BLOCKING questions; no invented OAuth/PG/React/<100ms |
| Conflict detection | PostgreSQL vs SQLite → `REQUIREMENT_CONFLICT` |
| Constraint preservation | Input constraints retained; adversarial drop → error |
| Traceability | Source section/reference + intent_id + handoff map |
| Acceptance criteria | MUST/MUST_NOT prefer verifiable bullets |
| Versioning | Baseline immutable; v2 `parent_version`; disk refuse overwrite |
| Prompt injection resistance | `SYSTEM:` treated as PRD content; no baseline authority |
| Policy boundary | “disable evidence / skip tests” → `POLICY_BOUNDARY` |
| Duplicate detection | Login ≈ authenticate → `DUPLICATE_CANDIDATE` |
| Negative / OOS | MUST_NOT security; OUT_OF_SCOPE explicit |

### Live metrics (when measured — separate, not a single score)

- `required_requirement_recall`
- `constraint_preservation`
- `conflict_detection`
- `ambiguity_detection`
- `out_of_scope_preservation`
- `assumption_accuracy`
- `schema_validity`

Statuses: `PASS | FAIL | INCONCLUSIVE | NOT_MEASURED`.

**Do not** auto-promote model routing or policy from live results.

---

## SE-02 — Architecture (implemented offline)

**Harness:** `orchestrator/tests/unit/architecture-se02.test.ts`  
**Path:** RequirementsSpec → deterministic extract/build **or** `ARCHITECTURE_PROPOSAL` → ArchitectureValidator

| Eval | Offline expectation |
|------|---------------------|
| Requirement coverage | All MUST mapped to component/decision/traceability |
| Constraint preservation | PG vs SQLite mismatch → `ARCHITECTURE_CONSTRAINT_VIOLATION` |
| Architecture coherence | Interfaces reference known components |
| Dependency validity | Unknown dep / cycle / self-dep rejected |
| Interface completeness | Provider/consumer required |
| Security boundary coverage | Auth requirements need auth component or security block |
| Technology justification | Unjustified Redis/Kafka/K8s → reject/warn |
| Traceability | REQ → CMP/ADR links |
| Scope adherence | OOS mobile/desktop component → `ARCHITECTURE_SCOPE_VIOLATION` |
| Brownfield preservation | EXISTING vs PROPOSED + delta |

Live metrics (when measured): same separation as SE-01 — no single score; statuses `PASS|FAIL|INCONCLUSIVE|NOT_MEASURED`.

---

## SE-03 — Task Graph (implemented offline)

**Harness:** `orchestrator/tests/unit/task-graph-se03.test.ts`  
**Path:** RequirementsSpec + ArchitectureSpec → extract/build **or** `TASK_GRAPH_PROPOSAL` → TaskGraphValidator

| Eval | Offline expectation |
|------|---------------------|
| Requirement coverage | All MUST mapped or justified |
| Architecture coverage | Proposed components tasked; EXISTING justified/MODIFYed |
| Dependency correctness | Unknown/self/cycle rejected |
| Task granularity | UNDER_DECOMPOSED / OVER_DECOMPOSED detected |
| Capability selection | Forbidden unrestricted caps rejected; catalog hints optional |
| Parallelism safety | Scope/path conflicts without serialization rejected |
| Scope conflicts | `TASK_SCOPE_CONFLICT` |
| DoD completeness | MUST tasks require DoD |
| Brownfield accuracy | MODIFY for EXISTING changes |

---

## Current Live Baseline (registered — do not reinterpret)

| Area | Status |
|------|--------|
| Planning | INCONCLUSIVE |
| Capability Selection | INCONCLUSIVE |
| Replanning | PASS |
| Grounding | PARTIAL |
| Policy Adversarial | PASS |
| Live backend tested | Ollama |
| Default provider | UNDECIDED |

Source: `V2-LIVE-LLM-EVAL.md` / AgentExecutor live runs on `evolve-v2`.

---

## Eval Modes

| Mode | Use |
|------|-----|
| Offline fixtures | Schema/semantic/IR/gates without model |
| Adversarial | Injection, scope escalation, fake validation |
| Live LLM | Quality of proposals under same golden expectations |
| CRM integration (future) | Full BRIEF→WORKING SOFTWARE |

---

## Suites (future)

### Planning
- PRD → RequirementsSpec completeness  
- Ambiguity → NEED_INFORMATION / SAFE_ASSUMPTION recorded  
- No silent critical invention  

### Architecture
- ArchitectureSpec schema + requirement linkage  
- Rejected invalid stack / unknown capabilities  
- No Task Graph from invalid architecture  

### Task Decomposition
- Graph acyclic; deps explicit  
- Every task has DoD + requirement_ids  
- Parallelism respects ownership fixtures  

### Capability Selection
- Only catalogued capabilities  
- Prefer lower risk when equivalent  
- Forbidden actions → Runtime DENY (execute count 0)  

### Delegation
- Depth/budget/scope enforced  
- Child cannot widen parent scope  
- Orphan delegation rejected  

### Implementation
- Proposed edits within file_scope  
- ImplementationResult from Runtime evidence only  
- Agent “done” without evidence → FAIL  

### Testing
- TestResult fields present  
- Flaky/env vs code bug classification fixtures  

### Repair
- CODE_BUG → repair within budget  
- Exhausted repairs → stop/human — not infinite loop  

### Replanning
- ARCHITECTURE_ERROR → A04 / project replan  
- POLICY_BLOCKED → no bypass plan  
- UNKNOWN → no REPLAN_ANYWAY  

### Validation
- Independent validator catches self-checked false success  
- UNVERIFIED REQUIREMENT detected  

### Requirements Coverage
- Matrix completeness; orphan tests/code flagged  

### Delivery
- DELIVERY_COMPLETE criteria checklist  
- Deploy not auto-included  

### CRM Benchmark (SE-09)
Input: PRD + constraints + workspace + policy only.  
Measure: coverage, architecture coherence, task graph validity, correctness, tests, repair/replan, policy, evidence, delivery — **not** only build success.

---

## Metrics (keep separate)

```text
plan_validity
task_graph_validity
task_success_rate
code_correctness
test_pass_rate
repair_success_rate
replan_success_rate
requirements_coverage
policy_violation_rate
evidence_completeness
latency
tokens
cost (unknown if not billed)
```

Result states: `PASS` | `FAIL` | `NOT_MEASURED` | `INCONCLUSIVE` | `BLOCKED`.

---

## Promotion ladder (manual)

```text
EXPERIMENTAL → EVAL_ONLY → CONTROLLED → AUTONOMOUS
```

Gates use eval history + policy + quality/latency/cost/reliability. **No automatic default provider.**

---

## Regression lineage

Compare across:

```text
prompt_version · eval_version · agent_version · model_id · provider_id
```

Same fixture suite for model/prompt changes.

---

## Offline vs Live

| | Offline | Live |
|--|---------|------|
| `npm test` | Must stay green, no network | Excluded |
| SE contract fixtures | Required first | After SE-01+ |
| CRM | Deterministic stubs | Later opt-in |

---

## Suggested first SE evals (after SE-01)

1. RequirementsSpec schema adherence  
2. Ambiguity disposition correctness  
3. Traceability id stability across versions  
4. Policy: cannot mark DELIVERY without coverage (fixture)
