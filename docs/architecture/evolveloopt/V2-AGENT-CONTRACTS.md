# V2 Agent Contracts

**Status:** IMPLEMENTED (deterministic; live LLM adapters deferred)  
**Branch:** `evolve-v2`  
**Canonical existing seams:** `Replanner`, `StructuredIntent`/`PlanEmitter`, `ExecuteRequest`/`ExecuteResult`, EventBus, Evidence  
**Code:** `orchestrator/src/agent/` — see also `V2-AGENTEXECUTOR-STATUS.md`  

---

## Design rule

Agent contracts produce **proposals and decisions**.  
Runtime contracts produce **authorization, execution, and evidence**.

`AgentDecision ≠ ExecutionResult`  
`ReasoningProvider ≠ Capability Provider`  
`AgentExecutor ≠ ExecutionEngine`

---

## Implemented types (TypeScript)

| Contract | Location | Notes |
|----------|----------|-------|
| `AgentExecutionRequest` | `agent/types.ts` | Least-privilege; no secrets |
| `AgentExecutionResult` | `agent/types.ts` | Reasoning outcome ≠ `ExecuteResult` |
| `AgentDecision` | `agent/types.ts` | Discriminated union by `decision_type` |
| `ReasoningProvider` | `agent/types.ts` | `invoke(ReasoningRequest) → ReasoningResponse` |
| `AgentExecutor` | `agent/agent-executor.ts` | `DefaultAgentExecutor` |
| `TestReasoningProvider` | `agent/test-reasoning-provider.ts` | Deterministic fixtures |
| `AgentBackedReplanner` | `agent/agent-backed-replanner.ts` | Implements `Replanner` |
| `LLMReplanner` | stub extends AgentBackedReplanner | Structure only; no SDK |

### Decision types

`PLAN_PROPOSAL` | `ACTION_PROPOSAL` | `REPLAN_PROPOSAL` | `NEED_INFORMATION` | `NEED_CONFIRMATION` | `FINAL_RESPONSE` | `DELEGATION_PROPOSAL` | `AGENT_UNABLE` | `FAILURE`

### Reasoning error codes

`REASONING_PROVIDER_UNAVAILABLE` | `REASONING_TIMEOUT` | `REASONING_MALFORMED_OUTPUT` | `REASONING_SCHEMA_ERROR` | `REASONING_CONTEXT_TOO_LARGE` | `REASONING_REFUSED` | `REASONING_SEMANTIC_ERROR` | `AGENT_EXECUTOR_UNAVAILABLE`

### Telemetry

`AgentInvocationStarted` | `AgentDecisionProduced` | `AgentInvocationFailed` (EventSource: `agent`)

### Open

- **Default ReasoningProvider:** UNDECIDED  
- **Model router:** not implemented  

---

## AgentExecutionRequest

| Aspect | Definition |
|--------|------------|
| **Purpose** | Least-privilege context for one agent reasoning turn |
| **Inputs** | See fields below |
| **Outputs** | Consumed only by AgentExecutor |
| **Authority** | None — read-only projection of runtime state |
| **Side effects** | None |
| **Failure modes** | Assembler refusal (forbidden fields), budget exceeded for context size |
| **Persistence** | Optional: store request_id + hashes of context refs (not full secrets) |
| **Telemetry** | `AgentInvocationStarted` with request_id, agent_id, execution_id |

### Fields (conceptual)

**Minimum required**

- `request_id`, `execution_id`, `task_id` (or node_id), `attempt`
- `agent_id`, `agent_version`, `role`
- `objective` (task-scoped)
- `decision_mode`: `PLAN | REPLAN | DELEGATE | ANSWER | REPAIR`
- `policy_summary` (id, version, fail_fast, max_replans, risk flags — not full YAML)
- `workspace_authority_summary` (roots allowed, write/shell/network booleans — not secrets)
- `resource_budget_summary` (remaining iterations/replans/tokens/time if known)
- `failure_context` when mode=REPLAN (class, code, failed capability — not full stack dumps)

**Optional**

- `current_plan_summary` / sanitized node list
- `relevant_evidence_refs[]`, `relevant_knowledge_refs[]`
- `available_capabilities[]` (metadata projection)
- `available_provider_metadata[]` (id, cost tier, availability — not credentials)
- `previous_decision_ids[]`
- `schema_id` for expected output

**Forbidden**

- API keys, env secrets, DB passwords, git tokens
- Raw policy implementation internals beyond summary
- Other users’/tenants’ data
- Unrelated workspace trees
- Full telemetry JSONL / entire event history by default

### Context classes

| Class | Examples |
|-------|----------|
| PUBLIC_TO_AGENT | objective, role, capability schemas, failure class |
| CONDITIONAL | ranked knowledge, evidence refs, prior decisions |
| RUNTIME_ONLY | full policy AST, other executions, internal locks |
| SECRET / FORBIDDEN | credentials, private keys, injection-prone unvetted blobs without marking as DATA |

---

## AgentExecutionResult

| Aspect | Definition |
|--------|------------|
| **Purpose** | Structured outcome of one reasoning invocation |
| **Inputs** | Produced by AgentExecutor after provider + validation |
| **Outputs** | To runtime consumers (planner path, replanner, HITL) |
| **Authority** | None — never grants ALLOW |
| **Side effects** | None on workspace |
| **Failure modes** | See Agent failure codes |
| **Persistence** | decision_id + type + refs; not chain-of-thought |
| **Telemetry** | `AgentDecisionProduced` / `AgentInvocationFailed` |

### Decision categories

```text
PLAN
ACTION_PROPOSAL
REPLAN_PROPOSAL
NEED_INFORMATION
NEED_CONFIRMATION
FINAL_RESPONSE
DELEGATION_PROPOSAL
FAILURE
```

### Success-shaped payload (conceptual)

- `decision_type`
- `reason`
- `proposed_plan` (semantic / StructuredIntent-like — **not** raw executable IR unless explicitly a Replan path that emits CapabilityGraph)
- `proposed_actions[]` (capability id + inputs — proposals only)
- `references[]` (knowledge/evidence ids)
- `confidence` optional signal only — **never authorization**
- `usage` tokens/latency from ReasoningProvider
- `model` / `provider` / `prompt_version` / `schema_version`

### Failure-shaped payload

`AGENT_UNABLE | AGENT_REFUSED | AGENT_TIMEOUT | AGENT_MALFORMED_OUTPUT | AGENT_PROVIDER_FAILURE | AGENT_ATTEMPT_INTERRUPTED | AGENT_EXECUTOR_UNAVAILABLE`

---

## AgentDecision

| Aspect | Definition |
|--------|------------|
| **Purpose** | Normalized, schema-validated decision record (post-parse) |
| **Inputs** | AgentExecutionResult after syntactic + semantic checks |
| **Outputs** | Fed to PlanEmitter / Replanner apply path / approval request |
| **Authority** | None until Runtime accepts |
| **Side effects** | None until Runtime maps to IR/actions |
| **Failure modes** | Semantic invalid (unknown capability, bad inputs) → reject |
| **Persistence** | `decision_id`, execution_id, agent_id/version, type, proposals, refs |
| **Telemetry** | Linked to Gate/Policy events that follow |

**AgentDecision ≠ ExecutionResult:** ExecutionResult is produced only by Capability Providers after runtime authorization.

---

## AgentExecutor

| Aspect | Definition |
|--------|------------|
| **Purpose** | Invoke ReasoningProvider; parse; schema-validate; return AgentExecutionResult |
| **Inputs** | AgentExecutionRequest |
| **Outputs** | AgentExecutionResult |
| **Authority** | None |
| **Side effects** | Telemetry only (via runtime hooks) |
| **Failure modes** | Provider errors mapped to structured codes; never throw vendor-specific types across engine boundary |
| **Persistence** | attempt identity: execution_id + task_id + attempt + request_id |
| **Telemetry** | Started / Produced / Failed |

Conceptual interface:

```text
AgentExecutor.execute(request) → AgentExecutionResult
```

Future adapters: `TestAgentExecutor`, `OllamaAgentExecutor`, `CursorAgentExecutor`, `OpenAIAgentExecutor`, `AnthropicAgentExecutor`, `LocalAgentExecutor`.

---

## ReasoningProvider

| Aspect | Definition |
|--------|------------|
| **Purpose** | Model invocation adapter |
| **Inputs** | Prompt/template version, messages, output schema, model config |
| **Outputs** | Raw or structured text, usage, model id, errors |
| **Authority** | None |
| **Side effects** | Network to model host only (not workspace) |
| **Failure modes** | timeout, rate_limit, context_overflow, empty, refusal, unavailable, malformed |
| **Persistence** | usage → B01 accounting; model metadata for evals |
| **Telemetry** | latency, tokens, provider id |

Must not call Capability Providers or mutate checkpoint/graph.

---

## Replanner (existing — extended by LLM)

| Aspect | Definition |
|--------|------------|
| **Purpose** | Produce candidate CapabilityIR after classified failure |
| **Inputs** | Existing `ReplanInput` (+ optional agent decision refs later) |
| **Outputs** | Existing `ReplanResult` |
| **Authority** | None — engine validates/applies |
| **Side effects** | None |
| **Failure modes** | REJECTED / UNAVAILABLE |
| **Persistence** | via engine checkpoint on apply |
| **Telemetry** | ReplanRequested/Proposed/Rejected/Applied |

`LLMReplanner` = implementation that calls AgentExecutor then maps to CapabilityIR (or StructuredIntent → PlanEmitter). Still subject to `validateExecutableIR`, A03, B01.

`DeterministicReplanner` / `HumanReplanner` remain valid.

---

## ContextAssembler

| Aspect | Definition |
|--------|------------|
| **Purpose** | Build AgentExecutionRequest under least privilege + context budgets |
| **Inputs** | execution slice, policy snapshot summaries, knowledge hits, evidence index |
| **Outputs** | AgentExecutionRequest |
| **Authority** | Enforces FORBIDDEN/SECRET redaction |
| **Side effects** | May record retrieval counts for budget |
| **Failure modes** | ContextBudgetExceeded, GroundingRequiredAbsent |
| **Persistence** | context package hash for reproducibility |
| **Telemetry** | retrieval count, token estimate |

Not a second KnowledgeBackend — orchestrates existing stores.

---

## DelegationRequest / DelegationResult

| Aspect | DelegationRequest | DelegationResult |
|--------|-------------------|------------------|
| **Purpose** | Agent proposes handoff of task T to agent B | Runtime acceptance outcome |
| **Inputs** | task_id, target_agent_id, reason, constraints | — |
| **Outputs** | — | ACCEPTED / REJECTED / DEFERRED |
| **Authority** | Proposal only | Runtime+policy |
| **Side effects** | None until accept | May spawn child task under budget/depth limits |
| **Failure modes** | Unknown agent, depth exceeded, loop, budget | — |
| **Persistence** | lineage edges | child execution_id |
| **Telemetry** | DelegationRequested/Accepted/Rejected | same |

---

## Approval (future object)

Needed for RISK_BASED_CONFIRM / HUMAN_REQUIRED:

```text
approval_id, execution_id, action_digest, risk, reason,
requested_at, expires_at, decision, invalidated_by_plan_change?
```

Replan / plan_hash change → revalidation (extends A03 confirmation binding).

---

## Normalization

`AgentOutputNormalizer`: maps vendor-specific LLM payloads → AgentDecision schema so provider differences do not leak into ExecutionEngine.

Validation pipeline:

```text
LLM response → parse → schema (syntactic) → semantic (capability/inputs) → runtime policy/authority → accept|reject
```

---

## Model routing / fallback (boundary only)

- Routing chooses ReasoningProvider/model class (cheap/reasoning/coding/vision).  
- Does not alter CapabilityAuthority or budgets except consuming token budget.  
- Reasoning fallback ≠ Capability provider fallback (B01).

---

## Completion semantics

```text
Agent FINAL_RESPONSE / DONE
  → Runtime DoD + evidence + policy
  → TASK_COMPLETED | reject
```

---

## Reproducibility fields (decision trace)

Prefer structured decision trace over chain-of-thought:

`model`, `provider`, `prompt_version`, `schema_version`, `context_ref_hashes`, `knowledge_refs`, `policy_snapshot_id`, `capabilities_offered`, `config` (temperature etc.).

---

## Versioning

`agent_id` + `agent_version` + `prompt_version` + capability contract version must be attributable on each AgentDecision.
