# ADR: Agent ↔ Runtime Boundary

- **Status:** Accepted (design)  
- **Date:** 2026-09-20  
- **Branch:** `evolve-v2`  
- **Related:** A01 Intent→IR, A03 Gates, A04 Replanner, B01 Budgets, B04 Checkpoint  

## Context

V2 Runtime Core can execute, gate, budget, replan (deterministic), and recover from crash. The missing piece for closed-loop engineering autonomy is LLM/Agent **reasoning**, without undoing the authority model.

## Decision

1. **Agent is not the Runtime.** AgentExecutor only invokes reasoning and returns structured decisions.  
2. **LLM is not the Authority.** PolicyEngine, CapabilityAuthority, and runtime gates alone authorize.  
3. **ReasoningProvider ≠ CapabilityProvider.** Model call ≠ side effect.  
4. **Replanner ≠ ExecutionEngine.** LLMReplanner plugs into existing `Replanner`; engine still validates/applies.  
5. **AgentDecision ≠ ExecutionResult.** Proposals never fill provider results.  
6. **Chosen topology:** AgentExecutor **outside** the engine loop (Option B), not LLM-inside-engine or unified agentic runtime.  
7. **No mandatory vendor SDK** in core; local-first adapters required to be possible.  
8. **Unavailable backend is explicit** (`AGENT_EXECUTOR_UNAVAILABLE`), never fake PASS.

## Consequences

- Future Cursor/OpenAI/Anthropic/Ollama adapters cannot change ExecutionEngine authority.  
- A01–B04 remain stable; agent work is additive.  
- Security assumes untrusted retrieved text; fail-closed on unknown actions.  
- CRM-scale autonomy is a benchmark target, not a present claim.

## Implementation note (2026-09-20)

Contract layer landed on `evolve-v2` (`orchestrator/src/agent/`):

- `DefaultAgentExecutor` + `TestReasoningProvider` prove the boundary without LLMs.  
- `AgentBackedReplanner` plugs into existing `Replanner`; `LLMReplanner` is a stub.  
- **Default ReasoningProvider remains UNDECIDED.**  
- Model router and vendor SDKs are explicitly out of scope for this milestone.  
- Status doc: `V2-AGENTEXECUTOR-STATUS.md`.

## Rejected

LLM-direct-tools, LLM-direct-filesystem, LLM-direct-policy, Agent-as-primary-Provider, second orchestrator/IR/policy engine.
