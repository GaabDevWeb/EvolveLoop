# V2 Agent Runtime Architecture

**Status:** DESIGNED (not implemented)  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Depends on (IMPLEMENTED):** A01, A02, A03, A04, B01, B04  

---

## Goals

1. Connect LLM/Agent **reasoning** to EvolveLoop **execution** without rewriting Runtime Core.
2. Preserve the proven boundary: Agent proposes → Runtime authorizes/executes → Provider effects → Evidence proves.
3. Allow `DeterministicReplanner | LLMReplanner | HumanReplanner` behind the existing `Replanner` interface.
4. Remain **local-first** and **provider-independent** (Cursor / OpenAI / Anthropic / Ollama as adapters only).
5. Make future software-engineering autonomy (PRD→CRM) evaluable without claiming it today.

## Non-Goals (this milestone)

- Implementing `AgentExecutor`, `ReasoningProvider`, or `LLMReplanner`.
- Installing SDKs / requiring API keys / binding a mandatory cloud model.
- Changing `ExecutionEngine`, A01–A04, B01, B04.
- Process sandbox, hard provider cancel, self-evolution promotion.
- Building the CRM product or multi-agent product loop.

## Existing Runtime

Verified roles (names ≠ trust; behavior from V2 docs + code contracts):

| Component | Role today | Authority |
|-----------|------------|-----------|
| StructuredIntent / PlanEmitter | Intent → CapabilityGraph | Deterministic emit; no LLM inside engine |
| CapabilityIR (CapabilityGraph) | Sole executable plan IR | Validated before run |
| ExecutionEngine | Owns loop, schedule, recover | **Runtime owner** |
| PolicyEngine + ExecutionBudget | Limits & recovery strategy | **Policy owner** |
| CapabilityAuthority + RuntimeGateContext | Pre-execute allow/deny/confirm | **Authorization owner** |
| RegistryClient | Provider selection | Constrained by strategy/policy |
| Capability / Deterministic / Skill providers | Side effects | **Effect owner** |
| Replanner (Deterministic) | Candidate IR on failure | Proposes; engine validates/applies |
| JobStore / Checkpoint v2 | Persistence, AT_LEAST_ONCE | Crash recovery |
| Evidence / EventBus / Metrics | Proof & observability | Not agent-owned |
| KnowledgeBackend / MemoryStore | Retrieval / feature memory | Separate from checkpoint |
| EvolveLoop (longitudinal) | Opt-in analysis | Ceiling PROPOSE; not execution authority |

```text
User / Agent (external)
        ↓
StructuredIntent
        ↓
PlanEmitter → CapabilityIR
        ↓
validateExecutableIR
        ↓
ExecutionEngine
   ├─ A03 evaluatePreExecute
   ├─ B01 budget / fail_fast / fallback
   ├─ Provider.execute
   ├─ Evidence / DoD
   ├─ A04 Replanner → new IR → A03+B01 again
   └─ B04 checkpoint
```

## Agent Boundary

**Central decision:**

> The Agent/LLM may decide *what to propose*.  
> The EvolveLoop Runtime decides *whether, when, how, under which limits, and with which authority* anything happens.

```text
AGENT          proposes / reasons / observes (via filtered context)
RUNTIME        authorizes / executes / observes / persists / stops
PROVIDER       performs effect
EVIDENCE       proves outcomes
EVALS          measure quality
```

**Forbidden for Agent/LLM (direct authority):** filesystem, shell, network, DB, final provider selection, policy override, checkpoint mutation, evidence trust assignment, budget mutation, authorization.

**Allowed:** propose plan/actions/replan, request information/confirmation, report inability, cite knowledge/evidence IDs.

## AgentExecutor

Bridge to a **reasoning backend** — not the Runtime.

```text
AgentExecutionRequest
        ↓
AgentExecutor.execute
        ↓
ReasoningProvider.invoke
        ↓
parse + schema validate
        ↓
AgentExecutionResult (structured decision)
        ↓
Runtime consumes (PlanEmitter / Replanner / HITL / reject)
```

Side effects of AgentExecutor: **none** on workspace/graph/policy (except emitting telemetry/decision evidence via runtime APIs if wired later).

Unavailable backend → `AGENT_EXECUTOR_UNAVAILABLE` (same honesty rule as A02 `EXECUTOR_UNAVAILABLE`).

## ReasoningProvider

Adapter for model invocation only:

- inputs: messages/template refs, schema, config (temperature, max tokens)
- outputs: raw/structured payload, usage (tokens), latency, model metadata, errors

Must **not**: touch filesystem, shell, policy, checkpoint, or CapabilityProvider APIs.

**ReasoningProvider ≠ CapabilityProvider** even if the same vendor hosts both.

## Replanner

Existing contract (`orchestrator/src/replan/types.ts`) stays canonical:

```text
Replanner.replan(ReplanInput) → REPLAN_PROPOSED | REJECTED | UNAVAILABLE
```

Future `LLMReplanner` implements that interface using AgentExecutor internally.

Flow (must never skip):

```text
failure → classify → policy allows replan?
  → LLMReplanner / DeterministicReplanner
  → candidate IR
  → validateExecutableIR
  → A03 gates
  → B01 budgets
  → ExecutionEngine apply/execute
```

## Context Assembly

Future `AgentContextAssembler` builds least-privilege `AgentExecutionRequest` from:

- PUBLIC_TO_AGENT: objective, role, sanitized plan summary, failure class, capability metadata (schemas/risk), budget **summary**, workspace authority **summary**
- CONDITIONAL: ranked knowledge hits, evidence refs, prior decision IDs
- RUNTIME_ONLY: raw policy YAML internals, other tenants, full event logs
- SECRET / FORBIDDEN: API keys, credentials, tokens, unrelated workspaces

No “dump entire runtime state into the prompt.”

## Knowledge

| Store | Purpose |
|-------|---------|
| KnowledgeBackend | Retrievable domain facts/contracts with provenance |
| MemoryStore | Feature/session contextual notes |
| Checkpoint | Execution recoverability |
| Evidence | Validated outcome artifacts |

Grounding required + absent → runtime DENY/DEFER (A03), not agent override.

Knowledge content is **DATA** (may contain injection) — never **INSTRUCTION** with policy authority.

## Memory

Do not conflate persistent user memory, execution checkpoint, and agent prompt context. Separate interfaces; agent sees only assembler-filtered slices.

## Delegation

Future multi-agent:

```text
Supervisor proposes: delegate T → Agent B
Runtime: exists? compatible? policy? budget? depth?
```

Bounds: `delegation_depth`, `delegation_budget`, task lineage, visited agents. Loops A→B→A rejected.

Agent ≠ Task: many tasks per agent; many agents per task over time.

## Policy

Unchanged owners: PolicyEngine, CapabilityAuthority, RuntimeGateContext.

LLM saying `"ALLOW"` or `"policy permits"` is **not** authorization.

Agent must not propose `modify_policy | disable_gate | increase_budget` on the same authority plane (self-evolution = separate governed workflow).

## Evidence

Agent may **reference** evidence IDs. Runtime classifies trusted/validated/untrusted/missing. Agent-generated claims ≠ ExecutionResult.

## Telemetry

Reuse EventBus. Minimum future events:

`AgentInvocationStarted|Failed`, `AgentDecisionProduced`, existing `Replan*`, `DelegationRequested|Accepted|Rejected`.

Authority events remain separate: `Gate*`, `AuthorizationDenied`, `PolicyDenied`.

## Checkpoints

Persist decision metadata + execution state when an agent turn matters for recovery. Never rely on LLM volatile memory. Crash mid-invocation → `AGENT_ATTEMPT_INTERRUPTED` (AT_LEAST_ONCE reinvoke possible; attempt identity required).

## Failure Handling

Structured agent failures (not raw SDK exceptions):

`AGENT_UNABLE | AGENT_REFUSED | AGENT_TIMEOUT | AGENT_MALFORMED_OUTPUT | AGENT_PROVIDER_FAILURE | AGENT_ATTEMPT_INTERRUPTED | AGENT_EXECUTOR_UNAVAILABLE`

Escalation order (runtime-owned): retry model → alternate ReasoningProvider → delegate → replan → HUMAN_REQUIRED → fail.

## Security

See `V2-AGENT-SECURITY-MODEL.md`. Highlights: prompt/knowledge/skill injection; tool hijacking; policy-as-data; secret non-leakage; no LLM-direct tools.

## Provider Independence

```text
AgentExecutor
    ↓
ReasoningProvider  (Cursor | OpenAI | Anthropic | Ollama | Test)
```

ExecutionEngine must not import vendor SDKs.

## Local-First Considerations

Ollama (or equivalent) must remain a first-class adapter path. Cloud-only capability → explicit `capability unavailable`, never silent mock success.

## Future Software Engineering Loop

```text
PRD → Architecture Agent → Task Graph → Implementation Agents
  → Tests → Validation → Repair → Delivery
```

All proposals still pass PlanEmitter / IR / A03 / B01. DESIGNED only.

## CRM Benchmark

See Eval Plan — CRM MVP as first closed-loop engineering benchmark (DESIGNED, not run).

## Alternative Architectures

| Option | Summary | Verdict |
|--------|---------|---------|
| A — LLM inside ExecutionEngine | Engine calls model directly | **Reject** — couples authority to vendor; untestable without keys |
| B — AgentExecutor outside Runtime | Agent proposes; runtime owns loop | **Accept** |
| C — Agent as CapabilityProvider | “agent.execute” as effect provider | **Reject as primary** — blurs reasoning vs effect; optional later as *capability* that only emits decisions if wrapped |
| D — Unified Agent+Runtime | Single agentic loop owns FS/tools | **Reject** — recreates LLM-direct-tools |

### Rejected patterns

- LLM-direct-tools / filesystem / shell  
- LLM-direct-provider execute  
- LLM-direct-policy  
- Second orchestrator / second IR / second policy engine  

## Architecture Diagram

```text
User
 ↓
Intent / Brief
 ↓
AgentExecutor ──────────────► ReasoningProvider (model only)
 ↓
AgentDecision (structured)
 ↓
PlanEmitter / LLMReplanner (as Replanner)
 ↓
Executable IR (CapabilityGraph)
 ↓
ExecutionEngine
 ├─ A03 Gates + Authority
 ├─ B01 Budgets
 ├─ Registry → Capability Provider (effect)
 ├─ Evidence / Telemetry
 ├─ B04 Checkpoint
 └─ on failure → Replanner → (may call AgentExecutor) → validate → A03 → B01
```

Authority boundary:

```text
AGENT proposes
RUNTIME authorizes + executes + persists
PROVIDER performs
```

## Agent Autonomy Levels (separate from Runtime autonomy)

| Level | Meaning |
|-------|---------|
| 0 | No agent |
| 1 | Reasoning only (offline) |
| 2 | Propose structured decisions |
| 3 | Runtime executes proposals under gates/budgets |
| 4 | Closed-loop agent turns owned by runtime |
| 5 | Bounded autonomous engineering (CRM-class) |

Runtime autonomy can be high (A01–B04) while Agent autonomy remains 0–2.

## Implementation Roadmap (future)

| Phase | Deliverable | Why this order |
|-------|-------------|----------------|
| 1 | `AgentExecutor` interface + TestAgentExecutor | Contract without vendor |
| 2 | `ReasoningProvider` + one adapter (prefer local/test) | Invoke without side effects |
| 3 | Structured `AgentDecision` schema + validator | Fail-closed parse |
| 4 | `LLMReplanner` implementing `Replanner` | Reuses A04 seam |
| 5 | `AgentContextAssembler` | Least privilege |
| 6 | Delegation contracts + depth | Multi-agent |
| 7 | Software engineering loop skills/graphs | Product autonomy |
| 8 | CRM live benchmark + offline evals | Proof |

## Current Status

```text
AgentExecutor:              DESIGNED / NOT_IMPLEMENTED
ReasoningProvider:          DESIGNED / NOT_IMPLEMENTED
LLM Replanner:              DESIGNED / NOT_IMPLEMENTED
Agent Delegation:           DESIGNED / NOT_IMPLEMENTED
Software Engineering Loop:  DESIGNED / NOT_IMPLEMENTED
Context Assembly:           DESIGNED / NOT_IMPLEMENTED
```

## Future Runtime Gaps (do not fix now)

1. Explicit `AgentDecision` persistence schema in EvidenceBus.  
2. Context-size / retrieval-count budgets as first-class B01 fields.  
3. Approval object revalidation hooks beyond confirmation plan_hash (A03).  
4. Agent attempt identity in checkpoint for mid-invocation crash.  
5. Capability metadata projection API (sanitized registry view for agents).

## Open Questions

- Which default ReasoningProvider in production?  
- Context window / compression strategy?  
- Model routing policy details?  
- Process isolation for AgentExecutor?  
- Whether Agent-as-Provider is ever allowed as a narrow adapter?

## Autonomy Claim

```text
DESIGNED — this document set
IMPLEMENTED — AgentExecutor / LLMReplanner / backends: NO
PROVEN — Runtime boundary via A01–B04: YES (agent layer unproven)
```

Do **not** claim “fully autonomous.”
