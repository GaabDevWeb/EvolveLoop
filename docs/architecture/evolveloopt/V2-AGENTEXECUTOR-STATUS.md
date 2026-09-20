# V2 AgentExecutor Status

**Status:** IMPLEMENTED (deterministic contract — no live LLM)  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  

---

## Implemented

- `AgentExecutionRequest` / `AgentExecutionResult` / `AgentDecision`
- `ReasoningProvider` + `TestReasoningProvider`
- `DefaultAgentExecutor` (normalize → invoke → validate → result)
- Schema + semantic validation (`validateAgentDecisionPayload`)
- Sensitive context boundary (`assertNoForbiddenKeys` / redact)
- `AgentContextAssembler` (`assembleAgentExecutionRequest`)
- `applyAgentDecisionToPlan` → existing `PlanEmitter`
- `AgentBackedReplanner` / stub `LLMReplanner` → existing `Replanner`
- B01 accounting seam (`applyReasoningUsageToAccounting`)
- Telemetry: `AgentInvocationStarted` | `AgentDecisionProduced` | `AgentInvocationFailed`
- B04 persistable decision identity (`toPersistableDecisionMeta`)

Module: `orchestrator/src/agent/`

---

## Contract Boundary

```text
Agent / LLM
    proposes / reasons

AgentExecutor
    invokes ReasoningProvider
    normalizes → AgentDecision

Runtime
    validates / authorizes / executes / observes / persists

Capability Provider
    performs effect
```

- `AgentDecision ≠ ExecuteResult`
- `ReasoningProvider ≠ CapabilityProvider`
- `AgentExecutor` does **not** call `CapabilityAuthority.authorize()`
- Direct `tool_call` payloads are rejected (must be `ACTION_PROPOSAL`)

---

## Deterministic Provider

`TestReasoningProvider` scenarios:

| Scenario | Outcome |
|----------|---------|
| `valid_plan` | PLAN_PROPOSAL |
| `valid_replan` | REPLAN_PROPOSAL |
| `valid_action` | ACTION_PROPOSAL |
| `need_information` / `agent_unable` | non-executing decisions |
| `malformed` / `invalid_schema` | REASONING_MALFORMED_OUTPUT / SCHEMA_ERROR |
| `unknown_capability` | REASONING_SEMANTIC_ERROR |
| `tool_call_forbidden` | SCHEMA_ERROR |
| `provider_unavailable` / `timeout` / `refused` | structured failure |

No pseudo-LLM prose. No SDK. No secrets required.

---

## Validation

1. Parse payload (object required)
2. Schema (`decision_type`, required fields, no tool_call)
3. Semantic (known capabilities, intent shape via `validateStructuredIntent`)
4. **Not** policy allow — A03 remains Runtime

---

## Security Boundary

- Request/context forbid: `api_key`, `password`, `secret`, `credential`, `private_key`, `authorization`, access/auth/bearer tokens
- Value heuristic for `sk-` / `ghp_` / `xox*` prefixes
- Knowledge / skill / repo / user text → `context_authority: "none"` (data, not authority)
- Process sandbox: **NOT IMPLEMENTED** (unchanged)

---

## Runtime Integration

| Seam | Integration |
|------|-------------|
| Plan | `PLAN_PROPOSAL` → `PlanEmitter` / `emitPlan` |
| Replan | `AgentBackedReplanner` implements `Replanner` |
| Gates | Proposal only; `evaluatePreExecute` / engine path |
| Budget | Usage → existing accounting counters (no parallel AgentBudget) |
| Checkpoint | Persist `decision_id` + metadata; **no** model CoT |

---

## A03 Integration

Proven: Agent returns forbidden `ACTION_PROPOSAL` → Executor success → Runtime DENY → `MockProvider.executeCount = 0`.

---

## B01 Integration

Seam proven: usage recorded → budget exhausted → next `AgentExecutor.execute` refused (`REASONING_REFUSED`). No parallel budget type.

---

## A04 Integration

Proven e2e: provider A fails → `AgentBackedReplanner` → `REPLAN_PROPOSAL` → Plan V2 → A03/B01 → provider B success.

---

## B04 Compatibility

`PersistableDecisionMeta`: `decision_id`, `execution_id`, `task_id`, `attempt`, agent ids, optional `plan_id` / `replan_id` / `plan_version`. No internal model reasoning persisted.

---

## Tests

`tests/integration/agent-executor.test.ts` — unit + policy bypass + plan/replan e2e + architecture static check + context leakage + B01/B04.

Suite after this milestone: **527/527** (prior V2 baseline 505 + new AgentExecutor tests).

---

## Not Implemented

- Cursor / OpenAI / Anthropic / Ollama adapters
- Real LLM calls / model router
- Agent delegation / software factory / CRM benchmark
- Full prompt-injection defense system
- Process sandbox
- Default reasoning provider selection (**UNDECIDED**)

---

## Future Providers

Conceptual adapters (no core engine change):

```text
CursorReasoningProvider
OpenAIReasoningProvider
AnthropicReasoningProvider
OllamaReasoningProvider
```

Default provider: **UNDECIDED** until eval criteria exist.  
Next milestone: **REASONING PROVIDER ADAPTER + LIVE LLM EVAL**

---

## Fake Autonomy Check

| Question | Answer |
|----------|--------|
| Does AgentExecutor execute capabilities? | **NO** |
| Does Runtime execute approved decisions? | **YES** (e2e proven) |
