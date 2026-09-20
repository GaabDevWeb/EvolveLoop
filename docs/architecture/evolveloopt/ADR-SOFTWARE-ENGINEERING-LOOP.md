# ADR: Software Engineering Loop Boundary

- **Status:** Accepted (design only)  
- **Date:** 2026-09-20  
- **Branch:** `evolve-v2`  
- **Related:** ADR-AGENT-RUNTIME-BOUNDARY, A01–A04, B01, B04, V2-SOFTWARE-ENGINEERING-LOOP.md  

## Context

Runtime Core + AgentExecutor can reason (incl. live Ollama opt-in), plan, gate, budget, replan, and recover. The product north star `BRIEF → WORKING SOFTWARE` needs an engineering coordination layer without collapsing agents into the Runtime or inventing a second orchestrator.

## Decision

1. **Software engineering is a layer above Runtime** — coordinates requirements→delivery intent; does not replace ExecutionEngine.  
2. **Agents remain proposal/decision makers** via AgentExecutor / AgentDecision.  
3. **Runtime remains authoritative** — Policy, CapabilityAuthority, A03, B01, B04.  
4. **Implementation is a capability (effect), not an agent privilege** — edits/tests/builds run only as authorized providers.  
5. **Validation is separated from implementation** — no sole self-certification.  
6. **Repair ≠ Replan** — repair stays on plan; replan uses A04 (and higher escalation).  
7. **Task Graph ≠ CapabilityGraph** — SE-03 introduced `EngineeringTaskGraph`; SE-04 Supervisor delegates tasks without fusing graphs (supersedes earlier “Task Graph = CapabilityGraph” sketch).  
8. **Software factory ≠ self-evolution** — changing EvolveLoop is a separate workflow.  
9. **Default ReasoningProvider remains UNDECIDED**; Ollama is tested, not default.  
10. **SE-01…SE-04** — Requirements, Architecture, TaskGraph, Supervisor/Delegation are implemented on `evolve-v2`; agents still do not gain Provider authority.

## Consequences

- Future SE-0x work adds contracts/workflows on existing seams.  
- CRM benchmark deferred to SE-09.  
- File ownership / sandbox remain designed GAPs until implemented.  
- Live planning/capability evals stay INCONCLUSIVE — do not drive architecture defaults.

## Rejected

Supervisor-as-orchestrator; agent-direct filesystem/shell; LLM-owned infinite loops; parallel RepairBudget / second IR / second RAG; auto default model; auto production deploy; starting with “agent can edit anything.”
