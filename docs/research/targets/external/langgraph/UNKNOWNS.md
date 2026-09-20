# UNKNOWNS — LangGraph TARGET_RESEARCH

**Date:** 2026-09-18  
**Rule:** Prefer `UNKNOWN` over invention. No install/run of LangGraph in this investigation.

## Access limitations

| Area | Status |
|------|--------|
| Public OSS docs (Python) | READ |
| Public GitHub tree / pyproject | READ (API + raw) |
| Local `pip install` / execute graphs | NOT DONE (forbidden by brief) |
| JS LangGraph parity | NOT systematically audited → treat as `UNKNOWN` for JS-only diffs |
| LangSmith Agent Server persistence internals | `UNKNOWN` (closed / product) |
| LangSmith Deployment scheduler / HA | `UNKNOWN` |
| Exact Pregel scheduler thread-pool / async concurrency limits | `UNKNOWN` without deep code+test read |
| Encryption / multi-tenant isolation of checkpoints in managed hosting | `UNKNOWN` |

## Mechanism unknowns

1. **Default durability mode** when omitted — docs list `exit|async|sync` but default not confirmed in this pass → `UNKNOWN` (check invoke signature / source later).
2. **Pending writes atomicity** under `durability="async"` on hard kill — docs admit small risk; exact window → `UNKNOWN`.
3. **SerializerProtocol** security (pickle vs json) for untrusted checkpoints — interface mentioned; threat model → `UNKNOWN`.
4. **DeltaChannel** production readiness — documented beta ≥1.2; long-term API stability → `UNKNOWN`.
5. **Cross-language checkpoint compatibility** (Python saver ↔ JS graph) → `UNKNOWN`.
6. **Command + tools** interaction edge cases with ReAct prebuilts — docs exist; not traced end-to-end here → `UNKNOWN` residual.
7. **Performance ceilings** (nodes/sec, checkpoint size) — no MEASURED data collected → no invented benchmarks.

## MegaBrain comparison unknowns

| Question | Status |
|----------|--------|
| Exact merge/reducer semantics when parallel capabilities write shared IR fields | `UNKNOWN` — GAP: audit `orchestrator/src` |
| Whether `jobs/checkpoints` stores full state lineage vs single latest | `UNKNOWN` — GAP: audit checkpoint files/schema |
| Whether resume re-executes the failed capability from start (idempotency contract) | `UNKNOWN` |
| HITL: can SkillJob pause mid-capability with typed resume payload like `interrupt()`? | `UNKNOWN` / likely PARTIAL only at job boundary |
| Time-travel / fork support | `UNKNOWN` as product feature; treat as ABSENT until proven |

## Conflicts (unresolved)

```text
CONFLICT:
  claim: Preferred streaming API for new apps
  source_a: streaming.md — recommend event streaming / stream_events; stream modes with version=v2
  source_b: older examples / concept pages still show raw stream_mode iterators (v1 shapes)
  difference: chunk shapes and interrupt surfacing differ
  resolution: prefer latest oss/python/langgraph/streaming + interrupts pages; UNRESOLVED for legacy callers
```

```text
CONFLICT:
  claim: Persistence page vs durable-execution naming
  source_a: some indexes / searches refer to durable-execution URL
  source_b: fetch of /durable-execution redirected or overlapped with persistence; durability modes live under checkpointers
  difference: naming/URL drift
  resolution: prefer checkpointers.md durability section as primary for modes
```

## What would close gaps

- Read-only deep dive: `langgraph/pregel/*.py` + checkpoint package tests (still no install required if raw GitHub).
- Audit MegaBrain: `orchestrator` checkpoint schema + resume path (OBSERVED code).
- Optional later: controlled sandbox install **only if** user lifts the no-run constraint for MEASURED claims.
