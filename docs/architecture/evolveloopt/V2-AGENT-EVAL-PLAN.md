# V2 Agent Eval Plan

**Status:** DETERMINISTIC EVALS ACTIVE (live LLM still deferred)  
**Branch:** `evolve-v2`  

---

## Principles

1. Offline deterministic evals must not require API keys.  
2. Missing backend → `NOT_MEASURED` / `AGENT_EXECUTOR_UNAVAILABLE` — never PASS.  
3. Validate schema/semantics/policy/task correctness — not string equality of model prose.  
4. Separate **Runtime autonomy** (already proven A01–B04) from **Agent autonomy** (deterministic contracts proven; live LLM unproven).

## Eval modes

| Mode | When | Outcomes |
|------|------|----------|
| Offline deterministic | Fixtures + TestReasoningProvider / DefaultAgentExecutor | PASS/FAIL |
| Adversarial / security | Injection / leakage fixtures | PASS/FAIL |
| Live LLM | Optional CI with keys | PASS/FAIL/INCONCLUSIVE/NOT_MEASURED |

---

## Deterministic suite (first results — 2026-09-20)

Implemented in `tests/integration/agent-executor.test.ts`:

| Eval | Result |
|------|--------|
| Schema adherence | PASS |
| Decision normalization | PASS |
| Policy boundary (proposal ≠ execute) | PASS |
| Plan generation → PlanEmitter → IR | PASS |
| Replan generation (AgentBackedReplanner) | PASS |
| Failure handling (unavailable / timeout / malformed) | PASS |
| Context safety / leakage | PASS |
| A03 + AgentExecutor deny path | PASS |
| B01 usage accounting seam | PASS |
| B04 decision identity | PASS |
| Deterministic e2e (plan → engine) | PASS |
| Replan e2e (A → fail → B) | PASS |
| Architecture: no Engine→ReasoningProvider | PASS |

**Default provider / live LLM evals:** NOT_MEASURED (UNDECIDED provider; no SDK).

---

## Benchmark suites (future)

### Intent Understanding

- Brief → StructuredIntent fields complete  
- Ambiguous brief → NEED_INFORMATION (not hallucinated plan)

### Planning

- Intent → PlanEmitter-ready proposal  
- Invalid cycles/unknown capabilities rejected before execute

### Capability Selection

- Chooses existing capability ids only  
- Prefers lower-risk when equivalent

### Provider Selection

- Soft preferences only; engine selection still authoritative  
- Must not invent provider ids

### Tool / Action Use

- ACTION_PROPOSAL schemas valid  
- Unknown action → FAIL (fail-closed)

### Replanning

- Given failure fixture → candidate IR passes validateExecutableIR  
- Policy-blocked failures must not produce bypass plans  
- Compare DeterministicReplanner vs LLMReplanner on same fixtures

### Recovery

- AGENT_ATTEMPT_INTERRUPTED → safe retry with attempt id  
- AT_LEAST_ONCE duplicate decision handled without double side effects (idempotent proposals)

### Grounding

- Required grounding absent → DENY/DEFER  
- Citations present when knowledge used

### Policy Compliance

- Proposals that need write/shell without flags → CONFIRM/DENY path  
- Agent cannot raise budgets or skip gates

### Evidence Quality

- Agent DONE without DoD → not TASK_COMPLETED  
- Fake evidence refs rejected

### Task Completion

- End-to-end fixture with TestAgentExecutor (no live LLM)

### Software Engineering / CRM Benchmark

**Input:** CRM MVP PRD  

**Expected repository capabilities (conceptual):**

- authentication, users, companies, contacts  
- pipeline, deals, tasks, dashboard  
- REST API, database, frontend  
- tests, documentation, security checks, evidence pack  

**Must exercise:** planning, delegation, parallel nodes, failure recovery, replan, validation, evidence.

**Disqualifiers (unless HUMAN_REQUIRED by policy):**

- human chooses next task  
- human writes replacement IR  
- human bypasses gates  
- human manually resumes as the only recovery path  

**Status today:** DESIGNED / NOT_RUN

---

## Metrics (future)

- Plan validity rate  
- Gate denial rate on agent proposals (should be >0 on adversarial)  
- Replan success without policy bypass  
- Token/cost per successful task  
- Delegation depth distribution  
- Live: task success, human interventions, time-to-delivery  

## Reproducibility package

Record: model, provider, prompt_version, schema_version, context hashes, policy snapshot id, agent_version.

## Phased rollout

1. TestAgentExecutor offline suite  
2. Adversarial injection suite  
3. LLMReplanner offline with recorded fixtures  
4. Optional live smoke (local Ollama preferred)  
5. CRM benchmark gate for “bounded autonomous engineering”
