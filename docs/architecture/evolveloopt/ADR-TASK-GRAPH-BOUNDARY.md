# ADR — Task Graph Boundary (SE-03)

**Status:** Accepted  
**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Related:** `V2-SE03-TASK-GRAPH.md`, `ADR-ARCHITECTURE-CONTRACT.md`, `ADR-INTENT-EXECUTABLE-IR-BOUNDARY.md`

---

## Context

SE-01/SE-02 produce WHAT and HOW. The factory needs a schedulable work graph before Supervisor/execution. CapabilityIR already models executable capability DAGs with runtime state. Stuffing engineering metadata (REQ/ARCH traceability, agent roles, file ownership, DoD) into IR nodes would distort both concepts.

## Decision

1. **EngineeringTaskGraph exists** as an SE-layer work definition artifact, separate from CapabilityGraph/IR.
2. **CapabilityGraph is not reused as the task graph** — it remains the Runtime execution IR.
3. **Task Graph ≠ Execution State** — no mutable retry_count/provider/runtime_error on baselines.
4. **Tasks are not capabilities** — tasks declare `required_capabilities` as proposals only.
5. **Task graph does not authorize execution** — A03/B01/B04 remain sovereign.
6. **Future path:** TaskGraph → PlanEmitter → CapabilityIR → gates → ExecutionEngine, via `toIrMappingHints`.

## Consequences

- SE-04 Supervisor consumes TaskGraph baselines + Runtime state.
- Live LLM decomposition remains opt-in eval.
- Replan lineage prepared (`parent_graph_id`, task replacement ids) without executing A04 changes here.

## Alternatives rejected

- Encoding the whole CRM plan solely as CapabilityIR nodes.
- Letting TASK_GRAPH_PROPOSAL auto-run ExecutionEngine.
- Creating a second Policy/Registry/Evidence stack.
