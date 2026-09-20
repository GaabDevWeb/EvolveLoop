# GAP-006 — Crash durability / partial-write recovery

```text
EXTERNAL_MECHANISM   LangGraph pending writes + durability modes; checkpoint namespaces
PROBLEM_SOLVED       Parallel step partial failure; crash consistency trade-offs
OUR_CURRENT_MECHANISM Persistence PARTIAL; no documented reducer/pending-write model
EQUIVALENCE          ABSENT–PARTIAL
GAP                  Define job write atomicity and recovery for multi-capability supersteps
TRADE_OFF            sync durability latency vs async loss window
EVIDENCE             targets/external/langgraph LG-PENDING-WRITES / LG-DURABILITY
APPLICABILITY        Orchestrator multi-node plans
DECISION             PROTOTYPE (ideas) / REJECT embed LangGraph
```

**Provenance:** EXTERNAL langgraph.
**Confidence:** MEDIUM
